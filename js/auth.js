const SUPABASE_URL = 'https://bpveghqcmxblczvazuff.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwdmVnaHFjbXhibGN6dmF6dWZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkyMTMzNjIsImV4cCI6MjEwNDc4OTM2Mn0.1Cb7NFVETxPCPr9F4hwlNifSKvWDAagYQAGdA_DxMLk';
let supabase = null, currentUser = null;

async function initSupabase() {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
    const { data: { session } } = await supabase.auth.getSession();
    currentUser = session?.user || null;
    supabase.auth.onAuthStateChange((event, session) => {
        currentUser = session?.user || null;
        if (currentUser) localStorage.setItem('nova_user_id', currentUser.id);
        else localStorage.removeItem('nova_user_id');
        window.dispatchEvent(new CustomEvent('auth-changed', { detail: { user: currentUser } }));
    });
    return currentUser;
}

async function signUp(email, password, username, mobile) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (data.user) {
        await supabase.from('profiles').insert({
            id: data.user.id, username, mobile, email, plan: 'free'
        });
    }
    return data;
}

async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
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

async function saveBoostHistory(gameId, serverHost, ping) {
    if (!currentUser) return;
    await supabase.from('boost_history').insert({ user_id: currentUser.id, game_id: gameId, server_host: serverHost, ping });
}

async function getBoostHistory(limit = 10) {
    if (!currentUser) return [];
    const { data } = await supabase.from('boost_history').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: false }).limit(limit);
    return data || [];
}

function isLoggedIn() { return currentUser !== null; }
function getCurrentUser() { return currentUser; }

export { initSupabase, signUp, signIn, signOut, getProfile, updateProfile, saveBoostHistory, getBoostHistory, isLoggedIn, getCurrentUser };
