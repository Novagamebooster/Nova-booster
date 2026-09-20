import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const body = await req.json().catch(() => ({}));
    const serverId = body.server_id;
    const publicKey = body.public_key;
    if (!serverId) throw new Error("server_id is required");
    if (typeof publicKey !== "string" || !/^[A-Za-z0-9+/]{42}==$/.test(publicKey)) {
      throw new Error("A valid WireGuard public_key is required");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("plan,plan_expires,is_admin")
      .eq("id", user.id)
      .single();
    if (profileError) throw profileError;

    const active = profile?.is_admin === true || (profile?.plan_expires && new Date(profile.plan_expires).getTime() > Date.now());
    if (!active) throw new Error("Active subscription required");

    const { data: server, error: serverError } = await supabase
      .from("vpn_servers")
      .select("id,name,country,host,port,active")
      .eq("id", serverId)
      .eq("active", true)
      .single();
    if (serverError || !server) throw new Error("VPN server unavailable");

    const controllerUrl = Deno.env.get("WG_CONTROLLER_URL");
    const controllerToken = Deno.env.get("WG_CONTROLLER_TOKEN");
    if (!controllerUrl || !controllerToken) {
      return new Response(JSON.stringify({
        ok: false,
        status: "controller_not_configured",
        message: "WireGuard controller is not configured yet.",
      }), { status: 503, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const controllerResponse = await fetch(`${controllerUrl.replace(/\/$/, "")}/peers`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${controllerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id: user.id, server_id: server.id, public_key: publicKey, expires_at: profile.is_admin === true ? null : profile.plan_expires }),
    });

    if (!controllerResponse.ok) {
      const detail = await controllerResponse.text();
      console.error("WireGuard controller error", controllerResponse.status, detail);
      throw new Error("WireGuard provisioning failed");
    }

    const controllerData = await controllerResponse.json();
    const config = controllerData?.config;
    if (!config?.address || !config?.server_public_key || !config?.endpoint) {
      throw new Error("WireGuard controller returned an incomplete config");
    }

    return new Response(JSON.stringify({ ok: true, server, config }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
