drop function if exists public.search_public_profiles(text, integer);

create or replace function public.search_public_profiles(
  search_query text,
  max_results integer default 8,
  excluded_wallet text default null
)
returns table (
  id uuid,
  display_name text,
  unique_name text,
  profile_picture_url text,
  wallet_suffix text,
  badges text[],
  events_attended text[],
  match_score real
)
language sql
stable
security definer
set search_path = ''
as $function$
  with normalized_inputs as (
    select
      lower(
        pg_catalog.regexp_replace(
          pg_catalog.btrim(coalesce(search_query, '')),
          '\s+',
          ' ',
          'g'
        )
      ) as query_value,
      case
        when lower(pg_catalog.btrim(coalesce(excluded_wallet, '')))
          ~ '^0x[0-9a-f]{40}$'
        then lower(pg_catalog.btrim(excluded_wallet))
        else null
      end as excluded_wallet_value
  ),
  ranked_profiles as (
    select
      p.id,
      p.display_name,
      p.unique_name,
      p.profile_picture_url,
      p.wallet_suffix,
      p.badges,
      p.events_attended,
      greatest(
        extensions.similarity(p.search_text, inputs.query_value),
        extensions.word_similarity(inputs.query_value, p.search_text),
        case
          when lower(coalesce(p.unique_name, '')) = inputs.query_value then 1.0
          when lower(p.display_name) = inputs.query_value then 1.0
          when pg_catalog.length(inputs.query_value) >= 4
            and p.wallet_suffix = pg_catalog.right(inputs.query_value, 4) then 1.0
          when lower(coalesce(p.unique_name, '')) like inputs.query_value || '%' then 0.92
          when lower(p.display_name) like inputs.query_value || '%' then 0.88
          else 0.0
        end
      )::real as match_score
    from public.public_profiles p
    cross join normalized_inputs inputs
    where pg_catalog.char_length(inputs.query_value) between 2 and 64
      and not exists (
        select 1
        from public.registrations registration
        where registration.id = p.registration_id
          and inputs.excluded_wallet_value is not null
          and lower(pg_catalog.btrim(registration.wallet_id))
            = inputs.excluded_wallet_value
      )
      and (
        lower(coalesce(p.unique_name, '')) = inputs.query_value
        or lower(p.display_name) = inputs.query_value
        or lower(coalesce(p.unique_name, '')) like inputs.query_value || '%'
        or lower(p.display_name) like inputs.query_value || '%'
        or (
          pg_catalog.length(inputs.query_value) >= 4
          and p.wallet_suffix = pg_catalog.right(inputs.query_value, 4)
        )
        or p.search_text operator(extensions.%) inputs.query_value
        or extensions.word_similarity(inputs.query_value, p.search_text) >= 0.45
      )
  )
  select
    ranked_profiles.id,
    ranked_profiles.display_name,
    ranked_profiles.unique_name,
    ranked_profiles.profile_picture_url,
    ranked_profiles.wallet_suffix,
    ranked_profiles.badges,
    ranked_profiles.events_attended,
    ranked_profiles.match_score
  from ranked_profiles
  order by
    ranked_profiles.match_score desc,
    lower(coalesce(ranked_profiles.unique_name, ranked_profiles.display_name)),
    ranked_profiles.id
  limit least(greatest(coalesce(max_results, 8), 1), 8);
$function$;

comment on function public.search_public_profiles(text, integer, text) is
  'Searches public profiles while optionally excluding the profile linked to a wallet address.';

revoke all on function public.search_public_profiles(text, integer, text)
  from public;

grant execute on function public.search_public_profiles(text, integer, text)
  to anon, authenticated, service_role;
