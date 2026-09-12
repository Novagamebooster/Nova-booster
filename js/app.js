let state = {
    selectedGame: localStorage.getItem("nova_selected_game") || null,
    pingHistory: [],
    currentBest: null,
    serverTab: 'auto',
    manualSelected: localStorage.getItem("nova_manual_selected") || null,
    boosting: false,
    boostTimer: null,
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
    
    imgElement.src = game.icon + '?v=' + Date.now();
}

function renderGames() {
    const grid = document.getElementById("gamesGrid");
    if (!grid) return;

    const games = state.showAllGames ? getAllGames() : getFeaturedGames(4);

    grid.innerHTML = games.map(game => `
        <div class="game-card ${state.selectedGame === game.id ? "selected" : ""}" onclick="selectGame('${game.id}')">
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
    renderGames();
    updateSelectedGameName();
    toast("Game selected");
    refreshServers();
}

function updateSelectedGameName() {
    const el = document.getElementById("selectedGameName");
    const game = getGameById(state.selectedGame);
    el.textContent = game ? game.name.toUpperCase() : "NO GAME SELECTED";
}

const servers = [
    { name: "Iran - Tehran", host: "ir1.nova.gg", port: 443, auto: true, ping: null, angle: 30, dist: 40 },
    { name: "Turkey - Istanbul", host: "tr1.nova.gg", port: 443, auto: true, ping: null, angle: 320, dist: 65 },
    { name: "Germany - Frankfurt", host: "de1.nova.gg", port: 443, auto: true, ping: null, angle: 290, dist: 90 },
    { name: "UAE - Dubai", host: "ae1.nova.gg", port: 443, auto: true, ping: null, angle: 160, dist: 55 },
    { name: "Singapore - SG", host: "sg1.nova.gg", port: 443, auto: true, ping: null, angle: 110, dist: 95 }
];

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
    const best = servers.filter(s => s.ping !== null).sort((a, b) => a.ping - b.ping)[0];
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
        const pingText = server.ping === null ? "..." : server.ping + " ms";
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

async function fakePing(server) {
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 600));
    let base = 110;
    if (server.host.includes("ir")) base = 22;
    if (server.host.includes("tr")) base = 72;
    if (server.host.includes("ae")) base = 58;
    if (server.host.includes("de")) base = 96;
    if (server.host.includes("sg")) base = 132;
    let gameOffset = 0;
    const game = getGameById(state.selectedGame);
    if (game) gameOffset = game.pingOffset;
    return Math.max(14, Math.floor(base + gameOffset + Math.random() * 35));
}

async function refreshServers() {
    for (const server of servers) {
        server.ping = await fakePing(server);
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
    const data = JSON.parse(localStorage.getItem("nova_profile") || "{}");
    if (data.username) document.getElementById("username").value = data.username;
    if (data.mobile) document.getElementById("mobile").value = data.mobile;
    if (data.email) document.getElementById("email").value = data.email;
}

function initApp() {
    renderGames();
    updateSelectedGameName();
    renderServers();
    refreshServers();
    createRadarParticles();
    renderHistory();
    loadProfile();
    updateStatus();

    document.getElementById("moreGamesBtn").onclick = () => {
        state.showAllGames = !state.showAllGames;
        renderGames();
    };

    document.getElementById("refreshServers").onclick = async () => {
        toast("Refreshing servers...");
        await refreshServers();
        toast("Servers updated");
    };

    document.getElementById("boostBtn").onclick = async function () {
        if (state.boosting) { stopBoost(); return; }
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
            server.ping = await fakePing(server);
            renderServers();
        }
        const best = serversToTest.filter(s => s.ping !== null).sort((a, b) => a.ping - b.ping)[0];
        clearInterval(state.boostTimer);
        setRing(100);
        if (best) {
            state.currentBest = best.host;
            countUpPing(document.getElementById("pingValue"), best.ping);
            document.getElementById("serverValue").textContent = best.name.toUpperCase();
            document.getElementById("jitter").textContent = Math.max(1, Math.floor(best.ping * 0.07)) + " ms";
            document.getElementById("loss").textContent = (Math.random() * 0.7).toFixed(1) + "%";
            document.getElementById("route").textContent = best.host.split(".")[0].toUpperCase();
            state.pingHistory.push(best.ping);
            if (state.pingHistory.length > 10) state.pingHistory.shift();
            renderHistory();
            renderServers();
            toast("Best server found");
        } else {
            document.getElementById("pingValue").textContent = "--";
            document.getElementById("serverValue").textContent = "NO SERVER FOUND";
            toast("No server found");
        }
    };

    document.getElementById("saveProfile").onclick = () => {
        const data = {
            username: document.getElementById("username").value,
            mobile: document.getElementById("mobile").value,
            email: document.getElementById("email").value
        };
        localStorage.setItem("nova_profile", JSON.stringify(data));
        toast("پروفایل ذخیره شد");
    };

    document.querySelectorAll(".plan").forEach(plan => {
        plan.onclick = () => {
            document.querySelectorAll(".plan").forEach(p => p.classList.remove("active"));
            plan.classList.add("active");
            toast(plan.querySelector("b").textContent + " انتخاب شد");
        };
    });

    document.getElementById("buyBtn").onclick = () => {
        toast("درگاه پرداخت به زودی فعال می‌شود");
    };

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
