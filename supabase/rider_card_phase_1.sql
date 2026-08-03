-- VELO LEAGUE – Fahrerkarte, Phase 1
-- Sicher mehrfach ausführbar. Bestehende Gruppen, Fahrten und Trikots bleiben unverändert.

alter table public.profiles
  add column if not exists team_name text;

alter table public.group_members
  add column if not exists rider_number integer;

alter table public.group_members
  drop constraint if exists group_members_rider_number_check;

alter table public.group_members
  add constraint group_members_rider_number_check
  check (rider_number is null or rider_number between 1 and 999);

-- Eine Startnummer ist nur innerhalb einer Liga eindeutig.
create unique index if not exists group_members_unique_rider_number
  on public.group_members(group_id, rider_number)
  where rider_number is not null;

-- Bereits vorhandene Mitglieder erhalten in ihrer Liga eine freie Nummer.
with numbered_members as (
  select group_id, user_id,
    row_number() over (partition by group_id order by joined_at asc, user_id asc) as generated_number
  from public.group_members
  where rider_number is null
)
update public.group_members members
set rider_number = numbered_members.generated_number
from numbered_members
where members.group_id = numbered_members.group_id
  and members.user_id = numbered_members.user_id;

-- Neue Mitglieder bekommen automatisch die kleinste freie Nummer.
create or replace function public.assign_group_rider_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate integer := 1;
begin
  if new.rider_number is not null then
    return new;
  end if;

  while exists (
    select 1 from public.group_members
    where group_id = new.group_id and rider_number = candidate
  ) loop
    candidate := candidate + 1;
  end loop;

  new.rider_number := candidate;
  return new;
end;
$$;

drop trigger if exists assign_group_rider_number_before_insert on public.group_members;
create trigger assign_group_rider_number_before_insert
before insert on public.group_members
for each row execute function public.assign_group_rider_number();

-- Basis für dauerhafte Saison-/Karrierekarten. Noch ohne automatische Saisonabrechnung.
create table if not exists public.season_card_snapshots (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  season_year integer not null check (season_year between 2020 and 2100),
  rarity text not null default 'bronze' check (rarity in ('bronze', 'silver', 'gold', 'legend')),
  total_points integer not null default 0,
  wins integer not null default 0,
  kilometers numeric not null default 0,
  elevation_m integer not null default 0,
  titles jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique(group_id, user_id, season_year)
);

alter table public.season_card_snapshots enable row level security;

drop policy if exists "members can read season cards" on public.season_card_snapshots;
create policy "members can read season cards"
on public.season_card_snapshots for select
using (public.is_group_member(group_id));

drop policy if exists "group admins can manage season cards" on public.season_card_snapshots;
create policy "group admins can manage season cards"
on public.season_card_snapshots for all
using (exists (
  select 1 from public.group_members
  where group_id = season_card_snapshots.group_id
    and user_id = auth.uid()
    and role = 'admin'
))
with check (exists (
  select 1 from public.group_members
  where group_id = season_card_snapshots.group_id
    and user_id = auth.uid()
    and role = 'admin'
));
