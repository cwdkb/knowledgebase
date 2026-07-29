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
  status text not null default 'pending' check (status in ('pending', 'added', 'declined', 'archived')),
  created_at timestamptz not null default now(),
  actioned_by_name text,
  actioned_by_email text,
  actioned_at timestamptz
);

-- Adds the 'archived' status (2026-07-29, part of the dashboard redesign) — for
-- stale/duplicate suggestions where no explicit decision was made, distinct from
-- 'declined' (an actual no). Safe to re-run, and safe on a table that already
-- existed with the old 3-value constraint.
alter table public.suggestions drop constraint if exists suggestions_status_check;
alter table public.suggestions add constraint suggestions_status_check
  check (status in ('pending', 'added', 'declined', 'archived'));

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

-- Notes/discussion under a suggestion (e.g. Kate explaining why something was
-- declined, or the requester replying back) — flat, no further nesting. Same
-- openness model as suggestions itself: everyone signed in can read and post as
-- themselves, INCLUDING plain 'member' accounts (decided 2026-07-29 — the whole
-- point is the requester can be part of the back-and-forth, not just admins).
create table if not exists public.suggestion_comments (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references public.suggestions(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  author_email text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists suggestion_comments_suggestion_id_idx on public.suggestion_comments (suggestion_id);

alter table public.suggestion_comments enable row level security;

drop policy if exists suggestion_comments_select on public.suggestion_comments;
create policy suggestion_comments_select on public.suggestion_comments
  for select
  to authenticated
  using (true);

-- Locks once the suggestion is decided (status != 'pending') — mirrors the
-- dashboard UI, which hides the note box and shows "Reset to Pending to add a
-- new note" instead. An admin resetting status back to 'pending' reopens it for
-- everyone, same as reopening a resolved comment thread.
drop policy if exists suggestion_comments_insert on public.suggestion_comments;
create policy suggestion_comments_insert on public.suggestion_comments
  for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and exists (
      select 1 from public.suggestions s
      where s.id = suggestion_id and s.status = 'pending'
    )
  );

-- No update/delete policy on purpose — same audit-trail reasoning as elsewhere.
