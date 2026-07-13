-- Security hardening: a profile owner must not be able to self-grant clinical access.
-- The clinician flag is managed by trusted database/admin migrations only.

create or replace function public.prevent_clinician_self_grant()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null then
    if tg_op = 'INSERT' and new.is_clinician then
      raise exception 'is_clinician is managed by an administrator';
    end if;

    if tg_op = 'UPDATE' and new.is_clinician is distinct from old.is_clinician then
      raise exception 'is_clinician is managed by an administrator';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_clinician_self_grant on public.profiles;
create trigger profiles_prevent_clinician_self_grant
  before insert or update on public.profiles
  for each row execute function public.prevent_clinician_self_grant();
