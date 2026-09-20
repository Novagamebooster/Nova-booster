# NOVA Android Build

## Current build stack

- Capacitor 8.5.2
- Android target/compile SDK 36
- JDK 17 in GitHub Actions
- Node.js 22 in GitHub Actions
- WireGuard Android tunnel `1.0.20260315`

The project intentionally generates the native Android project inside GitHub Actions so the repository does not need to commit the generated `android/` directory.

## Native plugin

`BoostCorePlugin` is generated during the workflow and registered from `MainActivity`.

The plugin:

- generates a WireGuard keypair on-device;
- encrypts the private key using an AES key held by Android Keystore;
- sends only the public key to the Supabase provisioning function;
- asks Android for VPN permission;
- starts/stops the WireGuard tunnel through the official WireGuard Android tunnel library.

## Build validation

The workflow is the source of truth for the Android build. A live VPS is not required to compile the app, but an actual VPN connection cannot be tested until a WireGuard server is deployed.
