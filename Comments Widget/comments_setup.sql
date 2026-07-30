-- Knowledge Base — per-page comments (Phase 2 item from ROADMAP.md)
-- Run this ONCE in Supabase: Dashboard -> SQL Editor -> New Query -> paste -> Run
-- Depends on auth/supabase_roles_setup.sql already having been run (uses public.profiles,
-- public.is_admin(), and public.can_comment()) — run that first if you haven't.
-- Safe to re-run: uses "if not exists" / "drop policy if exists" throughout.

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  page_id text not null,
  page_title text not null,
  -- anchor_id/anchor_label: set when a comment is pinned to a specific `.stage-detail`
  -- block (a checklist/SOP item) rather than the page as a whole. Both null = a general,
  -- page-level comment. anchor_label is a denormalized snapshot of that block's summary
  -- text at post time, so the comment still reads sensibly even if the block's wording
  -- changes later.
  anchor_id text,
  anchor_label text,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  author_email text not null,
  body text not null,
  created_at timestamptz not null default now(),
  resolved boolean not null default false,
  resolved_by_name text,
  resolved_by_email text,
  resolved_at timestamptz
);

create index if not exists comments_page_id_idx on public.comments (page_id);
create index if not exists comments_resolved_idx on public.comments (resolved);
create index if not exists comments_anchor_id_idx on public.comments (anchor_id);

-- Archive: a separate, reversible "hide this" flag (2026-07-30) — for test/dummy
-- comments left while building the widget, not real revision requests. Deliberately
-- NOT the same thing as `resolved`: a comment can be archived while open or actioned,
-- and archiving never deletes the row (there's still no delete policy — see bottom of
-- this file), so it stays a safer alternative to asking someone to run a DELETE.
alter table public.comments add column if not exists archived boolean not null default false;
alter table public.comments add column if not exists archived_by_name text;
alter table public.comments add column if not exists archived_by_email text;
alter table public.comments add column if not exists archived_at timestamptz;
create index if not exists comments_archived_idx on public.comments (archived);

-- Reply threading: a reply is just another comments row pointing back at the comment
-- it's replying to. One level deep only (a reply's own parent_id is always null) — the
-- widget/dashboard only ever show a Reply control on top-level comments. Safe to re-run
-- (add column if not exists) even on a table that predates this.
alter table public.comments add column if not exists parent_id uuid references public.comments(id) on delete cascade;
create index if not exists comments_parent_id_idx on public.comments (parent_id);

alter table public.comments enable row level security;

-- Only admin/editor/commenter roles can read comments — plain 'member' accounts
-- (browse-only staff) don't see this internal revision-review channel at all.
drop policy if exists comments_select on public.comments;
create policy comments_select on public.comments
  for select
  to authenticated
  using (public.can_comment(auth.uid()));

-- Same roles can post, but only as themselves (author_id must match their own session).
-- Replies additionally lock once the parent thread is resolved (2026-07-29, part of
-- the dashboard redesign) — mirrors the UI, which hides the reply box and shows
-- "Reopen it above to add a new reply" instead. New top-level comments are always
-- allowed (parent_id is null so the exists-check is skipped).
-- NOTE: the exists-check must qualify the outer row as `comments.parent_id`, not a bare
-- `parent_id` — since public.comments has its own parent_id column, an unqualified
-- reference inside "from public.comments c" resolves to the subquery's own c.parent_id
-- instead of the row being inserted, which silently blocked every reply regardless of
-- resolved status (found 2026-07-29 during live testing).
drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments
  for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and public.can_comment(auth.uid())
    and (
      parent_id is null
      or exists (select 1 from public.comments c where c.id = comments.parent_id and c.resolved = false)
    )
  );

-- Only admins (Kate) can update a comment's resolve state — in practice this is only
-- ever used to flip `resolved` (mark actioned / reopen) from the widget.
drop policy if exists comments_update_admin_only on public.comments;
create policy comments_update_admin_only on public.comments
  for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- Authors (admin/editor/commenter) can also edit the text of their own comment/reply
-- after posting — e.g. fixing a typo (2026-07-29). The trigger below is what actually
-- keeps this to text-only: RLS alone only controls which ROWS a policy applies to, not
-- which COLUMNS, so without it this policy would let an author silently flip their own
-- `resolved` status too.
drop policy if exists comments_update_own_text on public.comments;
create policy comments_update_own_text on public.comments
  for update
  to authenticated
  using (auth.uid() = author_id and public.can_comment(auth.uid()))
  with check (auth.uid() = author_id and public.can_comment(auth.uid()));

create or replace function public.comments_restrict_self_edit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin(auth.uid()) then
    return new; -- admins can already change anything via comments_update_admin_only
  end if;
  -- Non-admin authors editing their own comment may only change `body` — everything
  -- else (resolve state, authorship, page/anchor targeting, threading) stays locked.
  if new.page_id is distinct from old.page_id
     or new.page_title is distinct from old.page_title
     or new.anchor_id is distinct from old.anchor_id
     or new.anchor_label is distinct from old.anchor_label
     or new.author_id is distinct from old.author_id
     or new.author_name is distinct from old.author_name
     or new.author_email is distinct from old.author_email
     or new.created_at is distinct from old.created_at
     or new.resolved is distinct from old.resolved
     or new.resolved_by_name is distinct from old.resolved_by_name
     or new.resolved_by_email is distinct from old.resolved_by_email
     or new.resolved_at is distinct from old.resolved_at
     or new.parent_id is distinct from old.parent_id
     or new.archived is distinct from old.archived
     or new.archived_by_name is distinct from old.archived_by_name
     or new.archived_by_email is distinct from old.archived_by_email
     or new.archived_at is distinct from old.archived_at
  then
    raise exception 'Only the comment body can be edited.';
  end if;
  return new;
end;
$$;

drop trigger if exists comments_restrict_self_edit_trigger on public.comments;
create trigger comments_restrict_self_edit_trigger
  before update on public.comments
  for each row
  execute function public.comments_restrict_self_edit();

-- No delete policy on purpose — comments are an audit trail of revision requests and
-- what's been actioned; nobody can delete them from the client. Add one later if needed.
