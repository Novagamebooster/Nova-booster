# HTTPS for the NOVA controller

The controller intentionally listens only on `127.0.0.1:8080`. Do not expose that port directly to the Internet.

Recommended deployment after the VPS is purchased:

1. Point a hostname such as `vpn-api.example.com` to the VPS public IP.
2. Install Caddy using its official Linux instructions.
3. Copy `Caddyfile.example` to `/etc/caddy/Caddyfile` and replace the hostname.
4. Start/reload Caddy.
5. Use `https://vpn-api.example.com` as the Supabase `WG_CONTROLLER_URL` secret.

The WireGuard endpoint itself can remain the VPS public IP (UDP/51820) or a separate VPN hostname.
