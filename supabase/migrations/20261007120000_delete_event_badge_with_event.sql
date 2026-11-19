-- An event's badge now goes with the event, instead of being kept unlinked:
--
-- - Deleting an event deletes its badge, and with it every member's award of
--   that badge (member_badges_badgeid_fkey is already ON DELETE CASCADE).
-- - Removing the badge while editing an event deletes it the same way, so
--   save_event_with_badge's p_unlink_badge becomes p_remove_badge.
--
-- Replaces the behaviour from 20261001120000_badge_event_links_and_save_function.
-- Run once in the Supabase SQL Editor. Wrapped in a transaction so a failure
-- part-way through leaves the database untouched.

begin;

-- Previously ON DELETE SET NULL.
alter table public.badges
  drop constraint if exists badges_eventid_fkey,
  add constraint badges_eventid_fkey
    foreign key (eventid) references public.events (id) on delete cascade;

-- A parameter can't be renamed by CREATE OR REPLACE, so the function is
-- dropped and recreated; the grants below are re-applied for the same reason.
drop function if exists public.save_event_with_badge(jsonb, jsonb, boolean);

-- Creates or updates an event and, optionally, its badge, atomically: if any
-- part fails, nothing is saved.
--
-- p_event: event columns. With an "id" key the event is updated, otherwise it
--   is created. On update, a column whose key is absent is left unchanged,
--   matching PUT /api/admin/events, which omits undefined fields.
-- p_badge: badge columns (name, description, criteria, imageurl, isactive), or
--   null to leave the event's badge as it is. Creates the event's badge if it
--   has none, otherwise updates it. category is always EVENT and eventid is
--   always this event; neither is read from p_badge.
-- p_remove_badge: delete the event's current badge, and with it every
--   member's award of it.
--
-- Returns { event, badge, replaced_event_path, replaced_badge_imageurl,
-- removed_badge_imageurl }. The replaced_* keys hold the previous image when
-- this call swapped it for a new one, and removed_badge_imageurl the image of
-- a badge this call deleted, so the caller can delete those files from
-- storage; otherwise null.
create function public.save_event_with_badge(
  p_event jsonb,
  p_badge jsonb default null,
  p_remove_badge boolean default false
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_event public.events;
  v_old_event public.events;
  v_is_update boolean := p_event ? 'id';
  v_badge public.badges;
  v_old_badge public.badges;
  v_had_badge boolean := false;
  v_has_badge boolean := false;
begin
  if p_badge is not null and p_remove_badge then
    raise exception 'Cannot save and remove a badge in the same call'
      using errcode = '22023';
  end if;

  if v_is_update then
    select * into v_old_event
    from public.events
    where id = (p_event ->> 'id')::uuid
    for update;

    if not found then
      raise exception 'Event % not found', p_event ->> 'id'
        using errcode = 'P0002';
    end if;

    update public.events set
      title = case when p_event ? 'title'
        then p_event ->> 'title' else title end,
      description = case when p_event ? 'description'
        then p_event ->> 'description' else description end,
      start_time = case when p_event ? 'start_time'
        then (p_event ->> 'start_time')::timestamptz else start_time end,
      end_time = case when p_event ? 'end_time'
        then (p_event ->> 'end_time')::timestamptz else end_time end,
      check_in_open_time = case when p_event ? 'check_in_open_time'
        then (p_event ->> 'check_in_open_time')::timestamptz
        else check_in_open_time end,
      check_in_close_time = case when p_event ? 'check_in_close_time'
        then (p_event ->> 'check_in_close_time')::timestamptz
        else check_in_close_time end,
      event_url = case when p_event ? 'event_url'
        then p_event ->> 'event_url' else event_url end,
      event_path = case when p_event ? 'event_path'
        then p_event ->> 'event_path' else event_path end,
      location = case when p_event ? 'location'
        then p_event ->> 'location' else location end,
      capacity = case when p_event ? 'capacity'
        then (p_event ->> 'capacity')::integer else capacity end
    where id = v_old_event.id
    returning * into v_event;
  else
    insert into public.events (
      title,
      description,
      start_time,
      end_time,
      check_in_open_time,
      check_in_close_time,
      event_url,
      event_path,
      location,
      capacity
    )
    values (
      p_event ->> 'title',
      p_event ->> 'description',
      (p_event ->> 'start_time')::timestamptz,
      (p_event ->> 'end_time')::timestamptz,
      (p_event ->> 'check_in_open_time')::timestamptz,
      (p_event ->> 'check_in_close_time')::timestamptz,
      p_event ->> 'event_url',
      p_event ->> 'event_path',
      p_event ->> 'location',
      (p_event ->> 'capacity')::integer
    )
    returning * into v_event;
  end if;

  -- badges.eventid is unique, so an event has at most one badge.
  select * into v_old_badge
  from public.badges
  where eventid = v_event.id
  for update;
  v_had_badge := found;

  if p_remove_badge then
    if v_had_badge then
      -- member_badges_badgeid_fkey cascades, deleting every award of it.
      delete from public.badges where id = v_old_badge.id;
    end if;
  elsif p_badge is not null then
    if v_had_badge then
      update public.badges set
        name = case when p_badge ? 'name'
          then p_badge ->> 'name' else name end,
        description = case when p_badge ? 'description'
          then p_badge ->> 'description' else description end,
        criteria = case when p_badge ? 'criteria'
          then p_badge ->> 'criteria' else criteria end,
        imageurl = case when p_badge ? 'imageurl'
          then p_badge ->> 'imageurl' else imageurl end,
        isactive = case when p_badge ? 'isactive'
          then (p_badge ->> 'isactive')::boolean else isactive end
      where id = v_old_badge.id
      returning * into v_badge;
    else
      insert into public.badges (
        name,
        description,
        criteria,
        imageurl,
        category,
        eventid,
        isactive
      )
      values (
        p_badge ->> 'name',
        p_badge ->> 'description',
        p_badge ->> 'criteria',
        p_badge ->> 'imageurl',
        'EVENT',
        v_event.id,
        coalesce((p_badge ->> 'isactive')::boolean, true)
      )
      returning * into v_badge;
    end if;
    v_has_badge := true;
  elsif v_had_badge then
    v_badge := v_old_badge;
    v_has_badge := true;
  end if;

  return jsonb_build_object(
    'event', to_jsonb(v_event),
    'badge', case when v_has_badge then to_jsonb(v_badge) end,
    'replaced_event_path', case
      when v_is_update
        and v_old_event.event_path is distinct from v_event.event_path
      then v_old_event.event_path
    end,
    'replaced_badge_imageurl', case
      when v_had_badge
        and p_badge is not null
        and v_old_badge.imageurl is distinct from v_badge.imageurl
      then v_old_badge.imageurl
    end,
    'removed_badge_imageurl', case
      when v_had_badge and p_remove_badge
      then v_old_badge.imageurl
    end
  );
end;
$$;

-- Supabase grants EXECUTE on new public functions to anon and authenticated
-- by default, which would let anyone call this with the public key and skip
-- the admin check. Only the server (service role) may call it.
revoke all on function public.save_event_with_badge(jsonb, jsonb, boolean)
  from public, anon, authenticated;
grant execute on function public.save_event_with_badge(jsonb, jsonb, boolean)
  to service_role;

commit;
