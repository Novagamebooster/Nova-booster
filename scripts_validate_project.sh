#!/usr/bin/env bash
set -euo pipefail
node --check js/app.js
node --check js/auth.js
node --check js/pay.js
node --check infra/wireguard-controller/server.js
python3 - <<'PY'
from pathlib import Path
wf=Path('.github/workflows/android-build.yml').read_text()
assert 'com.wireguard.android:tunnel:1.0.20260315' in wf
assert 'FOREGROUND_SERVICE_SPECIAL_USE' not in wf
assert 'android:name="com.wireguard.android.backend.GoBackend$VpnService"' not in wf
print('workflow checks: OK')
print('static JS/controller checks: OK')
PY
