import os

URL = "https://bpveghqcmxblczvazuff.supabase.co"
ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwdmVnaHFjbXhibGN6dmF6dWZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMTMzNjIsImV4cCI6MjEwNDc4OTM2Mn0.1Cb7NFVETxPCPr9F4hwlNifSKvWDAagYQAGdA_DxMLk"

auth_js = f"""const SUPABASE_URL = '{URL}';
const SUPABASE_ANON = '{ANON}';
let supabase = null, currentUser = null;

async function initSupabase() {{
    const {{ createClient }} = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
    const {{ data: {{ session }} }} = await supabase.auth.getSession();
    currentUser = session?.user || null;
    supabase.auth.onAuthStateChange((event, session) => {{
        currentUser = session?.user || null;
        if (currentUser) localStorage.setItem('nova_user_id', currentUser.id);
        else localStorage.removeItem('nova_user_id');
        window.dispatchEvent(new CustomEvent('auth-changed', {{ detail: {{ user: currentUser }} }}));
    }});
    return currentUser;
}}

async function signUp(email, password, username, mobile) {{
    const {{ data, error }} = await supabase.auth.signUp({{ email, password }});
    if (error) throw error;
    if (data.user) {{
        await supabase.from('profiles').insert({{
            id: data.user.id, username, mobile, email, plan: 'free'
        }});
    }}
    return data;
}}

async function signIn(email, password) {{
    const {{ data, error }} = await supabase.auth.signInWithPassword({{ email, password }});
    if (error) throw error;
    return data;
}}

async function signOut() {{
    const {{ error }} = await supabase.auth.signOut();
    if (error) throw error;
}}

async function getProfile() {{
    if (!currentUser) return null;
    const {{ data }} = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
    return data;
}}

async function updateProfile(updates) {{
    if (!currentUser) throw new Error('Not logged in');
    const {{ data, error }} = await supabase.from('profiles').update(updates).eq('id', currentUser.id).select().single();
    if (error) throw error;
    return data;
}}

async function saveBoostHistory(gameId, serverHost, ping) {{
    if (!currentUser) return;
    await supabase.from('boost_history').insert({{ user_id: currentUser.id, game_id: gameId, server_host: serverHost, ping }});
}}

async function getBoostHistory(limit = 10) {{
    if (!currentUser) return [];
    const {{ data }} = await supabase.from('boost_history').select('*').eq('user_id', currentUser.id).order('created_at', {{ ascending: false }}).limit(limit);
    return data || [];
}}

function isLoggedIn() {{ return currentUser !== null; }}
function getCurrentUser() {{ return currentUser; }}
"""

auth_html = """<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>NOVA - ورود</title>
    <link rel="stylesheet" href="css/style.css">
    <link rel="stylesheet" href="css/auth.css">
</head>
<body data-theme="neon">
    <div class="auth-container">
        <div class="auth-header">
            <div class="logo">NOVA</div>
            <div class="tagline">Game Booster</div>
        </div>
        <div class="auth-tabs">
            <button class="auth-tab active" data-tab="login">ورود</button>
            <button class="auth-tab" data-tab="register">ثبت‌نام</button>
        </div>
        <form id="loginForm" class="auth-form active">
            <div class="form-group"><label>ایمیل</label><input type="email" id="loginEmail" required></div>
            <div class="form-group"><label>رمز عبور</label><input type="password" id="loginPassword" required minlength="6"></div>
            <button type="submit" class="auth-btn">ورود</button>
            <div id="loginError" class="auth-error"></div>
        </form>
        <form id="registerForm" class="auth-form">
            <div class="form-group"><label>نام کاربری</label><input type="text" id="registerUsername" required minlength="3"></div>
            <div class="form-group"><label>شماره موبایل</label><input type="tel" id="registerMobile" placeholder="09123456789"></div>
            <div class="form-group"><label>ایمیل</label><input type="email" id="registerEmail" required></div>
            <div class="form-group"><label>رمز عبور</label><input type="password" id="registerPassword" required minlength="6"></div>
            <button type="submit" class="auth-btn">ثبت‌نام</button>
            <div id="registerError" class="auth-error"></div>
        </form>
    </div>
    <script type="module">
        import { initSupabase, signIn, signUp } from './js/auth.js';
        await initSupabase();
        document.querySelectorAll('.auth-tab').forEach(t => {
            t.onclick = () => {
                document.querySelectorAll('.auth-tab').forEach(x => x.classList.remove('active'));
                document.querySelectorAll('.auth-form').forEach(x => x.classList.remove('active'));
                t.classList.add('active');
                document.getElementById(t.dataset.tab + 'Form').classList.add('active');
            };
        });
        document.getElementById('loginForm').onsubmit = async (e) => {
            e.preventDefault();
            const err = document.getElementById('loginError');
            err.textContent = '';
            try {
                await signIn(document.getElementById('loginEmail').value, document.getElementById('loginPassword').value);
                location.href = 'index.html';
            } catch (e) { err.textContent = 'ایمیل یا رمز اشتباه است'; }
        };
        document.getElementById('registerForm').onsubmit = async (e) => {
            e.preventDefault();
            const err = document.getElementById('registerError');
            err.textContent = '';
            try {
                await signUp(
                    document.getElementById('registerEmail').value,
                    document.getElementById('registerPassword').value,
                    document.getElementById('registerUsername').value,
                    document.getElementById('registerMobile').value
                );
                location.href = 'index.html';
            } catch (e) { err.textContent = 'خطا: ' + e.message; }
        };
    </script>
</body>
</html>
"""

auth_css = """
.auth-container { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; background: var(--bg-dark); }
.auth-header { text-align: center; margin-bottom: 40px; }
.auth-header .logo { font-size: 48px; font-weight: 900; background: linear-gradient(135deg, var(--cyan), var(--purple)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.auth-header .tagline { color: var(--text-secondary); font-size: 14px; letter-spacing: 2px; margin-top: 8px; }
.auth-tabs { display: flex; gap: 10px; margin-bottom: 30px; background: var(--card-bg); padding: 5px; border-radius: 12px; border: 1px solid var(--border); }
.auth-tab { flex: 1; padding: 12px 24px; background: transparent; border: none; color: var(--text-secondary); font-size: 14px; font-weight: 600; border-radius: 8px; cursor: pointer; }
.auth-tab.active { background: linear-gradient(135deg, var(--cyan), var(--purple)); color: white; }
.auth-form { display: none; width: 100%; max-width: 400px; }
.auth-form.active { display: block; }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; color: var(--text-primary); font-size: 13px; margin-bottom: 8px; font-weight: 500; }
.form-group input { width: 100%; padding: 14px 16px; background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px; color: var(--text-primary); font-size: 15px; box-sizing: border-box; }
.form-group input:focus { outline: none; border-color: var(--cyan); box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.1); }
.auth-btn { width: 100%; padding: 16px; background: linear-gradient(135deg, var(--cyan), var(--purple)); border: none; border-radius: 12px; color: white; font-size: 16px; font-weight: 700; cursor: pointer; margin-top: 10px; }
.auth-error { margin-top: 15px; padding: 12px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; color: #ef4444; font-size: 13px; text-align: center; display: none; }
.auth-error:not(:empty) { display: block; }
"""

with open('js/auth.js', 'w') as f: f.write(auth_js)
print("✅ auth.js")

with open('auth.html', 'w') as f: f.write(auth_html)
print("✅ auth.html")

with open('css/auth.css', 'w') as f: f.write(auth_css)
print("✅ auth.css")

print("\n✅ همه فایل‌ها ساخته شدن!")
