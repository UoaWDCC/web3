alter table public.registrations
  add column if not exists profile_visible boolean not null default true;

comment on column public.registrations.profile_visible is
  'Controls whether the wallet-linked registration is published to public_profiles and discoverable in member search.';

create unique index if not exists registrations_normalized_wallet_unique
  on public.registrations (lower(btrim(wallet_id)))
  where wallet_id is not null
    and lower(btrim(wallet_id)) ~ '^0x[0-9a-f]{40}$';

create table if not exists private.profile_visibility_nonces (
  nonce_hash text primary key
    check (nonce_hash ~ '^[0-9a-f]{64}$'),
  wallet_address text not null
    check (wallet_address ~ '^0x[0-9a-f]{40}$'),
  requested_visibility boolean not null,
  expires_at timestamptz not null,
  consumed_at timestamptz not null default now()
);

comment on table private.profile_visibility_nonces is
  'One-time nonce hashes consumed by wallet-signed profile visibility changes.';

create index if not exists profile_visibility_nonces_expires_at_idx
  on private.profile_visibility_nonces (expires_at);

revoke all on table private.profile_visibility_nonces
  from public, anon, authenticated;

revoke update on table public.registrations
  from public, anon, authenticated;

grant update (
  unique_name,
  profile_picture_path,
  profile_picture_url,
  badges,
  events_attended
) on table public.registrations
  to anon, authenticated;

revoke delete, truncate, references, trigger
  on table public.registrations
  from public, anon, authenticated;

create or replace function private.sync_public_profile_from_registration()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if tg_op = 'DELETE' then
    delete from public.public_profiles
    where registration_id = old.id;
    return old;
  end if;

  if new.profile_visible is false
     or not coalesce(
       lower(btrim(new.wallet_id)) ~ '^0x[0-9a-f]{40}$',
       false
     ) then
    delete from public.public_profiles
    where registration_id = new.id;
    return new;
  end if;

  insert into public.public_profiles (
    registration_id,
    display_name,
    unique_name,
    profile_picture_url,
    wallet_suffix,
    badges,
    events_attended,
    search_text,
    created_at,
    updated_at
  )
  values (
    new.id,
    coalesce(
      nullif(btrim(concat_ws(' ', new.first_name, new.last_name)), ''),
      nullif(btrim(new.unique_name), ''),
      'Unnamed profile'
    ),
    nullif(btrim(new.unique_name), ''),
    new.profile_picture_url,
    right(lower(btrim(new.wallet_id)), 4),
    coalesce(new.badges, '{}'::text[]),
    coalesce(new.events_attended, '{}'::text[]),
    lower(btrim(concat_ws(
      ' ',
      nullif(btrim(new.unique_name), ''),
      nullif(btrim(new.first_name), ''),
      nullif(btrim(new.last_name), '')
    ))),
    coalesce(new.created_at, now()),
    now()
  )
  on conflict (registration_id) do update
  set display_name = excluded.display_name,
      unique_name = excluded.unique_name,
      profile_picture_url = excluded.profile_picture_url,
      wallet_suffix = excluded.wallet_suffix,
      badges = excluded.badges,
      events_attended = excluded.events_attended,
      search_text = excluded.search_text,
      updated_at = excluded.updated_at;

  return new;
end;
$function$;

create or replace function public.apply_profile_visibility_change(
  input_wallet text,
  input_visibility boolean,
  input_nonce_hash text,
  input_expires_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  clean_wallet text := lower(btrim(input_wallet));
  registration_row_id bigint;
  inserted_nonce text;
begin
  if clean_wallet is null
     or clean_wallet !~ '^0x[0-9a-f]{40}$'
     or input_visibility is null
     or input_nonce_hash is null
     or input_nonce_hash !~ '^[0-9a-f]{64}$'
     or input_expires_at is null
     or input_expires_at <= now()
     or input_expires_at > now() + interval '6 minutes' then
    return false;
  end if;

  select id
    into registration_row_id
  from public.registrations
  where lower(btrim(wallet_id)) = clean_wallet
  for update;

  if registration_row_id is null then
    return false;
  end if;

  delete from private.profile_visibility_nonces
  where expires_at <= now();

  insert into private.profile_visibility_nonces (
    nonce_hash,
    wallet_address,
    requested_visibility,
    expires_at
  )
  values (
    input_nonce_hash,
    clean_wallet,
    input_visibility,
    input_expires_at
  )
  on conflict (nonce_hash) do nothing
  returning nonce_hash into inserted_nonce;

  if inserted_nonce is null then
    return false;
  end if;

  update public.registrations
  set profile_visible = input_visibility
  where id = registration_row_id;

  return true;
end;
$function$;

comment on function public.apply_profile_visibility_change(
  text,
  boolean,
  text,
  timestamptz
) is
  'Service-role-only RPC that consumes a one-time, wallet-verified nonce and updates profile search visibility.';

revoke all on function public.apply_profile_visibility_change(
  text,
  boolean,
  text,
  timestamptz
) from public, anon, authenticated;

grant execute on function public.apply_profile_visibility_change(
  text,
  boolean,
  text,
  timestamptz
) to service_role;
