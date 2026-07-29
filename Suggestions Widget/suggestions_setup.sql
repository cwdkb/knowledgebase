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

-- Requesters can also edit their own suggestion's title/description after posting
-- (2026-07-29) — e.g. fixing a typo. The trigger below keeps this to text-only: RLS
-- alone only controls which ROWS a policy applies to, not which COLUMNS, so without it
-- this policy would let a requester silently change their own status too.
drop policy if exists suggestions_update_own_text on public.suggestions;
create policy suggestions_update_own_text on public.suggestions
  for update
  to authenticated
  using (auth.uid() = requester_id)
  with check (auth.uid() = requester_id);

create or replace function public.suggestions_restrict_self_edit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin(auth.uid()) then
    return new; -- admins can already change anything via suggestions_update_admin_only
  end if;
  -- Non-admin requesters editing their own suggestion may only change title/description
  -- — status and everything else stays locked.
  if new.requester_id is distinct from old.requester_id
     or new.requester_name is distinct from old.requester_name
     or new.requester_email is distinct from old.requester_email
     or new.page_context is distinct from old.page_context
     or new.status is distinct from old.status
     or new.created_at is distinct from old.created_at
     or new.actioned_by_name is distinct from old.actioned_by_name
     or new.actioned_by_email is distinct from old.actioned_by_email
     or new.actioned_at is distinct from old.actioned_at
  then
    raise exception 'Only the title and description can be edited.';
  end if;
  return new;
end;
$$;

drop trigger if exists suggestions_restrict_self_edit_trigger on public.suggestions;
create trigger suggestions_restrict_self_edit_trigger
  before update on public.suggestions
  for each row
  execute function public.suggestions_restrict_self_edit();

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

-- Authors can also edit the text of their own note/reply after posting (2026-07-29) —
-- same self-edit pattern as comments. No status field to protect here, but the trigger
-- still locks authorship/targeting so a note can't be silently reassigned to someone
-- else or moved to a different suggestion.
drop policy if exists suggestion_comments_update_own_text on public.suggestion_comments;
create policy suggestion_comments_update_own_text on public.suggestion_comments
  for update
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create or replace function public.suggestion_comments_restrict_self_edit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin(auth.uid()) then
    return new;
  end if;
  if new.suggestion_id is distinct from old.suggestion_id
     or new.author_id is distinct from old.author_id
     or new.author_name is distinct from old.author_name
     or new.author_email is distinct from old.author_email
     or new.created_at is distinct from old.created_at
  then
    raise exception 'Only the note body can be edited.';
  end if;
  return new;
end;
$$;

drop trigger if exists suggestion_comments_restrict_self_edit_trigger on public.suggestion_comments;
create trigger suggestion_comments_restrict_self_edit_trigger
  before update on public.suggestion_comments
  for each row
  execute function public.suggestion_comments_restrict_self_edit();

-- No delete policy on purpose — same audit-trail reasoning as elsewhere.
