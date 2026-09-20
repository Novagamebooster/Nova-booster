#!/usr/bin/env bash
set -euo pipefail

if [[ $EUID -ne 0 ]]; then echo "Run as root: sudo bash install.sh"; exit 1; fi

apt-get update
apt-get install -y wireguard iptables nodejs curl openssl ca-certificates

# Basic host hardening for the VPN node. The controller itself remains loopback-only.
install -d -m 700 /etc/nova-controller /var/lib/nova-wg /opt/nova-wireguard-controller
cat > /etc/sysctl.d/99-nova-wireguard.conf <<SYSCTL
net.ipv4.ip_forward=1
net.ipv6.conf.all.forwarding=1
SYSCTL
sysctl --system >/dev/null

chmod 700 /etc/nova-controller /var/lib/nova-wg
cp server.js /opt/nova-wireguard-controller/server.js
chmod 700 /opt/nova-wireguard-controller/server.js

if [[ ! -f /etc/wireguard/server_private.key ]]; then
  umask 077
  wg genkey | tee /etc/wireguard/server_private.key | wg pubkey > /etc/wireguard/server_public.key
fi
SERVER_PRIVATE_KEY=$(cat /etc/wireguard/server_private.key)
SERVER_PUBLIC_KEY=$(cat /etc/wireguard/server_public.key)

if [[ ! -f /etc/nova-controller/controller.env ]]; then
  TOKEN=$(openssl rand -hex 32)
  cat > /etc/nova-controller/controller.env <<ENV
PORT=8080
NOVA_CONTROLLER_TOKEN=$TOKEN
NOVA_SERVER_ID=CHANGE_ME_SUPABASE_VPN_SERVER_UUID
WG_INTERFACE=wg0
WG_NETWORK=10.66.0.0/24
WG_SERVER_ADDRESS=10.66.0.1/24
WG_SERVER_PUBLIC_KEY=$SERVER_PUBLIC_KEY
WG_ENDPOINT_HOST=CHANGE_ME_PUBLIC_IP_OR_DOMAIN
WG_ENDPOINT_PORT=51820
WG_DNS=1.1.1.1,1.0.0.1
WG_PERSISTENT_KEEPALIVE=25
WG_MTU=1280
NOVA_STATE_FILE=/var/lib/nova-wg/peers.json
ENV
  chmod 600 /etc/nova-controller/controller.env
  echo "Created /etc/nova-controller/controller.env with a random controller token."
  echo "Edit NOVA_SERVER_ID and WG_ENDPOINT_HOST before starting services."
fi

cat > /etc/wireguard/wg0.conf <<WGCONF
[Interface]
Address = 10.66.0.1/24
ListenPort = 51820
PrivateKey = $SERVER_PRIVATE_KEY
PostUp = sysctl -w net.ipv4.ip_forward=1; sysctl -w net.ipv6.conf.all.forwarding=1; iptables -A FORWARD -i wg0 -j ACCEPT; iptables -A FORWARD -o wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -s 10.66.0.0/24 -o $(ip route show default | awk '{print $5; exit}') -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT || true; iptables -D FORWARD -o wg0 -j ACCEPT || true; iptables -t nat -D POSTROUTING -s 10.66.0.0/24 -o $(ip route show default | awk '{print $5; exit}') -j MASQUERADE || true
WGCONF
chmod 600 /etc/wireguard/wg0.conf

cp nova-wireguard-controller.service /etc/systemd/system/nova-wireguard-controller.service
systemctl daemon-reload
systemctl enable wg-quick@wg0
systemctl enable nova-wireguard-controller

cat <<INFO

NOVA server base installation is ready.

Server public WireGuard key:
$SERVER_PUBLIC_KEY

Next, edit:
  /etc/nova-controller/controller.env
Set:
  NOVA_SERVER_ID=<the vpn_servers.id UUID from Supabase>
  WG_ENDPOINT_HOST=<the VPS public IP or VPN hostname>

Then run:
  systemctl restart wg-quick@wg0
  systemctl restart nova-wireguard-controller
  systemctl status wg-quick@wg0 nova-wireguard-controller

Verify: wg show wg0

The controller listens only on 127.0.0.1:8080. Put HTTPS reverse proxy (Caddy/Nginx) in front of it for the Edge Function.
INFO
