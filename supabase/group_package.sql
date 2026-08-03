-- VELO LEAGUE · Gruppenpaket (einmal im Supabase SQL Editor ausführen)
create or replace function public.notify_group_event(target_event_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare event_group uuid; event_title text; event_creator uuid;
begin
  select group_id, title, creator_id into event_group, event_title, event_creator from public.group_events where id=target_event_id;
  if event_group is null or not public.is_group_member(event_group) then raise exception 'Keine Berechtigung für diesen Termin'; end if;
  insert into public.notifications(user_id, type, title, body)
  select user_id, 'event', 'Neuer Gruppentermin', event_title || ' · Bitte zusagen oder absagen.'
  from public.group_members where group_id=event_group and user_id<>event_creator;
end;
$$;
