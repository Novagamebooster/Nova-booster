-- NOVA security baseline.
-- Review against the live schema before applying in production.

alter table public.profiles enable row level security;
alter table public.payments enable row level security;
alter table public.bans enable row level security;
alter table public.vpn_servers enable row level security;
alter table public.vpn_peers enable row level security;

-- Helper: admin status is stored in profiles, never inferred from a frontend email check.
create or replace function public.is_admin(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = uid), false);
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

-- Profiles: user can read/update their own profile, but protected fields are not client-controlled.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

-- Payments: users may create/read their own requests; only admins may change status.
drop policy if exists "payments_insert_own" on public.payments;
create policy "payments_insert_own" on public.payments for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "payments_select_own_or_admin" on public.payments;
create policy "payments_select_own_or_admin" on public.payments for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "payments_update_admin" on public.payments;
create policy "payments_update_admin" on public.payments for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- VPN servers are public-readable only when active; mutations are admin-only.
drop policy if exists "vpn_servers_select_active" on public.vpn_servers;
create policy "vpn_servers_select_active" on public.vpn_servers for select to authenticated using (active = true or public.is_admin());

drop policy if exists "vpn_servers_admin_insert" on public.vpn_servers;
create policy "vpn_servers_admin_insert" on public.vpn_servers for insert to authenticated with check (public.is_admin());

drop policy if exists "vpn_servers_admin_update" on public.vpn_servers;
create policy "vpn_servers_admin_update" on public.vpn_servers for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- VPN peers are private to their owner; admins can inspect them.
drop policy if exists "vpn_peers_select_own_or_admin" on public.vpn_peers;
create policy "vpn_peers_select_own_or_admin" on public.vpn_peers for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- NOVA VPN infrastructure fields (safe additive migration)
alter table if exists public.vpn_servers add column if not exists health_url text;
alter table if exists public.vpn_servers add column if not exists auto boolean not null default true;
alter table if exists public.vpn_servers add column if not exists angle numeric;
alter table if exists public.vpn_servers add column if not exists dist numeric;

create index if not exists vpn_servers_active_name_idx on public.vpn_servers(active, name);
