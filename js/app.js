
function showPremiumModal(){
  if (document.getElementById('novaPremiumModal')) return;
  var m = document.createElement('div');
  m.id = 'novaPremiumModal';
  m.innerHTML = '<div class="npm-card">' +
    '<div class="npm-icon">🔒</div>' +
    '<div class="npm-title">اشتراک فعال ندارید</div>' +
    '<div class="npm-desc">برای کاهش پینگ و تجربه بهتر در بازی، نیاز به اشتراک فعال NOVA دارید.</div>' +
    '<button id="npmBuy" class="npm-btn npm-btn-gold">💎 مشاهده طرح‌ها و خرید</button>' +
    '<button id="npmLater" class="npm-btn npm-btn-ghost">بعداً</button>' +
    '</div>';
  document.body.appendChild(m);
  m.querySelector('#npmBuy').onclick = function(){
    m.remove();
    var clicked = false;
    document.querySelectorAll('button, a, [onclick]').forEach(function(t){
      if (clicked) return;
      var txt = (t.textContent || '').trim().toUpperCase();
      if (txt === 'PROFILE' || txt === 'پروفایل') { t.click(); clicked = true; }
    });
    setTimeout(function(){
      var target = document.querySelector('#premium, [id*="premium"], [id*="plan"], [class*="premium"]');
      if (!target) {
        document.querySelectorAll('*').forEach(function(el){
          if (target || el.children.length) return;
          var tx = (el.textContent || '').trim().toUpperCase();
          if (tx === 'PREMIUM') target = el;
        });
      }
      if (target) target.scrollIntoView({behavior:'smooth', block:'start'});
    }, 400);
  };
  m.querySelector('#npmLater').onclick = function(){ m.remove(); };
}
let state = {
    selectedGame: localStorage.getItem("nova_selected_game") || null,
    pingHistory: [],
    currentBest: null,
    serverTab: 'auto',
    manualSelected: localStorage.getItem("nova_manual_selected") || null,
    boosting: false,
    boostTimer: null,
    deviceStats: null,
    boostSession: null,
    showAllGames: false
};

const CIRCUMFERENCE = 628;

// ============================================
// ICON LOADING - از فایل محلی
// ============================================
function loadGameIcon(game, imgElement) {
    if (!imgElement || !game) return;
    
    imgElement.onerror = function() {
        imgElement.style.display = 'none';
        const parent = imgElement.parentElement;
        if (parent && !parent.querySelector('.fallback-text')) {
            const fallback = document.createElement('div');
            fallback.className = 'fallback-text';
            fallback.textContent = game.shortName;
            fallback.style.background = 'linear-gradient(135deg,' + game.colors.primary + ',' + game.colors.secondary + ')';
            parent.appendChild(fallback);
        }
    };
    
    imgElement.onload = function() {
        imgElement.style.display = 'block';
    };
    
    imgElement.src = game.icon;
}

function renderGames() {
    const grid = document.getElementById("gamesGrid");
    if (!grid) return;

    const games = state.showAllGames ? getAllGames() : getFeaturedGames(4);

    grid.innerHTML = games.map(game => `
        <div class="game-card ${state.selectedGame === game.id ? "selected" : ""}" data-game-id="${game.id}" onclick="selectGame('${game.id}')">
            <div class="game-icon" style="background:linear-gradient(135deg, ${game.colors.primary}, ${game.colors.secondary});">
                <img data-game-id="${game.id}" alt="${game.shortName}" style="display:none;">
            </div>
            <div class="game-name">${game.name}</div>
            <div class="game-genre">${game.genre}</div>
        </div>
    `).join("");

    document.querySelectorAll('.game-icon img').forEach(img => {
        const game = getGameById(img.getAttribute('data-game-id'));
        if (game) loadGameIcon(game, img);
    });

    const moreBtn = document.getElementById("moreGamesBtn");
    if (moreBtn) moreBtn.innerHTML = state.showAllGames ? "⌃" : "⌄";
}

function selectGame(id) {
    state.selectedGame = id;
    localStorage.setItem("nova_selected_game", id);
    document.querySelectorAll('#gamesGrid .game-card').forEach(card => {
        card.classList.toggle('selected', card.getAttribute('data-game-id') === id);
    });
    updateSelectedGameName();
    toast("Game selected");
    refreshServers();
}

function updateSelectedGameName() {
    const el = document.getElementById("selectedGameName");
    const game = getGameById(state.selectedGame);
    el.textContent = game ? game.name.toUpperCase() : "NO GAME SELECTED";
}

const DEFAULT_SERVERS = [
    { name: "Turkey - Istanbul", host: "", port: 443, auto: true, ping: null, angle: 320, dist: 65, country: "Turkey", wireguard: null, health_url: "" },
    { name: "Germany - Frankfurt", host: "", port: 443, auto: true, ping: null, angle: 290, dist: 90, country: "Germany", wireguard: null, health_url: "" },
    { name: "UAE - Dubai", host: "", port: 443, auto: true, ping: null, angle: 160, dist: 55, country: "UAE", wireguard: null, health_url: "" }
];
let servers = DEFAULT_SERVERS.map(s => ({ ...s }));

async function loadVpnServersFromCloud() {
    try {
        if (!window.NOVA_AUTH || !window.NOVA_AUTH.listServers) return;
        const rows = await window.NOVA_AUTH.listServers();
        if (!Array.isArray(rows) || !rows.length) return;
        servers = rows.map((r, i) => ({
            id: r.id, name: r.name || r.country || `Server ${i + 1}`,
            host: r.host || r.hostname || '', port: Number(r.port || 443),
            auto: r.auto !== false, ping: null, angle: Number(r.angle ?? ((i * 83) % 360)),
            dist: Number(r.dist ?? 65), country: r.country || '', wireguard: r.wireguard || null,
            health_url: r.health_url || (r.host ? `https://${r.host}/healthz` : '')
        })).filter(s => s.host);
        renderServers();
    } catch (e) { console.warn('Cloud servers unavailable:', e); }
}

function switchServerTab(tab, btn) {
    state.serverTab = tab;
    document.querySelectorAll('.server-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderServers();
}

function pingClass(ms) {
    if (ms < 60) return "good";
    if (ms < 120) return "mid";
    return "bad";
}

function renderServerDots() {
    const dotsGroup = document.getElementById("serverDots");
    if (!dotsGroup) return;
    const center = 110;
    const best = servers.filter(s => s.ping !== null && s.ping < 999).sort((a, b) => a.ping - b.ping)[0];
    dotsGroup.innerHTML = servers.map(s => {
        const rad = s.angle * Math.PI / 180;
        const x = center + Math.cos(rad) * s.dist;
        const y = center + Math.sin(rad) * s.dist;
        const isBest = best && best.host === s.host && !state.boosting;
        const cls = isBest ? "best" : (state.boosting ? "scanning-dot" : "auto");
        const r = isBest ? 6 : 4;
        return `<circle class="dot-halo ${cls}" cx="${x}" cy="${y}" r="${r * 2.2}"/>
                <circle class="server-dot ${cls}" cx="${x}" cy="${y}" r="${r}"/>`;
    }).join("");
}

function selectManualServer(host) {
    if (state.manualSelected === host) {
        state.manualSelected = null;
        localStorage.removeItem('nova_manual_selected');
        toast("انتخاب دستی لغو شد");
    } else {
        state.manualSelected = host;
        localStorage.setItem('nova_manual_selected', host);
        toast("سرور دستی انتخاب شد");
    }
    renderServers();
}

function renderServers() {
    const list = document.getElementById("serverList");
    const filtered = state.serverTab === 'auto' ? servers.filter(s => s.auto) : servers;
    if (filtered.length === 0) {
        list.innerHTML = '<div class="muted" style="text-align:center;padding:20px;">سروری موجود نیست</div>';
        return;
    }
    list.innerHTML = filtered.map(server => {
        const pingText = server.ping === null ? "..." : (server.ping >= 999 ? "OFF" : server.ping + " ms");
        const badgeClass = server.ping === null ? "" : pingClass(server.ping);
        const bestClass = state.currentBest && server.host === state.currentBest ? "best" : "";
        const manualClass = state.manualSelected === server.host ? "manual-selected" : "";
        const clickHandler = state.serverTab === 'manual' ? `onclick="selectManualServer('${server.host}')"` : "";
        return `<div class="server-row ${bestClass} ${manualClass}" ${clickHandler}>
            <div>
                <div class="server-name">${server.name}</div>
                <div class="server-host">${server.host}:${server.port} • ${server.auto ? "AUTO" : "MANUAL"}</div>
            </div>
            <div class="ping-badge ${badgeClass}">${pingText}</div>
        </div>`;
    }).join("");
    renderServerDots();
}


// پینگ واقعی: زمان تا پاسخ یا شکست اتصال
async function measureServer(server) {
    const url = server.health_url || (server.host ? `https://${server.host}/healthz` : '');
    if (!url) return { ping: 999, measured: false };
    const samples = [];
    for (let i = 0; i < 3; i++) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 3000);
        const start = performance.now();
        try {
            const res = await fetch(url, { cache: 'no-store', signal: ctrl.signal });
            const ms = Math.round(performance.now() - start);
            if (res.ok) samples.push(ms);
        } catch (_) {}
        clearTimeout(timer);
    }
    if (!samples.length) return { ping: 999, measured: false };
    samples.sort((a,b) => a-b);
    return { ping: samples[Math.floor(samples.length / 2)], measured: true };
}

async function refreshServers() {
    for (const server of servers) {
        const result = await measureServer(server);
        server.ping = result.ping;
        server.measured = result.measured;
        renderServers();
    }
}

function createRadarParticles() {
    const container = document.getElementById("radarParticles");
    if (!container) return;
    container.innerHTML = "";
    for (let i = 0; i < 14; i++) {
        const p = document.createElement("div");
        p.className = "radar-particle";
        const angle = Math.random() * 360;
        const dist = 15 + Math.random() * 70;
        const rad = angle * Math.PI / 180;
        p.style.left = (50 + Math.cos(rad) * (dist / 2)) + "%";
        p.style.top = (50 + Math.sin(rad) * (dist / 2)) + "%";
        p.style.animationDelay = (Math.random() * 3) + "s";
        p.style.animationDuration = (3 + Math.random() * 4) + "s";
        const colors = ["var(--cyan)", "var(--purple)", "var(--teal)", "var(--blue)"];
        p.style.background = colors[Math.floor(Math.random() * colors.length)];
        container.appendChild(p);
    }
}

async function scanBoostApps() {
    if (
        !window.Capacitor ||
        !Capacitor.Plugins ||
        !Capacitor.Plugins.BoostCore ||
        !Capacitor.Plugins.BoostCore.scanBackgroundApps
    ) {
        return null;
    }

    try {
        const result = await Capacitor.Plugins.BoostCore.scanBackgroundApps();
        const apps = Array.isArray(result && result.apps) ? result.apps : [];
        state.boostSession = state.boostSession || {};
        state.boostSession.scannedApps = apps;
        return apps;
    } catch (e) {
        console.warn("Boost app scan:", e);
        return null;
    }
}

async function readDeviceStats() {
    if (
        !window.Capacitor ||
        !Capacitor.Plugins ||
        !Capacitor.Plugins.BoostCore ||
        !Capacitor.Plugins.BoostCore.getDeviceStats
    ) {
        return null;
    }

    try {
        const stats = await Capacitor.Plugins.BoostCore.getDeviceStats();
        state.deviceStats = stats || null;
        return state.deviceStats;
    } catch (e) {
        console.warn("Device stats:", e);
        state.deviceStats = null;
        return null;
    }
}

function renderHistory() {
    const el = document.getElementById("pingHistory");
    if (state.pingHistory.length === 0) {
        el.innerHTML = '<div class="muted" style="font-size:11px;">NO BOOST YET</div>';
        return;
    }
    el.innerHTML = state.pingHistory.map(p => {
        const height = Math.max(4, Math.min(50, 70 - p));
        return `<div class="bar" style="height:${height}px;"></div>`;
    }).join("");
}

function setRing(percent) {
    document.getElementById("ringProgress").style.strokeDashoffset = CIRCUMFERENCE - (CIRCUMFERENCE * percent / 100);
}

function countUpPing(el, target) {
    const unit = document.getElementById("pingUnit");
    if (unit) unit.style.display = 'inline';
    const start = performance.now();
    const duration = 900;
    function frame(now) {
        const progress = Math.min((now - start) / duration, 1);
        el.textContent = Math.floor(progress * target);
        if (progress < 1) requestAnimationFrame(frame);
        else el.textContent = target;
    }
    requestAnimationFrame(frame);
}

/* dnsForServer: removed */

async function launchGame(game) {
    if (!game || !game.pkg) { toast('بازی انتخاب نشده!'); return; }
    const storeUrl = 'https://play.google.com/store/search?q=' + encodeURIComponent(game.name);

    // ۱. اول پکیج‌های نصب‌شده رو از گوشی بگیر
    if (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.BoostCore && Capacitor.Plugins.BoostCore.listInstalledGames) {
        try {
            const res = await Capacitor.Plugins.BoostCore.listInstalledGames();
            const installed = (res.games || []).map(g => ({ pkg: g.pkg, name: g.name }));
            const keywords = String(game.kw || game.name).split(',').map(s => s.trim());
            const match = installed.find(g => keywords.some(k => g.pkg.toLowerCase().includes(k) || g.name.toLowerCase().includes(k)));
            if (match) {
                try {
                    const lr = await Capacitor.Plugins.BoostCore.launchGame({ pkg: match.pkg });
                    if (lr && lr.launched) { toast('🎮 ' + match.name + ' باز شد!'); return; }
                } catch (e) {}
            }
            // fallback: تلاش همه پکیج‌های پیش‌فرض
            try {
                const lr = await Capacitor.Plugins.BoostCore.launchGame({ pkg: String(game.pkg), keywords: String(game.kw || game.name) });
                if (lr && lr.launched) { toast('🎮 بازی باز شد!'); return; }
                toast('❌ پیدا نشد! Settings → دکمه دیباگ');
                setTimeout(() => { window.location.href = storeUrl; }, 1500);
            } catch (e) {
                setTimeout(() => { window.location.href = storeUrl; }, 500);
            }
            return;
        } catch (e) {}
    }

    // fallback وب
    let left = false;
    const timer = setTimeout(function () {
        if (!left) window.location.href = storeUrl;
    }, 1500);
    document.addEventListener('visibilitychange', function onHide() {
        if (document.hidden) { left = true; clearTimeout(timer); document.removeEventListener('visibilitychange', onHide); }
    });
    window.location.href = 'intent://#Intent;package=' + String(game.pkg).split(',')[0] + ';end';
}

function stopBoost() {
    state.boosting = false;
    clearInterval(state.boostTimer);
    document.getElementById("boostCard").classList.remove("scanning");
    setRing(0);
    document.getElementById("pingValue").textContent = "--";
    const unit = document.getElementById("pingUnit");
    if (unit) unit.style.display = 'none';
    document.getElementById("serverValue").textContent = "SELECT A SERVER";
    document.getElementById("jitter").textContent = "--";
    document.getElementById("loss").textContent = "--";
    document.getElementById("route").textContent = "--";
    document.getElementById("boostBtn").innerHTML = 'START BOOST<span class="btn-sub">شروع بوست</span>';
    state.currentBest = null;
    if (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.BoostCore && Capacitor.Plugins.BoostCore.stopVpn) {
        try { Capacitor.Plugins.BoostCore.stopVpn({}); } catch (e) {}
    }
    const ob = document.getElementById('openGameBtn');
    if (ob) ob.style.display = 'none';
    renderServers();
    toast("Boost stopped");
}

let toastTimer;
function toast(message) {
    const el = document.getElementById("toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

function showPage(id, btn) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.getElementById(id).classList.add("active");
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
}

function updateStatus() {
    const el = document.getElementById("netStatus");
    if (navigator.onLine) {
        el.textContent = "ONLINE";
        el.classList.remove("offline");
    } else {
        el.textContent = "OFFLINE";
        el.classList.add("offline");
    }
}

function setTheme(theme, silent) {
    document.body.dataset.theme = theme;
    localStorage.setItem("nova_theme", theme);
    document.querySelectorAll(".theme-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.theme === theme);
    });
    if (!silent) toast(theme === "white" ? "تم روشن فعال شد" : "تم نئون ترکیبی فعال شد");
}

function loadProfile() {
    // اطلاعات پروفایل از Supabase توسط اسکریپت index.html پر می‌شود
}

function initApp() {
    // render همه بازی‌ها در پس‌زمینه (زیر splash)
        state.showAllGames = true;
        renderGames();
        setTimeout(function(){
            var cards = document.querySelectorAll("#gamesGrid > *");
            for (var i = 4; i < cards.length; i++) cards[i].classList.add("nova-game-hidden");
        }, 80);
        // مخفی کردن بازی‌های اضافی با کلاس (نه رندر مجدد بعدی)
        setTimeout(() => {
            const cards = document.querySelectorAll('#gamesGrid > *');
            cards.forEach((card, i) => {
                if (i >= 4) card.classList.add('nova-game-hidden');
            });
        }, 50);
    updateSelectedGameName();
    renderServers();
    loadVpnServersFromCloud().finally(() => refreshServers());
    createRadarParticles();
    renderHistory();
    loadProfile();
    setTimeout(() => { checkPremium(); loadNotifications(); }, 800);
    updateStatus();

    

    document.getElementById("refreshServers").onclick = async () => {
        toast("Refreshing servers...");
        await refreshServers();
        toast("Servers updated");
    };

    document.getElementById("boostBtn").onclick = async function () {
        if (state.boosting) { stopBoost(); return; }
        if (!state.selectedGame) { toast('اول یک بازی انتخاب کن! 🎮'); return; }
        await readDeviceStats();
        state.boostSession = { startedAt: Date.now() };
        const scannedApps = await scanBoostApps();
        if (Array.isArray(scannedApps)) {
            toast(`🔎 ${scannedApps.length} برنامه قابل بررسی شناسایی شد`);
        }
        state.boosting = true;
        this.innerHTML = 'STOP BOOST<span class="btn-sub">توقف بوست</span>';
        document.getElementById("boostCard").classList.add("scanning");
        let progress = 0;
        state.boostTimer = setInterval(() => {
            progress = Math.min(90, progress + 2);
            setRing(progress);
        }, 60);
        let serversToTest = state.manualSelected
            ? servers.filter(s => s.host === state.manualSelected)
            : servers.filter(s => s.auto);
        if (serversToTest.length === 0) serversToTest = servers.filter(s => s.auto);
        for (const server of serversToTest) {
            const result = await measureServer(server);
            server.ping = result.ping;
            server.measured = result.measured;
            renderServers();
        }
        const best = serversToTest.filter(s => s.ping !== null && s.ping < 999).sort((a, b) => a.ping - b.ping)[0];
        clearInterval(state.boostTimer);
        setRing(100);
        if (best) {
            state.currentBest = best.host;
            countUpPing(document.getElementById("pingValue"), best.ping);
            document.getElementById("serverValue").textContent = best.name.toUpperCase();
            document.getElementById("jitter").textContent = "--";
            document.getElementById("loss").textContent = "--";
            document.getElementById("route").textContent = best.country ? best.country.toUpperCase() : "SERVER";
            state.pingHistory.push(best.ping);
            if (state.pingHistory.length > 10) state.pingHistory.shift();
            renderHistory();
            renderServers();
            toast("Best server found");
            if (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.BoostCore && Capacitor.Plugins.BoostCore.startVpn) {
                try {
                    if (window.NOVA_SECURITY) await window.NOVA_SECURITY.guard();
                    if (!window.NOVA_AUTH || !window.NOVA_AUTH.isLoggedIn()) { if (window.NOVA_AUTH) window.NOVA_AUTH.showAuth(); toast('اول وارد حساب NOVA شو! ☁️'); return; }
                    var banR = await window.NOVA_AUTH.isBanned();
                    if (banR) { toast('⛔ حساب مسدود: ' + banR); return; }
                    var prof = await window.NOVA_AUTH.getProfile().catch(function(){ return null; });
                    var isAdmin = prof && prof.is_admin === true;
                    var isPremium = isAdmin || (prof && prof.plan_expires && new Date(prof.plan_expires).getTime() > Date.now());
                    if (!isPremium) { if (window.showPremiumModal) showPremiumModal(); else toast('برای بوست، اشتراک فعال لازمه 💎'); return; }
                    // NOVA_VPN_CFG: گرفتن کانفیگ WireGuard از ابر (اگه سرور واقعی آماده باشه)
        var wgConfig = null;
        try {
          var srvList = await window.NOVA_AUTH.listServers();
          var srv = null;
          for (var si = 0; si < srvList.length; si++) {
            var country = (srvList[si].country || '').toLowerCase();
            if ((country && best.name.toLowerCase().indexOf(country) !== -1) || srvList[si].name === best.name) { srv = srvList[si]; break; }
          }
          srv = srv || srvList[0];
          if (!srv) throw new Error('No active VPN server configured');
          if (!Capacitor.Plugins.BoostCore.getWireGuardPublicKey) throw new Error('WireGuard native core is missing');
          var keyInfo = await Capacitor.Plugins.BoostCore.getWireGuardPublicKey();
          var peer = await window.NOVA_AUTH.provisionVpn(srv.id, keyInfo.publicKey);
          if (!peer || !peer.config) throw new Error('VPN provisioning returned no config');
          wgConfig = peer.config;
        } catch (e) {
          console.warn('VPN provision:', e);
          toast('اتصال VPN آماده نیست: ' + (e.message || 'خطای پیکربندی'));
          return;
        }
        await Capacitor.Plugins.BoostCore.startVpn({ server: best.name, config: wgConfig });
                    toast('🛡️ سرور ' + best.name + ' فعال شد!');
                } catch (e) {}
            }
            const openBtn = document.getElementById('openGameBtn');
            if (openBtn) {
                openBtn.style.display = 'block';
                openBtn.onclick = () => launchGame(getGameById(state.selectedGame));
            }
        } else {
            document.getElementById("pingValue").textContent = "--";
            document.getElementById("serverValue").textContent = "NO SERVER FOUND";
            toast("No server found");
        }
    };

    // ذخیره واقعی پروفایل توسط اسکریپت ماژول در index.html انجام می‌شود

    document.querySelectorAll(".plan").forEach(plan => {
        plan.onclick = () => {
            document.querySelectorAll(".plan").forEach(p => p.classList.remove("active"));
            plan.classList.add("active");
            toast(plan.querySelector("b").textContent + " انتخاب شد");
        };
    });

    document.getElementById("buyBtn").onclick = () => openBuyModal();

    const notifySwitch = document.getElementById("notifySwitch");
    notifySwitch.checked = localStorage.getItem("nova_notify") !== "0";
    notifySwitch.onchange = () => {
        localStorage.setItem("nova_notify", notifySwitch.checked ? "1" : "0");
        toast(notifySwitch.checked ? "اعلان بروزرسانی روشن شد" : "اعلان بروزرسانی خاموش شد");
    };

    document.querySelectorAll(".theme-btn").forEach(btn => {
        btn.onclick = () => setTheme(btn.dataset.theme, false);
    });
    setTheme(localStorage.getItem("nova_theme") || "neon", true);
}

document.addEventListener("DOMContentLoaded", initApp);
window.addEventListener("online", updateStatus);
window.addEventListener("offline", updateStatus);


// ===== NOVA: فلش بازی‌ها — فقط toggle کلاس، بدون رندر، بدون چشمک =====
document.addEventListener('DOMContentLoaded', function(){
    var btn = document.getElementById('moreGamesBtn');
    if (!btn) return;
    btn.onclick = function(){
        var cards = document.querySelectorAll('#gamesGrid > *');
        var extras = [];
        for (var i = 4; i < cards.length; i++) extras.push(cards[i]);
        if (!extras.length) return;
        var hidden = extras[0].classList.contains('nova-game-hidden');
        extras.forEach(function(card){
            card.classList.toggle('nova-game-hidden', !hidden);
        });
        btn.innerHTML = hidden ? '⌃' : '⌄';
    };
});

// جلوگیری از منوی long-press
document.addEventListener('contextmenu', function(e){ e.preventDefault(); });
