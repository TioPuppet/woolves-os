-- M1 · 0002_profile_trigger.sql
-- Auto-create a profile row when a new auth user signs up.
-- SECURITY DEFINER so the insert runs with owner privileges (bypasses RLS for
-- this single controlled insert); search_path pinned to public for safety.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
