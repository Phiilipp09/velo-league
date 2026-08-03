-- VELO LEAGUE · Benachrichtigungen sauber an Gruppen binden
-- Einmal vollständig im Supabase SQL Editor ausführen.

alter table public.notifications
  add column if not exists group_id uuid references public.groups(id) on delete cascade;

-- Frühere Hinweise haben keine Gruppen-ID und können deshalb nach einem
-- Gruppenwechsel nicht sicher zugeordnet werden. Sie werden einmalig entfernt.
delete from public.notifications where group_id is null;

alter table public.notifications
  alter column group_id set not null;

create index if not exists notifications_user_group_created_idx
  on public.notifications(user_id, group_id, created_at desc)
  where read_at is null;

create or replace function public.notify_group_event(target_event_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare event_group uuid; event_title text; event_creator uuid;
begin
  select group_id, title, creator_id
  into event_group, event_title, event_creator
  from public.group_events
  where id = target_event_id;

  if event_group is null or not public.is_group_member(event_group) then
    raise exception 'Keine Berechtigung für diesen Termin';
  end if;

  insert into public.notifications(user_id, group_id, type, title, body)
  select user_id, event_group, 'event', 'Neuer Gruppentermin', event_title || ' · Bitte zusagen oder absagen.'
  from public.group_members
  where group_id = event_group and user_id <> event_creator;
end;
$$;

create or replace function public.notify_challenge(target_challenge_id uuid, action text)
returns void language plpgsql security definer set search_path = public as $$
declare target_user uuid; challenge_title text; target_group uuid; notification_title text;
begin
  select group_id, title
  into target_group, challenge_title
  from public.challenges
  where id = target_challenge_id;

  if target_group is null or not public.is_group_member(target_group) then
    raise exception 'Keine Berechtigung für diese Challenge';
  end if;

  if action = 'requested' then
    select opponent_id into target_user from public.challenges where id = target_challenge_id;
    notification_title := 'Neue Challenge-Anfrage';
  elsif action = 'accepted' then
    select coalesce(challenger_id, creator_id) into target_user from public.challenges where id = target_challenge_id;
    notification_title := 'Challenge angenommen';
  else
    select case when coalesce(challenger_id, creator_id) = auth.uid() then opponent_id else coalesce(challenger_id, creator_id) end
    into target_user
    from public.challenges
    where id = target_challenge_id;
    notification_title := 'Challenge abgeschlossen';
  end if;

  if target_user is not null and target_user <> auth.uid() then
    insert into public.notifications(user_id, group_id, type, title, body)
    values(target_user, target_group, 'challenge', notification_title, challenge_title);
  end if;
end;
$$;
