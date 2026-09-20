# NOVA WireGuard Controller

Real Linux-side controller for NOVA. It is intentionally dormant until a VPS is purchased.

## What it does

- Listens only on `127.0.0.1:8080`.
- Accepts only a client's WireGuard **public key**; the private key never leaves Android.
- Allocates a `/32` IPv4 address from `10.66.0.0/24`.
- Adds/removes peers with `wg`.
- Persists peer allocation in `/var/lib/nova-wg/peers.json`.
- Removes expired peers automatically.
- Returns only non-secret connection parameters.
- `/healthz` checks that the WireGuard interface is actually available.

## Install later

On a fresh Ubuntu/Debian VPS:

```bash
sudo bash install.sh
sudo nano /etc/nova-controller/controller.env
```

Set:

- `NOVA_SERVER_ID` — UUID of the matching `vpn_servers` row.
- `WG_ENDPOINT_HOST` — VPS public IPv4 address or VPN hostname.

Then:

```bash
sudo systemctl restart wg-quick@wg0
sudo systemctl restart nova-wireguard-controller
sudo bash validate.sh
```

The VPS must permit **UDP 51820** for WireGuard and **TCP 443** for the HTTPS controller. Keep TCP 8080 private.

## HTTPS

Put Caddy/Nginx in front of the controller. Use `Caddyfile.example` and expose only HTTPS publicly.

## Supabase secrets

Set these only in the Edge Function environment:

- `WG_CONTROLLER_URL=https://<controller-host>`
- `WG_CONTROLLER_TOKEN=<NOVA_CONTROLLER_TOKEN>`

Never put the controller token in frontend JavaScript, HTML, the APK, or GitHub source.
