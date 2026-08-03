-- VELO LEAGUE - Saisonabschluss für Fahrerkarte
-- Einmal im Supabase SQL Editor ausführen.
-- Erzeugt für jedes Gruppenmitglied eine unveränderliche Saisonkarte.

alter table public.groups add column if not exists season_name text;
alter table public.groups add column if not exists season_year integer;
alter table public.groups add column if not exists season_ends_at date;
alter table public.groups add column if not exists season_closed_at timestamptz;

create table if not exists public.season_closures (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  season_year integer not null check (season_year between 2020 and 2100),
  season_name text not null,
  closed_by uuid not null references public.profiles(id),
  closed_at timestamptz not null default now(),
  winner_id uuid references public.profiles(id) on delete set null,
  unique(group_id, season_year)
);

alter table public.season_closures enable row level security;
drop policy if exists "members can read season closures" on public.season_closures;
create policy "members can read season closures"
on public.season_closures for select
using (public.is_group_member(group_id));

create or replace function public.close_group_season(
  target_group_id uuid,
  target_year integer default extract(year from current_date)::integer,
  target_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  closure_id uuid;
  champion_id uuid;
  safe_name text;
  configured_end date;
  season_start timestamptz := make_timestamptz(target_year, 1, 1, 0, 0, 0);
  season_end timestamptz;
begin
  if not exists (
    select 1 from public.group_members
    where group_id = target_group_id and user_id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Nur Gruppen-Admins können eine Saison abschließen.';
  end if;

  if exists (select 1 from public.season_closures where group_id = target_group_id and season_year = target_year) then
    raise exception 'Diese Saison wurde bereits abgeschlossen.';
  end if;

  safe_name := coalesce(nullif(trim(target_name), ''), 'Saison ' || target_year);
  select season_ends_at into configured_end from public.groups where id = target_group_id;
  season_end := case
    when configured_end is not null and extract(year from configured_end) = target_year then configured_end::timestamptz + interval '1 day'
    else make_timestamptz(target_year + 1, 1, 1, 0, 0, 0)
  end;

  with member_scores as (
    select
      member.user_id,
      coalesce(sum(ride.points) filter (where ride.started_at >= season_start and ride.started_at < season_end), 0)::integer
        + coalesce((select sum(points)::integer from public.season_point_adjustments adjustment where adjustment.group_id = target_group_id and adjustment.user_id = member.user_id and adjustment.created_at >= season_start and adjustment.created_at < season_end), 0) as total_points,
      coalesce(sum(ride.distance_m) filter (where ride.started_at >= season_start and ride.started_at < season_end), 0) / 1000.0 as kilometers,
      coalesce(sum(ride.elevation_m) filter (where ride.started_at >= season_start and ride.started_at < season_end), 0)::integer as elevation_m,
      coalesce((select count(*)::integer from public.challenges challenge where challenge.group_id = target_group_id and challenge.winner_id = member.user_id and challenge.status = 'completed' and challenge.completed_at >= season_start and challenge.completed_at < season_end), 0) as wins,
      profile.birth_date
    from public.group_members member
    join public.profiles profile on profile.id = member.user_id
    left join public.rides ride on ride.group_id = target_group_id and ride.user_id = member.user_id
    where member.group_id = target_group_id
    group by member.user_id, profile.birth_date
  ), ranked as (
    select *,
      dense_rank() over (order by total_points desc, elevation_m desc) as points_rank,
      dense_rank() over (order by elevation_m desc, total_points desc) as mountain_rank,
      dense_rank() over (
        order by case when birth_date > (make_date(target_year, 12, 31) - interval '23 years') then total_points else -1 end desc,
        case when birth_date > (make_date(target_year, 12, 31) - interval '23 years') then elevation_m else -1 end desc
      ) as young_rank
    from member_scores
  ), cards as (
    select *,
      array_remove(array[
        case when points_rank = 1 and total_points > 0 then 'Season Champion' end,
        case when mountain_rank = 1 and elevation_m > 0 then 'King of the Mountains' end,
        case when birth_date > (make_date(target_year, 12, 31) - interval '23 years') and young_rank = 1 and total_points > 0 then 'Best Young Rider' end
      ], null) as titles
    from ranked
  )
  insert into public.season_card_snapshots(group_id, user_id, season_year, rarity, total_points, wins, kilometers, elevation_m, titles)
  select target_group_id, user_id, target_year,
    case when total_points >= 2500 then 'legend' when total_points >= 1200 then 'gold' when total_points >= 500 then 'silver' else 'bronze' end,
    total_points, wins, kilometers, elevation_m, to_jsonb(titles)
  from cards;

  select user_id into champion_id
  from public.season_card_snapshots
  where group_id = target_group_id and season_year = target_year
  order by total_points desc, elevation_m desc, user_id asc
  limit 1;

  insert into public.season_closures(group_id, season_year, season_name, closed_by, winner_id)
  values(target_group_id, target_year, safe_name, auth.uid(), champion_id)
  returning id into closure_id;

  update public.groups
  set season_name = safe_name,
      season_year = target_year,
      season_ends_at = coalesce(configured_end, (season_end - interval '1 day')::date),
      season_closed_at = now()
  where id = target_group_id;

  insert into public.notifications(user_id, group_id, type, title, body)
  select member.user_id, target_group_id, 'season', 'Saison abgeschlossen', safe_name || ' wurde abgeschlossen. Deine Fahrerkarte ist jetzt im Karrierearchiv.'
  from public.group_members member
  where member.group_id = target_group_id;

  return closure_id;
end;
$$;
