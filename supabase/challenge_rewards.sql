-- VELO LEAGUE · Challenge-Gewinner und Bonuspunkte (einmal ausführen)
alter table public.challenges add column if not exists winner_id uuid references public.profiles(id) on delete set null;
alter table public.challenges add column if not exists completed_at timestamptz;
create table if not exists public.season_point_adjustments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  challenge_id uuid unique references public.challenges(id) on delete cascade,
  points integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);
alter table public.season_point_adjustments enable row level security;
drop policy if exists "point adjustments group read" on public.season_point_adjustments;
create policy "point adjustments group read" on public.season_point_adjustments for select using (public.is_group_member(group_id));

create or replace function public.complete_challenge(target_challenge_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare c public.challenges%rowtype; challenger_value numeric; opponent_value numeric; winner uuid; bonus integer;
begin
  select * into c from public.challenges where id=target_challenge_id;
  if c.id is null or not public.is_group_member(c.group_id) then raise exception 'Keine Berechtigung für diese Challenge'; end if;
  if c.status='completed' then return c.winner_id; end if;
  if c.status<>'accepted' then return null; end if;
  if c.target_unit='hm' then
    select coalesce(sum(elevation_m),0) into challenger_value from public.rides where group_id=c.group_id and user_id=c.challenger_id and started_at>=c.starts_at and started_at<=c.ends_at;
    select coalesce(sum(elevation_m),0) into opponent_value from public.rides where group_id=c.group_id and user_id=c.opponent_id and started_at>=c.starts_at and started_at<=c.ends_at;
  else
    select coalesce(sum(distance_m)/1000.0,0) into challenger_value from public.rides where group_id=c.group_id and user_id=c.challenger_id and started_at>=c.starts_at and started_at<=c.ends_at;
    select coalesce(sum(distance_m)/1000.0,0) into opponent_value from public.rides where group_id=c.group_id and user_id=c.opponent_id and started_at>=c.starts_at and started_at<=c.ends_at;
  end if;
  if challenger_value<c.target_value and opponent_value<c.target_value then return null; end if;
  winner := case when challenger_value>=c.target_value and opponent_value>=c.target_value then case when challenger_value>=opponent_value then c.challenger_id else c.opponent_id end when challenger_value>=c.target_value then c.challenger_id else c.opponent_id end;
  bonus := coalesce(nullif(regexp_replace(coalesce(c.reward_text,c.reward,''),'\D','','g'),''),'100')::integer;
  update public.challenges set status='completed', winner_id=winner, completed_at=now() where id=c.id;
  insert into public.season_point_adjustments(group_id,user_id,challenge_id,points,reason) values(c.group_id,winner,c.id,bonus,'Challenge-Sieg: '||c.title) on conflict(challenge_id) do nothing;
  return winner;
end;
$$;
