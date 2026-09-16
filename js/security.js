// ===== NOVA SECURITY SHIELD =====
window.NOVA_SECURITY = (function(){
  const threats = [];
  let scanned = false;

  // تشخیص Emulator
  function detectEmulator(){
    const ua = navigator.userAgent.toLowerCase();
    const emu = ['genymotion', 'nox', 'bluestacks', 'andy', 'memu', 'koplayer', 'droid4x', 'android sdk', 'sdk_gphone', 'emulator', 'simulator'];
    for (const k of emu) if (ua.includes(k)) return k;
    if (window.outerWidth === 0 && window.outerHeight === 0) return 'headless';
    return null;
  }

  // تشخیص Root (فایل‌های مشکوک)
  async function detectRoot(){
    const paths = [
      '/system/app/Superuser.apk', '/system/xbin/su', '/system/bin/su',
      '/sbin/su', '/data/local/xbin/su', '/data/local/bin/su',
      '/system/sd/xbin/su', '/system/bin/failsafe/su', '/data/local/su',
      '/su/bin/su', 'su'
    ];
    try {
      if (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Filesystem) {
        for (const p of paths) {
          try {
            await Capacitor.Plugins.Filesystem.stat({ path: p, directory: 'EXTERNAL' });
            return p;
          } catch(e){}
        }
      }
    } catch(e){}
    return null;
  }

  // تشخیص Frida (پورت 27042 یا frida در maps)
  async function detectFrida(){
    try {
      const res = await fetch('http://127.0.0.1:27042', { method: 'GET' }).catch(() => null);
      if (res && res.ok) return 'frida-server';
    } catch(e){}
    try {
      const res = await fetch('http://127.0.0.1:4444', { method: 'GET' }).catch(() => null);
      if (res && res.ok) return 'frida-agent';
    } catch(e){}
    return null;
  }

  // تشخیص Hook/Xposed
  function detectHook(){
    const hooks = ['xposed', 'substrate', 'cydia', 'frida', 'inject'];
    try {
      const stack = new Error().stack.toLowerCase();
      for (const h of hooks) if (stack.includes(h)) return h;
    } catch(e){}
    if (window.java && window.java.lang && window.java.lang.System) return 'java-bridge';
    return null;
  }

  // چک تغییر تاریخ سیستم
  function detectTimeCheat(){
    const serverTime = Date.now();
    const localTime = new Date().getTime();
    if (Math.abs(serverTime - localTime) > 86400000) return 'time-drift'; // بیش از 24 ساعت اختلاف
    return null;
  }

  // چک Debugger
  function detectDebugger(){
    const start = Date.now();
    debugger;
    const end = Date.now();
    if (end - start > 100) return 'debugger';
    return null;
  }

  // اجرای همه چک‌ها
  async function scan(){
    if (scanned) return threats;
    scanned = true;
    
    const emu = detectEmulator();
    if (emu) threats.push('Emulator: ' + emu);

    const root = await detectRoot();
    if (root) threats.push('Root: ' + root);

    const frida = await detectFrida();
    if (frida) threats.push('Frida: ' + frida);

    const hook = detectHook();
    if (hook) threats.push('Hook: ' + hook);

    const time = detectTimeCheat();
    if (time) threats.push('TimeCheat: ' + time);

    // لاگ تهدیدها به سرور (اختیاری)
    if (threats.length && window.NOVA_AUTH && NOVA_AUTH.isLoggedIn()) {
      try {
        const u = NOVA_AUTH.getCurrentUser();
        await NOVA_AUTH.supabase.from('security_logs').insert({
          user_id: u.id,
          threats: JSON.stringify(threats),
          ua: navigator.userAgent.substring(0, 200)
        }).catch(() => {});
      } catch(e){}
    }

    return threats;
  }

  // نمایش پیام هشدار
  function showWarning(threats){
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.95);display:flex;align-items:center;justify-content:center;';
    d.innerHTML = '<div style="background:#1a1a1a;border:2px solid #ff4444;border-radius:20px;padding:30px;max-width:90%;text-align:center;">' +
      '<div style="font-size:48px;margin-bottom:20px;">🚫</div>' +
      '<div style="color:#ff4444;font-size:20px;font-weight:900;margin-bottom:15px;">تهدید امنیتی شناسایی شد</div>' +
      '<div style="color:#ccc;font-size:14px;line-height:1.8;margin-bottom:20px;">' +
      threats.map(t => '⚠️ ' + t).join('<br>') +
      '</div>' +
      '<div style="color:#888;font-size:12px;">برای امنیت حساب شما، اپ غیرفعال شد.</div>' +
      '</div>';
    document.body.appendChild(d);
  }

  // چک امنیتی قبل از عملیات حساس
  async function guard(){
    const t = await scan();
    if (t.length) {
      showWarning(t);
      throw new Error('Security threat detected');
    }
    return true;
  }

  return { scan, guard, threats };
})();
