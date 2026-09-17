const SUPABASE_URL = 'https://bpveghqcmxblczvazuff.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwdmVnaHFjbXhibGN6dmF6dWZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMTMzNjIsImV4cCI6MjEwNDc4OTM2Mn0.1Cb7NFVETxPCPr9F4hwlNifSKvWDAagYQAGdA_DxMLk';
let supabase = null, currentUser = null;

const CDNS = [
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm',
    'https://esm.sh/@supabase/supabase-js@2',
    'https://unpkg.com/@supabase/supabase-js@2/dist/module/index.js'
];

async function loadSupabaseLib() {
    let lastErr = null;
    for (const cdn of CDNS) {
        try {
            const mod = await import(cdn);
            if (mod && mod.createClient) return mod.createClient;
        } catch (e) { lastErr = e; }
    }
    throw new Error('عدم دسترسی به Supabase');
}

async function initSupabase() {
    const createClient = await loadSupabaseLib();
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
            window.novaSupabase = supabase;
    const { data: { session } } = await supabase.auth.getSession();
    currentUser = session?.user || null;
    supabase.auth.onAuthStateChange((event, session) => {
        currentUser = session?.user || null;
        if (currentUser) localStorage.setItem('nova_user_id', currentUser.id);
        else localStorage.removeItem('nova_user_id');
    });
    return currentUser;
}

async function signUp(email, password, username) {
    if (!supabase) await initSupabase();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('already registered') || msg.includes('already been registered')) {
            return await signIn(email, password);
        }
        throw error;
    }
    if (data.user) {
        await supabase.from('profiles').insert({
            id: data.user.id, username, email, plan: 'free'
        }).catch(e => console.warn('Profile insert:', e));
    }
    return data;
}

async function signIn(email, password) {
    if (!supabase) await initSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

async function signOut() {
    if (!supabase) await initSupabase();
    await supabase.auth.signOut();
    currentUser = null;
    localStorage.removeItem('nova_user_id');
}

async function getProfile() {
    if (!currentUser) return null;
    const { data } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
    return data;
}

async function updateProfile(updates) {
    if (!currentUser) throw new Error('Not logged in');
    const { data, error } = await supabase.from('profiles').update(updates).eq('id', currentUser.id).select().single();
    if (error) throw error;
    return data;
}

// Admin functions
async function isAdmin() {
    if (!currentUser) return false;
    return currentUser.email === 'yazdanabdi1372@gmail.com';
}

async function getAllUsers() {
    if (!(await isAdmin())) return [];
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    return data || [];
}

async function changeUserPlan(userId, plan) {
    if (!(await isAdmin())) throw new Error('Not admin');
    const { data, error } = await supabase.from('profiles').update({ plan }).eq('id', userId).select().single();
    if (error) throw error;
    return data;
}

async function deleteUserProfile(userId) {
    if (!(await isAdmin())) throw new Error('Not admin');
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) throw error;
}

async function saveProfileData(username, email) {
    if (!currentUser) throw new Error('Not logged in');
    const { data: existing } = await supabase.from('profiles').select('id').eq('id', currentUser.id).maybeSingle();
    if (existing) {
        const { data, error } = await supabase.from('profiles').update({ username, email }).eq('id', currentUser.id).select().single();
        if (error) throw error;
        return data;
    }
    const { data, error } = await supabase.from('profiles').insert({ id: currentUser.id, username, email, plan: 'free' }).select().single();
    if (error) throw error;
    return data;
}


async function isBanned() {
    if (!currentUser) return false;
    const { data } = await supabase.from('bans').select('id,reason').eq('user_id', currentUser.id);
    return (data && data.length) ? (data[0].reason || 'تخلف') : false;
}
async function banUser(userId, reason) {
    if (!(await isAdmin())) throw new Error('Not admin');
    const { error } = await supabase.from('bans').insert({ user_id: userId, reason: reason || 'تخلف' });
    if (error) throw error;
}
async function unbanUser(userId) {
    if (!(await isAdmin())) throw new Error('Not admin');
    const { error } = await supabase.from('bans').delete().eq('user_id', userId);
    if (error) throw error;
}


async function getAllPayments() {
    if (!(await isAdmin())) return [];
    const { data } = await supabase.from('payments').select('*').order('created_at', { ascending: false });
    return data || [];
}
async function getAllBans() {
    if (!(await isAdmin())) return [];
    const { data } = await supabase.from('bans').select('*').order('banned_at', { ascending: false });
    return data || [];
}
async function getStats() {
    if (!(await isAdmin())) return null;
    const [u, p, b] = await Promise.all([
        supabase.from('profiles').select('plan,plan_expires'),
        supabase.from('payments').select('amount,status'),
        supabase.from('bans').select('id')
    ]);
    const now = Date.now();
    const active = (u.data || []).filter(x => x.plan_expires && new Date(x.plan_expires).getTime() > now).length;
    const revenue = (p.data || []).filter(x => x.status === 'approved').reduce((s, x) => s + (x.amount || 0), 0);
    const pending = (p.data || []).filter(x => x.status === 'pending').length;
    return { users: (u.data || []).length, active, revenue, pending, bans: (b.data || []).length };
}
async function approvePayment(paymentId) {
    if (!(await isAdmin())) throw new Error('Not admin');
    const { data: pay } = await supabase.from('payments').select('*').eq('id', paymentId).single();
    if (!pay) throw new Error('Payment not found');
    const { data: prof } = await supabase.from('profiles').select('plan_expires').eq('id', pay.user_id).single();
    const base = (prof && prof.plan_expires && new Date(prof.plan_expires) > new Date()) ? new Date(prof.plan_expires) : new Date();
    const newExp = new Date(base.getTime() + (pay.plan_months || 1) * 30 * 24 * 3600 * 1000);
    const { error: e1 } = await supabase.from('payments').update({ status: 'approved' }).eq('id', paymentId);
    if (e1) throw e1;
    const { error: e2 } = await supabase.from('profiles').update({ plan: pay.plan_months + 'm', plan_expires: newExp.toISOString() }).eq('id', pay.user_id);
    if (e2) throw e2;
}
async function rejectPayment(paymentId) {
    if (!(await isAdmin())) throw new Error('Not admin');
    const { error } = await supabase.from('payments').update({ status: 'rejected' }).eq('id', paymentId);
    if (error) throw error;
}
async function extendPlan(userId, months) {
    if (!(await isAdmin())) throw new Error('Not admin');
    const { data: prof } = await supabase.from('profiles').select('plan_expires').eq('id', userId).single();
    const base = (prof && prof.plan_expires && new Date(prof.plan_expires) > new Date()) ? new Date(prof.plan_expires) : new Date();
    const newExp = new Date(base.getTime() + months * 30 * 24 * 3600 * 1000);
    const { error } = await supabase.from('profiles').update({ plan: 'premium', plan_expires: newExp.toISOString() }).eq('id', userId);
    if (error) throw error;
}


async function listServers() {
    const { data } = await supabase.from('vpn_servers').select('*').eq('active', true).order('name');
    return data || [];
}
async function getMyPeer(serverId) {
    if (!currentUser) return null;
    const { data } = await supabase.from('vpn_peers').select('*').eq('user_id', currentUser.id).eq('server_id', serverId).maybeSingle();
    return data;
}
async function provisionVpn(serverId) {
    if (!currentUser) throw new Error('Not logged in');
    const { data, error } = await supabase.functions.invoke('provision-vpn', { body: { server_id: serverId } });
    if (error) throw error;
    return data;
}

function isLoggedIn() { return currentUser !== null; }
function getCurrentUser() { return currentUser; }

export { initSupabase, signUp, signIn, signOut, getProfile, updateProfile, isAdmin, getAllUsers, changeUserPlan, deleteUserProfile, isLoggedIn, getCurrentUser, saveProfileData, isBanned, banUser, unbanUser, approvePayment, rejectPayment, getAllPayments, getAllBans, getStats, extendPlan, listServers, getMyPeer, provisionVpn };
