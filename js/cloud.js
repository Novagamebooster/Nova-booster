// ===== NOVA CLOUD: اتصال امن به Supabase =====
window.NOVA_CLOUD = (function(){
  var URL = 'https://bpveghqcmxblczvazuff.supabase.co';
  var KEY = 'sb_publishable_OM63vvx8fQhSwGFPfQb9Uw_szdybLKS';
  var TK = 'nova_cloud_token', RK = 'nova_cloud_refresh';

  function headers(auth){
    var h = { 'apikey': KEY, 'Content-Type': 'application/json' };
    var t = localStorage.getItem(TK);
    if (auth && t) h['Authorization'] = 'Bearer ' + t;
    return h;
  }
  async function rpc(path, opts){
    var res = await fetch(URL + path, opts);
    var data = null; try { data = await res.json(); } catch(e){}
    return { ok: res.ok, status: res.status, data: data };
  }
  function save(d){
    localStorage.setItem(TK, d.access_token);
    if (d.refresh_token) localStorage.setItem(RK, d.refresh_token);
  }
  async function refresh(){
    var rt = localStorage.getItem(RK); if (!rt) return false;
    var r = await rpc('/auth/v1/token?grant_type=refresh_token', { method:'POST', headers: headers(false), body: JSON.stringify({ refresh_token: rt }) });
    if (r.ok && r.data && r.data.access_token){ save(r.data); return true; }
    return false;
  }
  async function me(){
    var r = await rpc('/auth/v1/user', { method:'GET', headers: headers(true) });
    if (r.status === 401 && await refresh()) r = await rpc('/auth/v1/user', { method:'GET', headers: headers(true) });
    return r;
  }
  async function signUp(email, pass){
    var r = await rpc('/auth/v1/signup', { method:'POST', headers: headers(false), body: JSON.stringify({ email: email, password: pass }) });
    if (r.ok && r.data && r.data.access_token) save(r.data);
    return r;
  }
  async function signIn(email, pass){
    var r = await rpc('/auth/v1/token?grant_type=password', { method:'POST', headers: headers(false), body: JSON.stringify({ email: email, password: pass }) });
    if (r.ok && r.data && r.data.access_token) save(r.data);
    return r;
  }
  async function status(){
    var u = await me();
    if (!u.ok || !u.data) return { logged:false };
    var uid = u.data.id;
    var b = await rpc('/rest/v1/bans?user_id=eq.' + uid + '&select=id,reason', { method:'GET', headers: headers(true) });
    if (b.ok && b.data && b.data.length) return { logged:true, banned:true, reason:(b.data[0].reason||'') };
    var p = await rpc('/rest/v1/profiles?id=eq.' + uid + '&select=plan,plan_expires,username', { method:'GET', headers: headers(true) });
    var plan='free', exp=null, uname='';
    if (p.ok && p.data && p.data.length){ plan=p.data[0].plan||'free'; exp=p.data[0].plan_expires; uname=p.data[0].username||''; }
    var premium = exp ? new Date(exp).getTime() > Date.now() : false;
    return { logged:true, banned:false, plan:plan, expires:exp, premium:premium, uid:uid, username:uname };
  }
  async function submitPayment(months, amount, trace, uname){
    var u = await me(); if (!u.ok) return { ok:false };
    return await rpc('/rest/v1/payments', { method:'POST',
      headers: Object.assign(headers(true), {'Prefer':'return=representation'}),
      body: JSON.stringify([{ user_id:u.data.id, username: uname||u.data.email, plan_months:months, amount:amount, trace_code:trace, status:'pending' }]) });
  }
  async function logBoost(gameId, host, ping){
    var u = await me(); if (!u.ok) return;
    await rpc('/rest/v1/boost_history', { method:'POST', headers: headers(true),
      body: JSON.stringify([{ user_id:u.data.id, game_id:gameId, server_host:host, ping:ping }]) });
  }
  function signOut(){ localStorage.removeItem(TK); localStorage.removeItem(RK); }

  // ===== رابط کاربری لاگین =====
  function buildUI(){
    if (document.getElementById('novaAuthOverlay')) return;
    var d = document.createElement('div');
    d.id = 'novaAuthOverlay';
    d.innerHTML =
      '<div class="nova-auth-card">' +
      '<div class="nova-auth-title">☁️ حساب NOVA</div>' +
      '<input id="novaAuthEmail" type="email" placeholder="ایمیل" dir="ltr">' +
      '<input id="novaAuthPass" type="password" placeholder="رمز عبور (حداقل ۶ حرف)" dir="ltr">' +
      '<button id="novaAuthLogin" class="nova-auth-btn">ورود</button>' +
      '<button id="novaAuthSignup" class="nova-auth-btn nova-auth-alt">ثبت‌نام جدید</button>' +
      '<div id="novaAuthMsg"></div>' +
      '<button id="novaAuthClose" class="nova-auth-close">✕</button>' +
      '</div>';
    document.body.appendChild(d);
    d.querySelector('#novaAuthClose').onclick = hideAuth;
    d.querySelector('#novaAuthLogin').onclick = function(){ doAuth(signIn); };
    d.querySelector('#novaAuthSignup').onclick = function(){ doAuth(signUp); };
  }
  async function doAuth(fn){
    var em = document.getElementById('novaAuthEmail').value.trim();
    var ps = document.getElementById('novaAuthPass').value;
    var msg = document.getElementById('novaAuthMsg');
    msg.textContent = '⏳ لطفاً صبر کن...';
    var r = await fn(em, ps);
    if (r.ok){ msg.textContent = '✅ خوش اومدی!'; setTimeout(hideAuth, 700); }
    else { msg.textContent = '❌ ' + ((r.data && r.data.error_description) || (r.data && r.data.msg) || 'ایمیل یا رمز اشتباهه'); }
  }
  function showAuth(){ buildUI(); document.getElementById('novaAuthOverlay').style.display = 'flex'; }
  function hideAuth(){ var o = document.getElementById('novaAuthOverlay'); if (o) o.style.display = 'none'; }

  // ===== دکمه پشتیبانی → تلگرام =====
  function bindSupport(){
    var all = document.querySelectorAll('*');
    for (var i = 0; i < all.length; i++){
      var el = all[i];
      if (el.children.length) continue;
      var t = (el.textContent || '').trim().toLowerCase();
      if (t.indexOf('پشتیبانی') !== -1 || t.indexOf('support') !== -1){
        var target = el.closest('a,button') || el;
        target.style.cursor = 'pointer';
        target.addEventListener('click', function(ev){
          ev.preventDefault(); ev.stopPropagation();
          window.open('https://t.me/NovaBoosterSupport', '_blank');
        }, true);
      }
    }
  }
  document.addEventListener('DOMContentLoaded', function(){ buildUI(); bindSupport(); });

  return { status:status, signIn:signIn, signUp:signUp, signOut:signOut,
           submitPayment:submitPayment, logBoost:logBoost, showAuth:showAuth, hideAuth:hideAuth, me:me };
})();
