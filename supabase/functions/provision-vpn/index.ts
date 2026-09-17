import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const cors = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization") || "";
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await sb.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: cors });

    const { server_id } = await req.json();
    const { data: server } = await sb.from("vpn_servers").select("*").eq("id", server_id).eq("active", true).single();
    if (!server) return new Response(JSON.stringify({ error: "server not found" }), { status: 404, headers: cors });

    // peer قبلی؟
    const { data: existing } = await sb.from("vpn_peers").select("*").eq("user_id", user.id).eq("server_id", server_id).maybeSingle();
    if (existing && existing.config) return new Response(JSON.stringify(existing), { headers: cors });

    // ساخت peer روی VPS
    const token = Deno.env.get("VPS_TOKEN") || "";
    const res = await fetch(`https://${server.host}:8443/new_peer`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Token": token },
      body: JSON.stringify({ user_id: user.id })
    });
    if (!res.ok) return new Response(JSON.stringify({ error: "vps unreachable" }), { status: 502, headers: cors });
    const peer = await res.json();

    const row = {
      user_id: user.id, server_id, client_public_key: peer.public_key,
      client_ip: peer.ip, config: peer.config,
      expires_at: null
    };
    const { data: saved, error } = await sb.from("vpn_peers").upsert(row, onConflict: "user_id,server_id").select().single();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: cors });
    return new Response(JSON.stringify(saved), { headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: cors });
  }
});
