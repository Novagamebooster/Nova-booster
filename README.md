# 🚀 NOVA Game Booster - Full Project Package

## 📋 Overview
یک Game Booster حرفه‌ای اندروید با پرداخت خودکار کریپتو (USDT TRC20 + TON) و سیستم لایسنس خودکار.

**Tech Stack:**
- Frontend: HTML5 + CSS3 + Vanilla JavaScript (PWA)
- Backend: GitHub Pages + GitHub Actions (CI/CD)
- Database: Supabase (PostgreSQL)
- Mobile: Capacitor (Android APK)
- Blockchain: TON API + TronWeb (USDT TRC20)
- Telegram: Bot API (admin notifications)

---

## 🏗️ Architecture

### Frontend (PWA)
---

## 🎯 Current Status

### ✅ Working
- PWA app with boost functionality
- Game launcher (Capacitor + fallback)
- USDT TRC20 payment system
- TON payment system
- License system (Supabase)
- Telegram notifications
- Android APK auto-build
- 5-language support

### 🔄 In Progress
- UI redesign (HUD circle with fiber optic animation)
- Auto-update system (signed APK)
- Samandehi + Enamad integration
- Zarinpal (Iranian Rial payments)

### 📋 TODO
- [ ] Stable keystore signing (no more reinstall)
- [ ] In-app update checker
- [ ] HUD v5 (user-requested animation)
- [ ] Production APK (signed release)
- [ ] Play Store publication

---

## 🛠️ Development

### Local Testing
```bash
# Install dependencies
npm install http-server -g

# Run local server
http-server -p 8080

# Open
http://localhost:8080
```

### Build APK Locally (Optional)
```bash
npm install @capacitor/cli @capacitor/core @capacitor/android
npx cap init "Nova Game Booster" "com.novagamebooster.app" --web-dir .
npx cap add android
npx cap sync
cd android && ./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🔑 Key Features

### 1. Boost System
- VPN-based DNS optimization
- Server selection (auto/manual)
- Real-time ping monitoring
- Jitter/Loss/Route metrics

### 2. Payment System
- **USDT TRC20:** Unique address per transaction
- **TON:** Unique comment per transaction
- **Auto-detection:** Watcher checks every 30 min
- **License generation:** Automatic after confirmation

### 3. Game Launcher
- Native Capacitor plugin
- Package name detection
- Keyword fallback search
- Google Play Store redirect

### 4. Admin Panel
- User management
- License overview
- Payment tracking
- Telegram notifications

---

## 📞 Support

- **Email:** support@novagamebooster.ir
- **Telegram:** @NovaGameBoosterBot
- **GitHub:** https://github.com/Novagamebooster/Nova-booster

---

## 📄 License

Proprietary - All rights reserved.

---

**Version:** 4.0.0
**Last Updated:** 2026-09-20
**Package Generated:** Automatic
