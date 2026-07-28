-- Knowledge Base auth — role-based access (admin / editor / commenter / member)
-- Run this ONCE in Supabase: Dashboard → SQL Editor → New Query → paste → Run
-- Safe to re-run: recreates the function/trigger/policies each time, and won't
-- reset roles that are already set (backfill uses ON CONFLICT DO NOTHING).

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'editor', 'commenter', 'member')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Adds the 'commenter' role. Safe to re-run, and safe even if this table already
-- existed (with the old admin/editor/member-only constraint) before this line was added.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'editor', 'commenter', 'member'));

-- Backfill a profile row for any account that signed up before this table existed
-- (e.g. Kate, Serge). New signups get one automatically via the trigger below.
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;

create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

-- Security-definer helper for the RLS policies below. Querying profiles directly
-- inside a profiles RLS policy causes "infinite recursion detected in policy" —
-- routing through this function (owned by a role that bypasses RLS) avoids that.
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = uid and role = 'admin');
$$;

-- Who's allowed to post/read KB comments: everyone except plain 'member' accounts
-- (rank-and-file staff who browse only). Used by Comments Widget/comments_setup.sql.
create or replace function public.can_comment(uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = uid and role in ('admin', 'editor', 'commenter'));
$$;

-- Everyone can see their own row; admins can see everyone (needed for the Manage Users list)
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select
  using (auth.uid() = id or public.is_admin(auth.uid()));

-- Only admins can change roles (including their own row, though the admin.html UI
-- disables editing your own role in-browser to avoid an accidental self-lockout)
drop policy if exists profiles_update_admin_only on public.profiles;
create policy profiles_update_admin_only on public.profiles
  for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Make Kate the first admin. Everyone else (Serge included) defaults to 'member' —
-- promote people to 'editor'/'admin' from auth/admin.html once this is run.
update public.profiles set role = 'admin' where email = 'ar@completewd.com';
