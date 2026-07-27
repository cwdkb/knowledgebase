-- Knowledge Base auth — completewd.com-only signup restriction
-- Run this ONCE in Supabase: Dashboard → SQL Editor → New Query → paste → Run
-- Safe to re-run: drops and recreates the function/trigger each time.
--
-- What this does: rejects any signup (auth.users insert) whose email does not
-- end in @completewd.com, at the database level. This cannot be bypassed by
-- calling the Supabase API directly, unlike a client-side-only check.
--
-- After running this, also double check (Dashboard → Authentication → Providers → Email):
--   - "Confirm email" is ON, so new accounts must click a link in their completewd.com
--     inbox before they can log in (this is the default, just confirming it's still on).
-- And (Dashboard → Authentication → URL Configuration):
--   - Add whatever URL this Knowledge Base ends up hosted at (or http://localhost:PORT
--     while testing locally) to "Redirect URLs" — otherwise the confirm-email and
--     password-reset links will fail to land back on auth/account.html.

create or replace function public.enforce_completewd_email_domain()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email !~* '@completewd\.com$' then
    raise exception 'Sign up is restricted to completewd.com email addresses.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_completewd_email_domain_trigger on auth.users;

create trigger enforce_completewd_email_domain_trigger
  before insert on auth.users
  for each row execute function public.enforce_completewd_email_domain();
