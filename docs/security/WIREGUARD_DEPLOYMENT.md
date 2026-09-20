# NOVA real WireGuard deployment

## Current state

The repository now contains the Android WireGuard client path, Supabase provisioning function, and Linux controller. **No live VPN exists until a real VPS is deployed and the final device-to-server test passes.**

## Architecture

`Android → Supabase Auth → provision-vpn Edge Function → HTTPS controller → Linux WireGuard → Internet`

Android creates the WireGuard keypair locally. Only the public key is sent to the backend.

## VPS launch checklist

- [ ] Buy a Linux VPS with public IPv4 in the desired region.
- [ ] Point a DNS hostname to the VPS for the controller HTTPS endpoint.
- [ ] Run `infra/wireguard-controller/install.sh`.
- [ ] Set `NOVA_SERVER_ID` and `WG_ENDPOINT_HOST`.
- [ ] Start `wg-quick@wg0` and `nova-wireguard-controller`.
- [ ] Run `validate.sh`.
- [ ] Install/configure Caddy with `Caddyfile.example`.
- [ ] Set Supabase secrets `WG_CONTROLLER_URL` and `WG_CONTROLLER_TOKEN`.
- [ ] Create/update the matching `vpn_servers` row with `host`, UDP port `51820`, `active=true`, and `health_url=https://<controller-host>/healthz`.
- [ ] Deploy `provision-vpn`.
- [ ] Build a fresh APK.
- [ ] Test VPN permission, tunnel connection, public IPv4 change, DNS resolution, disconnect, and subscription expiry.

## IPv6 note

The current MVP intentionally routes IPv4 (`0.0.0.0/0`) through WireGuard. It does **not** claim IPv6 full-tunnel protection. IPv6 support should be added before marketing the service as an IPv6 leak-proof VPN.
