# NOVA — security setup

## 1. Telegram
Create a **new** bot token in BotFather. Do not put it in `js/` or `docs/`.

Set these Supabase Edge Function secrets:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

Deploy:

```bash
supabase functions deploy notify-payment
supabase secrets set TELEGRAM_BOT_TOKEN="NEW_TOKEN" TELEGRAM_CHAT_ID="CHAT_ID"
```

## 2. Database
Review and apply `supabase/migrations/001_security_baseline.sql` in the Supabase SQL editor. If the live schema differs, adjust the policies before applying.

## 3. Important
The publishable/anon Supabase key may be present in browser code. It is not a service-role secret. Never expose `service_role`, private keys, Telegram bot tokens, or server credentials in browser JavaScript.

## NOVA real WireGuard controller

After a VPS is purchased and `infra/wireguard-controller/install.sh` is completed, add these Edge Function secrets:

- `WG_CONTROLLER_URL` = HTTPS URL of the controller reverse proxy.
- `WG_CONTROLLER_TOKEN` = `NOVA_CONTROLLER_TOKEN` from the VPS `/etc/nova-controller/controller.env`.

Do not put either value in frontend code or the Android app.

The Android app generates the WireGuard private key locally and sends only the public key to `provision-vpn`.
