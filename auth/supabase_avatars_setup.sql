-- Knowledge Base auth — profile photo storage bucket
-- Run this ONCE in Supabase: Dashboard → SQL Editor → New Query → paste → Run
-- Safe to re-run: every statement is idempotent (on conflict / if exists guards).
--
-- Photos are uploaded to avatars/<user-id>/<filename>, resized client-side before
-- upload (see auth/account.js), and the resulting public URL is saved on
-- auth.users.user_metadata.avatar_url — same place display name already lives
-- (auth.updateUser), so no RLS changes are needed on public.profiles for this.

insert into storage.buckets (id, name, public, file_size_limit)
values ('avatars', 'avatars', true, 2097152)
on conflict (id) do update set public = true, file_size_limit = 2097152;

-- Each user may only write inside their own <user-id>/ folder of the bucket.
drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects
  for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects
  for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects
  for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Photos are shown throughout the Knowledge Base (not just to their owner), so
-- reads are open to anyone with a valid session.
drop policy if exists avatars_read_all on storage.objects;
create policy avatars_read_all on storage.objects
  for select
  using (bucket_id = 'avatars');
