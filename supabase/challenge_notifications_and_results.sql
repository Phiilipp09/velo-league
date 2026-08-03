-- VELO LEAGUE · Challenge-Benachrichtigungen und Ergebnisse
-- Einmal vollständig im Supabase SQL Editor ausführen.

create or replace function public.notify_challenge(target_challenge_id uuid, action text)
returns void language plpgsql security definer set search_path = public as $$
declare
  challenge_record public.challenges%rowtype;
  notification_title text;
  notification_body text;
  recipient_id uuid;
begin
  select * into challenge_record from public.challenges where id = target_challenge_id;
  if challenge_record.id is null or not public.is_group_member(challenge_record.group_id) then
    raise exception 'Keine Berechtigung für diese Challenge';
  end if;

  if action = 'requested' then
    recipient_id := challenge_record.opponent_id;
    notification_title := 'Neue Challenge-Anfrage';
    notification_body := challenge_record.title || ' · Bitte annehmen oder ablehnen.';

    insert into public.notifications(user_id, group_id, type, title, body)
    values(recipient_id, challenge_record.group_id, 'challenge', notification_title, notification_body);

  elsif action = 'accepted' then
    recipient_id := coalesce(challenge_record.challenger_id, challenge_record.creator_id);
    notification_title := 'Challenge angenommen';
    notification_body := challenge_record.title || ' · Der Fortschritt zählt ab jetzt.';

    insert into public.notifications(user_id, group_id, type, title, body)
    values(recipient_id, challenge_record.group_id, 'challenge', notification_title, notification_body);

  elsif action = 'completed' then
    notification_title := 'Challenge abgeschlossen';
    notification_body := challenge_record.title || ' · ' ||
      coalesce((select display_name from public.profiles where id = challenge_record.winner_id), 'Ein Fahrer') ||
      ' gewinnt ' || coalesce(challenge_record.reward_text, challenge_record.reward, 'den Bonus') || '.';

    -- Beide Teilnehmer erhalten das Ergebnis. Die abgeschlossene Challenge
    -- bleibt zusätzlich dauerhaft im Ergebnisse-Tab sichtbar.
    insert into public.notifications(user_id, group_id, type, title, body)
    select member_id, challenge_record.group_id, 'challenge', notification_title, notification_body
    from unnest(array[coalesce(challenge_record.challenger_id, challenge_record.creator_id), challenge_record.opponent_id]) as member_id
    where member_id is not null;
  end if;
end;
$$;
