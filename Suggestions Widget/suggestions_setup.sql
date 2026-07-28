-- Knowledge Base — staff suggestions/requests box (Phase 2 item from ROADMAP.md)
-- Run this ONCE in Supabase: Dashboard -> SQL Editor -> New Query -> paste -> Run
-- Depends on auth/supabase_roles_setup.sql already having been run (uses public.is_admin()).
-- Safe to re-run: uses "if not exists" / "drop policy if exists" throughout.
--
-- Unlike comments, this is open to every role including 'member' — it's the request
-- channel for staff who can't post pinned comments, but should still be able to ask
-- for a new section/topic to be added to the KB.

create table if not exists public.suggestions (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  requester_name text not null,
  requester_email text not null,
  page_context text, -- which KB page they were on when they submitted it, for reference only
  title text not null,
  description text,
  status text not null default 'pending' check (status in ('pending', 'added', 'declined')),
  created_at timestamptz not null default now(),
  actioned_by_name text,
  actioned_by_email text,
  actioned_at timestamptz
);

create index if not exists suggestions_status_idx on public.suggestions (status);

alter table public.suggestions enable row level security;

-- Everyone signed in can see the full list (so staff can see what's already been requested).
drop policy if exists suggestions_select on public.suggestions;
create policy suggestions_select on public.suggestions
  for select
  to authenticated
  using (true);

-- Anyone can submit a suggestion, but only as themselves.
drop policy if exists suggestions_insert on public.suggestions;
create policy suggestions_insert on public.suggestions
  for insert
  to authenticated
  with check (auth.uid() = requester_id);

-- Only admins (Kate) can change status (pending -> added/declined).
drop policy if exists suggestions_update_admin_only on public.suggestions;
create policy suggestions_update_admin_only on public.suggestions
  for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- No delete policy on purpose — same audit-trail reasoning as comments.
