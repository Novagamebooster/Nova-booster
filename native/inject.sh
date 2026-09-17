#!/bin/bash
set -e
PROJ_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$PROJ_ROOT/android"
NATIVE_DIR="$PROJ_ROOT/native"

echo "🔧 [NOVA] Injecting native WireGuard code..."

# 1) کپی BoostCorePlugin.java (جایگزین نسخه قبلی)
PLUGIN_DIR="$ANDROID_DIR/app/src/main/java/com/novagamebooster/app"
mkdir -p "$PLUGIN_DIR"
cp "$NATIVE_DIR/BoostCorePlugin.java" "$PLUGIN_DIR/BoostCorePlugin.java"
cp "$NATIVE_DIR/NovaVpnService.kt" "$PLUGIN_DIR/NovaVpnService.kt"
echo "  ✓ Java/Kotlin files copied"

# 2) پچ AndroidManifest.xml (حذف service قدیمی، اضافه کردن service جدید)
MANIFEST="$ANDROID_DIR/app/src/main/AndroidManifest.xml"
if [ -f "$MANIFEST" ]; then
    # حذف تعریف قدیمی service اگه هست
    python3 - "$MANIFEST" << 'PYEOF'
import sys, re
p = sys.argv[1]
with open(p) as f: c = f.read()
c = re.sub(r'\s*<service[^>]*NovaVpnService[^>]*>[\s\S]*?</service>', '', c)
if '</application>' in c:
    c = c.replace('</application>', '        <service android:name=".NovaVpnService" android:permission="android.permission.BIND_VPN_SERVICE" android:exported="false"><intent-filter><action android:name="android.net.VpnService"/></intent-filter></service>\n    </application>')
with open(p, 'w') as f: f.write(c)
PYEOF
    echo "  ✓ AndroidManifest patched"
fi

# 3) پچ build.gradle برای افزودن dependencies
BUILD_GRADLE="$ANDROID_DIR/app/build.gradle"
if [ -f "$BUILD_GRADLE" ]; then
    if ! grep -q "wireguard.android:tunnel" "$BUILD_GRADLE"; then
        python3 - "$BUILD_GRADLE" << 'PYEOF'
import sys, re
p = sys.argv[1]
with open(p) as f: c = f.read()
deps = """    // NOVA WireGuard Tunnel
    implementation 'com.wireguard.android:tunnel:1.0.20230706'
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3'
    implementation 'androidx.core:core-ktx:1.12.0'
"""
if 'dependencies {' in c and 'wireguard.android:tunnel' not in c:
    c = c.replace('dependencies {', 'dependencies {\n' + deps, 1)
    # افزودن plugin kotlin اگه نیست
    if "apply plugin: 'kotlin-android'" not in c and 'org.jetbrains.kotlin.android' not in c:
        if 'apply plugin:' in c:
            c = c.replace("apply plugin: 'com.android.application'", "apply plugin: 'com.android.application'\napply plugin: 'kotlin-android'", 1)
with open(p, 'w') as f: f.write(c)
PYEOF
        echo "  ✓ build.gradle patched (WireGuard deps added)"
    fi
fi

# 4) فعال‌سازی Kotlin
ROOT_GRADLE="$ANDROID_DIR/build.gradle"
if [ -f "$ROOT_GRADLE" ] && ! grep -q "kotlin" "$ROOT_GRADLE"; then
    if grep -q "ext.kotlin_version" "$ROOT_GRADLE" || grep -q "classpath.*kotlin" "$ROOT_GRADLE"; then
        :
    else
        # تلاش برای افزودن classpath kotlin در buildscript
        python3 - "$ROOT_GRADLE" << 'PYEOF'
import sys
p = sys.argv[1]
with open(p) as f: c = f.read()
if "ext.kotlin_version" not in c and "dependencies {" in c:
    c = c.replace("dependencies {", "dependencies {\n        classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.0'\n        ext.kotlin_version = '1.9.0'", 1)
with open(p, 'w') as f: f.write(c)
PYEOF
    fi
fi

echo "✅ [NOVA] Native injection complete"
