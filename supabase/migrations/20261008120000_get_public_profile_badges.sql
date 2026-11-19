-- Lets the public profile page (/profile/[id]) load a member's badges.
--
-- member_badges.memberid refers to registrations.id, but anon can't read
-- public_profiles.registration_id, so the page can't get from a public profile
-- to its badges by itself. This function does that step in the database and
-- returns the awards without memberid, so the registration id never reaches
-- the browser.
--
-- Only visible profiles are found: hiding a profile deletes its
-- public_profiles row.
--
-- Run once in the Supabase SQL Editor.

create or replace function public.get_public_profile_badges(p_profile_id uuid)
returns table (
  id uuid,
  badgeid uuid,
  awardedat timestamptz,
  badge jsonb
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    member_award.id,
    member_award.badgeid,
    member_award.awardedat,
    pg_catalog.to_jsonb(awarded_badge)
  from public.public_profiles as visible_profile
  join public.member_badges as member_award
    on member_award.memberid = visible_profile.registration_id
  join public.badges as awarded_badge
    on awarded_badge.id = member_award.badgeid
  where visible_profile.id = p_profile_id
  order by member_award.awardedat desc;
$function$;

comment on function public.get_public_profile_badges(uuid) is
  'Returns the badges of a visible public profile, without exposing its registration id.';

revoke all on function public.get_public_profile_badges(uuid)
  from public;

grant execute on function public.get_public_profile_badges(uuid)
  to anon, authenticated, service_role;
