#!/usr/bin/env bash
set -euo pipefail
fail=0
check(){ if eval "$2" >/dev/null 2>&1; then echo "OK  $1"; else echo "FAIL $1"; fail=1; fi; }
check "wg command" "command -v wg"
check "wg-quick command" "command -v wg-quick"
check "controller env" "test -f /etc/nova-controller/controller.env"
check "wireguard config" "test -f /etc/wireguard/wg0.conf"
check "controller service" "systemctl is-enabled nova-wireguard-controller"
check "wireguard service" "systemctl is-enabled wg-quick@wg0"
check "IPv4 forwarding" "test \"$(sysctl -n net.ipv4.ip_forward)\" = 1"
check "controller loopback" "ss -lnt | grep -q '127.0.0.1:8080'"
check "WireGuard interface" "wg show wg0"
if curl -fsS --max-time 3 http://127.0.0.1:8080/healthz | grep -q '"ok":true'; then
  echo "OK  controller healthz"
else
  echo "FAIL controller healthz"
  fail=1
fi
exit "$fail"
