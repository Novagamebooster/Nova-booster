#!/bin/bash
set -e
PROJ_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$PROJ_ROOT/android"
NATIVE_DIR="$PROJ_ROOT/native"

echo "🔧 [NOVA] Injecting native WireGuard code..."

# 0) ارتقای compileSdk/targetSdk به 34
VARS="$ANDROID_DIR/variables.gradle"
if [ -f "$VARS" ]; then
    sed -i -E 's/compileSdkVersion[[:space:]]*=[[:space:]]*[0-9]+/compileSdkVersion = 34/' "$VARS"
    sed -i -E 's/targetSdkVersion[[:space:]]*=[[:space:]]*[0-9]+/targetSdkVersion = 34/' "$VARS"
    echo "  ✓ variables.gradle → SDK 34"
fi

# 1) کپی فایل‌های نیتیو
PLUGIN_DIR="$ANDROID_DIR/app/src/main/java/com/novagamebooster/app"
mkdir -p "$PLUGIN_DIR"
cp "$NATIVE_DIR/BoostCorePlugin.java" "$PLUGIN_DIR/BoostCorePlugin.java"
cp "$NATIVE_DIR/NovaVpnService.kt" "$PLUGIN_DIR/NovaVpnService.kt"
echo "  ✓ Java/Kotlin copied"

# 2) پچ AndroidManifest: سرویس VPN کتابخانه + سرویس معمولی ما
MANIFEST="$ANDROID_DIR/app/src/main/AndroidManifest.xml"
if [ -f "$MANIFEST" ]; then
python3 - "$MANIFEST" << 'PYEOF'
import sys, re
p = sys.argv[1]
with open(p) as f: c = f.read()
c = re.sub(r'\s*<service[^>]*NovaVpnService[^>]*>[\s\S]*?</service>', '', c)
c = re.sub(r'\s*<service[^>]*GoBackend[^>]*>[\s\S]*?</service>', '', c)
if '</application>' in c and 'GoBackend' not in c:
    snippet = '''        <service android:name=".NovaVpnService" android:exported="false" />
        <service android:name="com.wireguard.android.backend.GoBackend$VpnService" android:exported="true" android:permission="android.permission.BIND_VPN_SERVICE">
            <intent-filter>
                <action android:name="android.net.VpnService" />
            </intent-filter>
        </service>
    </application>'''
    c = c.replace('</application>', snippet)
with open(p, 'w') as f: f.write(c)
PYEOF
echo "  ✓ Manifest: GoBackend\$VpnService declared"
fi

# 3) پچ build.gradle (deps WireGuard + kotlin plugin)
BUILD_GRADLE="$ANDROID_DIR/app/build.gradle"
if [ -f "$BUILD_GRADLE" ]; then
python3 - "$BUILD_GRADLE" << 'PYEOF'
import sys
p = sys.argv[1]
with open(p) as f: c = f.read()
changed = False
if 'wireguard.android:tunnel' not in c and 'dependencies {' in c:
    deps = """    // NOVA WireGuard Tunnel
    implementation 'com.wireguard.android:tunnel:1.0.20230706'
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'
    implementation 'androidx.core:core-ktx:1.12.0'
"""
    c = c.replace('dependencies {', 'dependencies {\n' + deps, 1)
    changed = True
if 'kotlin-android' not in c and 'apply plugin' in c:
    c = c.replace("apply plugin: 'com.android.application'", "apply plugin: 'com.android.application'\napply plugin: 'kotlin-android'", 1)
    changed = True
if changed:
    with open(p, 'w') as f: f.write(c)
PYEOF
echo "  ✓ build.gradle patched"
fi

# 4) kotlin classpath در root gradle
ROOT_GRADLE="$ANDROID_DIR/build.gradle"
if [ -f "$ROOT_GRADLE" ]; then
python3 - "$ROOT_GRADLE" << 'PYEOF'
import sys
p = sys.argv[1]
with open(p) as f: c = f.read()
if 'kotlin-gradle-plugin' not in c and 'dependencies {' in c:
    c = c.replace('dependencies {', "dependencies {\n        classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.0'", 1)
    with open(p, 'w') as f: f.write(c)
PYEOF
echo "  ✓ root gradle kotlin classpath"
fi

echo "✅ [NOVA] Native injection complete"
