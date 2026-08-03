-- VELO LEAGUE · Trikotwechsel-Challenges (einmal im Supabase SQL Editor ausführen)
-- Ergänzt Punkte-Duelle und stellt sicher, dass das Trikot nur bei echter Führung wechselt.
create or replace function public.complete_challenge(target_challenge_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare c public.challenges%rowtype; challenger_value numeric; opponent_value numeric; winner uuid; bonus integer;
begin
  select * into c from public.challenges where id=target_challenge_id;
  if c.id is null or not public.is_group_member(c.group_id) then raise exception 'Keine Berechtigung für diese Challenge'; end if;
  if c.status='completed' then return c.winner_id; end if;
  if c.status<>'accepted' then return null; end if;

  -- Bei einer Trikotwechsel-Challenge zählt die echte Gesamtwertung der beiden Fahrer.
  if c.challenge_type='jersey' then
    if c.target_unit='hm' then
      select coalesce(sum(elevation_m),0) into challenger_value from public.rides where group_id=c.group_id and user_id=c.challenger_id;
      select coalesce(sum(elevation_m),0) into opponent_value from public.rides where group_id=c.group_id and user_id=c.opponent_id;
    else
      select coalesce(sum(points),0) into challenger_value from public.rides where group_id=c.group_id and user_id=c.challenger_id;
      select coalesce(sum(points),0) into opponent_value from public.rides where group_id=c.group_id and user_id=c.opponent_id;
    end if;
    if challenger_value <= opponent_value then return null; end if;
    winner := c.challenger_id;
  else
    if c.target_unit='hm' then
      select coalesce(sum(elevation_m),0) into challenger_value from public.rides where group_id=c.group_id and user_id=c.challenger_id and started_at>=c.starts_at and started_at<=c.ends_at;
      select coalesce(sum(elevation_m),0) into opponent_value from public.rides where group_id=c.group_id and user_id=c.opponent_id and started_at>=c.starts_at and started_at<=c.ends_at;
    elsif c.target_unit='pts' then
      select coalesce(sum(points),0) into challenger_value from public.rides where group_id=c.group_id and user_id=c.challenger_id and started_at>=c.starts_at and started_at<=c.ends_at;
      select coalesce(sum(points),0) into opponent_value from public.rides where group_id=c.group_id and user_id=c.opponent_id and started_at>=c.starts_at and started_at<=c.ends_at;
    else
      select coalesce(sum(distance_m)/1000.0,0) into challenger_value from public.rides where group_id=c.group_id and user_id=c.challenger_id and started_at>=c.starts_at and started_at<=c.ends_at;
      select coalesce(sum(distance_m)/1000.0,0) into opponent_value from public.rides where group_id=c.group_id and user_id=c.opponent_id and started_at>=c.starts_at and started_at<=c.ends_at;
    end if;
    if challenger_value<c.target_value and opponent_value<c.target_value then return null; end if;
    winner := case when challenger_value>=c.target_value and opponent_value>=c.target_value then case when challenger_value>=opponent_value then c.challenger_id else c.opponent_id end when challenger_value>=c.target_value then c.challenger_id else c.opponent_id end;
  end if;

  bonus := coalesce(nullif(regexp_replace(coalesce(c.reward_text,c.reward,''),'\D','','g'),''),'100')::integer;
  update public.challenges set status='completed', winner_id=winner, completed_at=now() where id=c.id;
  insert into public.season_point_adjustments(group_id,user_id,challenge_id,points,reason) values(c.group_id,winner,c.id,bonus,'Challenge-Sieg: '||c.title) on conflict(challenge_id) do nothing;
  perform public.sync_jersey_history(c.group_id);
  return winner;
end;
$$;
