// NOVA Payment System
const TG_BOT = '8941385867:AAF43nQ8Zpl0BOQFFnOtVxixmbD_SexTeds';
const TG_CHAT = '6345819822';
const ADMIN_EMAIL = 'yazdanabdi1372@gmail.com';

async function getSupabaseClient() {
    let tries = 0;
    while (!window.novaSupabase && tries < 30) { await new Promise(r => setTimeout(r, 100)); tries++; }
    return window.novaSupabase;
}

async function notifyAdminTelegram(msg) {
    try {
        if (!TG_BOT || TG_BOT.includes('PLACEHOLDER')) return;
        await fetch('https://api.telegram.org/bot' + TG_BOT + '/sendMessage', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TG_CHAT, text: msg, parse_mode: 'HTML' })
        });
    } catch (e) {}
}

function openBuyModal() {
    const activePlan = document.querySelector('.plan.active');
    if (!activePlan) { toast('ابتدا یک پلن را انتخاب کنید'); return; }
    const months = parseInt(activePlan.querySelector('b').textContent);
    const amounts = {1: 49000, 3: 129000, 6: 229000, 12: 399000};
    const amount = amounts[months];
    if (!amount) { toast('پلن معتبر نیست'); return; }
    document.getElementById('selectedPlanDisplay').textContent = months + ' ماهه';
    document.getElementById('selectedAmountDisplay').textContent = amount.toLocaleString('fa-IR') + ' تومان';
    document.getElementById('paymentModal').style.display = 'block';
    document.getElementById('paymentStatus').style.display = 'none';
    document.getElementById('traceInput').value = '';
    const btn = document.getElementById('submitPaymentBtn');
    btn.disabled = false; btn.textContent = 'ثبت پرداخت'; btn.style.display = 'block';
    btn.onclick = async () => {
        const trace = document.getElementById('traceInput').value.trim();
        if (!trace || trace.length < 6) { toast('کد پیگیری معتبر وارد کنید'); return; }
        btn.disabled = true; btn.textContent = 'در حال ثبت...';
        try {
            const sb = await getSupabaseClient();
            if (!sb) throw new Error('ارتباط با سرور برقرار نشد');
            const { data: { user } } = await sb.auth.getUser();
            if (!user) throw new Error('ابتدا وارد شوید');
            const { error } = await sb.from('payments').insert({ user_id: user.id, username: user.email || 'user', plan_months: months, amount: amount, trace_code: trace });
            if (error) throw error;
            await notifyAdminTelegram('💳 پرداخت جدید!\n👤 ' + (user.email || 'user') + '\n📦 پلن: ' + months + ' ماهه\n💰 ' + amount.toLocaleString() + ' تومان\n🔑 کد: ' + trace);
            const st = document.getElementById('paymentStatus');
            st.style.display = 'block'; st.style.background = 'rgba(52,211,153,.1)'; st.style.border = '1px solid #34d399'; st.style.color = '#34d399';
            st.innerHTML = '✅ پرداخت ثبت شد! ادمین بلافاصله مطلع شد';
            btn.style.display = 'none'; toast('✅ پرداخت ثبت شد');
        } catch (e) { toast('خطا: ' + e.message); btn.disabled = false; btn.textContent = 'ثبت پرداخت'; }
    };
}

async function checkPremium() {
    const st = document.getElementById('premiumStatus');
    if (!st) return;
    try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const { data: { user } } = await sb.auth.getUser();
        if (!user) return;
        if (user.email === ADMIN_EMAIL) {
            const { count } = await sb.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'pending');
            if (count > 0) toast('💳 ' + count + ' پرداخت در انتظار شماست!');
        }
        const { data: prof } = await sb.from('profiles').select('plan_expires').eq('id', user.id).single();
        if (prof && prof.plan_expires) {
            const exp = new Date(prof.plan_expires);
            const days = Math.ceil((exp - new Date()) / 86400000);
            if (days > 0) {
                st.style.display = 'block';
                st.style.background = 'linear-gradient(135deg,rgba(52,211,153,.15),rgba(168,85,247,.15))';
                st.style.border = '1px solid #34d399';
                st.innerHTML = '👑 اشتراک پرمیوم فعال - ' + days + ' روز باقی‌مانده';
                return;
            }
        }
        st.style.display = 'none';
    } catch (e) {}
}

async function loadNotifications() {
    try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const { data: notifs } = await sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(3);
        if (!notifs || !notifs.length) return;
        const last = localStorage.getItem('nova_last_notif') || '0';
        const fresh = notifs.filter(n => new Date(n.created_at).getTime() > parseInt(last));
        if (fresh.length) { localStorage.setItem('nova_last_notif', String(Date.now())); toast('📢 ' + fresh[0].title); }
    } catch (e) {}
}

window.openBuyModal = openBuyModal;
window.checkPremium = checkPremium;
window.loadNotifications = loadNotifications;
