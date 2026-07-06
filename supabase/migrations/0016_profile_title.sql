-- M1+ · 0016_profile_title.sql
-- Treatment/title (Sr., Sra., Dr., Dra.) used in greetings alongside display_name.

alter table public.profiles
  add column if not exists title text;
