create schema if not exists private;

-- Existing registration data contains duplicate normalized emails, so a
-- unique index cannot be added to registrations until those rows are
-- reconciled. Reserve one normalized key per email instead: the primary key
-- makes concurrent reservations atomic while preserving all historical rows.
create table if not exists private.registration_email_keys (
  normalized_email text primary key
    check (normalized_email = lower(btrim(normalized_email)))
    check (normalized_email <> '')
);

comment on table private.registration_email_keys is
  'Atomic normalized-email reservations used to prevent duplicate registrations.';

revoke all on table private.registration_email_keys
  from public, anon, authenticated;

insert into private.registration_email_keys (normalized_email)
select distinct lower(btrim(email))
from public.registrations
where email is not null
  and btrim(email) <> ''
on conflict (normalized_email) do nothing;

create or replace function private.reserve_registration_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  clean_email text := lower(pg_catalog.btrim(new.email));
begin
  if clean_email is null or clean_email = '' then
    raise exception using
      errcode = '23514',
      constraint = 'registrations_email_not_blank',
      message = 'Registration email must not be blank.';
  end if;

  -- Updating only the casing or surrounding whitespace keeps the same key.
  if tg_op = 'UPDATE'
     and clean_email = lower(pg_catalog.btrim(old.email)) then
    new.email := clean_email;
    return new;
  end if;

  begin
    insert into private.registration_email_keys (normalized_email)
    values (clean_email);
  exception
    when unique_violation then
      raise exception using
        errcode = '23505',
        constraint = 'registrations_normalized_email_unique',
        message = 'This email is already registered.';
  end;

  new.email := clean_email;
  return new;
end;
$function$;

create or replace function private.release_registration_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  previous_email text := lower(pg_catalog.btrim(old.email));
begin
  if previous_email is not null
     and previous_email <> ''
     and not exists (
       select 1
       from public.registrations
       where lower(pg_catalog.btrim(email)) = previous_email
     ) then
    delete from private.registration_email_keys
    where normalized_email = previous_email;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$function$;

revoke all on function private.reserve_registration_email()
  from public, anon, authenticated;

revoke all on function private.release_registration_email()
  from public, anon, authenticated;

drop trigger if exists registrations_reserve_email
  on public.registrations;

create trigger registrations_reserve_email
before insert or update of email on public.registrations
for each row execute function private.reserve_registration_email();

drop trigger if exists registrations_release_email
  on public.registrations;

create trigger registrations_release_email
after delete or update of email on public.registrations
for each row execute function private.release_registration_email();
