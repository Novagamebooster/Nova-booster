# provision-vpn

Requires an authenticated NOVA user with an active subscription.

## Request

```json
{
  "server_id": "<vpn_servers.id>",
  "public_key": "<client WireGuard public key>"
}
```

The Android client generates its private/public keypair locally. The private key is never sent to Supabase.

## Edge Function secrets

- `WG_CONTROLLER_URL`
- `WG_CONTROLLER_TOKEN`

The controller receives `{user_id, server_id, public_key}` and returns non-secret connection parameters.

## Controller API

`POST /peers` with `Authorization: Bearer <token>`.

Expected response:

```json
{
  "ok": true,
  "config": {
    "address": "10.66.0.2/32",
    "dns": ["1.1.1.1", "1.0.0.1"],
    "server_public_key": "...",
    "endpoint": "203.0.113.10:51820",
    "allowed_ips": ["0.0.0.0/0"],
    "persistent_keepalive": 25,
    "mtu": 1280
  }
}
```

The Edge Function also sends the subscription expiry to the controller. The controller automatically removes expired peers from WireGuard.
