import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const body = await req.json();
    const message = typeof body?.message === "string" ? body.message.slice(0, 4000) : "NOVA payment notification";
    const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const chat = Deno.env.get("TELEGRAM_CHAT_ID");
    if (!token || !chat) return new Response(JSON.stringify({ ok: false, error: "Telegram not configured" }), { status: 503, headers: { ...cors, "Content-Type": "application/json" } });

    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: message, parse_mode: "HTML" }),
    });
    const data = await r.json();
    return new Response(JSON.stringify({ ok: r.ok, telegram: data?.ok === true }), { status: r.ok ? 200 : 502, headers: { ...cors, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Bad request" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
