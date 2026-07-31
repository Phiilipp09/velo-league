-- VELO LEAGUE · gemeinsamer Testlauf (einmal im Supabase SQL Editor ausführen)
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  birth_date date,
  gender text,
  height_cm integer,
  weight_kg numeric(5,1),
  rider_level text default 'Fortgeschritten',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 3 and 80),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  invite_code text not null unique default encode(gen_random_bytes(6), 'hex'),
  is_private boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin','member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create table if not exists public.rides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid references public.groups(id) on delete set null,
  source text not null check (source in ('manual','strava')),
  external_id text unique,
  title text not null,
  distance_m integer not null check (distance_m >= 0),
  elevation_m integer not null default 0 check (elevation_m >= 0),
  moving_time_s integer,
  started_at timestamptz not null default now(),
  points integer not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  challenger_id uuid not null references public.profiles(id) on delete cascade,
  opponent_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  goal text not null,
  reward text,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled','completed')),
  ends_at date,
  created_at timestamptz not null default now()
);
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Ergänzt die bereits angelegte Test-Schema-Version, falls vorhanden.
alter table public.profiles add column if not exists birth_date date;
alter table public.profiles add column if not exists gender text;
alter table public.profiles add column if not exists height_cm integer;
alter table public.profiles add column if not exists weight_kg numeric(5,1);
alter table public.profiles add column if not exists rider_level text default 'Fortgeschritten';
alter table public.profiles add column if not exists updated_at timestamptz not null default now();
alter table public.profiles add column if not exists onboarding_completed boolean not null default false;
alter table public.rides add column if not exists moving_time_s integer;
alter table public.rides add column if not exists created_at timestamptz not null default now();
-- Die erste Testversion hatte bereits eine Challenges-Tabelle, allerdings
-- mit einem kleineren Spaltensatz. Diese Ergänzungen machen sie kompatibel.
alter table public.challenges add column if not exists group_id uuid references public.groups(id) on delete cascade;
alter table public.challenges add column if not exists challenger_id uuid references public.profiles(id) on delete cascade;
alter table public.challenges add column if not exists opponent_id uuid references public.profiles(id) on delete cascade;
alter table public.challenges add column if not exists goal text;
alter table public.challenges add column if not exists reward text;
alter table public.challenges add column if not exists status text default 'pending';
alter table public.challenges add column if not exists ends_at date;

-- Reparatur fÃ¼r die erste Test-Schema-Version: sie verwendete noch eine
-- andere Rollenbezeichnung und blockierte dadurch die Gruppenerstellung.
alter table public.group_members drop constraint if exists group_members_role_check;
alter table public.group_members add constraint group_members_role_check check (role in ('admin', 'member'));
insert into public.group_members (group_id, user_id, role)
select groups.id, groups.owner_id, 'admin'
from public.groups as groups
left join public.group_members as members on members.group_id = groups.id and members.user_id = groups.owner_id
where members.user_id is null
on conflict (group_id, user_id) do nothing;

create or replace function public.is_group_member(target_group_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.group_members where group_id = target_group_id and user_id = auth.uid());
$$;
create or replace function public.join_group_by_invite(code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare target uuid;
begin
  select id into target from public.groups where invite_code = code;
  if target is null then raise exception 'Ungültiger Einladungslink'; end if;
  insert into public.group_members(group_id, user_id) values (target, auth.uid()) on conflict do nothing;
  return target;
end;
$$;

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.rides enable row level security;
alter table public.challenges enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "profiles own read" on public.profiles;
drop policy if exists "profiles own write" on public.profiles;
drop policy if exists "profiles shared group read" on public.profiles;
create policy "profiles own read" on public.profiles for select using (id = auth.uid());
create policy "profiles shared group read" on public.profiles for select using (exists (select 1 from public.group_members mine join public.group_members theirs on mine.group_id = theirs.group_id where mine.user_id = auth.uid() and theirs.user_id = profiles.id));
create policy "profiles own write" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "groups members read" on public.groups;
drop policy if exists "groups owner create" on public.groups;
drop policy if exists "groups owner update" on public.groups;
create policy "groups members read" on public.groups for select using (owner_id = auth.uid() or public.is_group_member(id));
create policy "groups owner create" on public.groups for insert with check (owner_id = auth.uid());
create policy "groups owner update" on public.groups for update using (owner_id = auth.uid());

drop policy if exists "members group read" on public.group_members;
drop policy if exists "members owner add" on public.group_members;
create policy "members group read" on public.group_members for select using (public.is_group_member(group_id));
create policy "members owner add" on public.group_members for insert with check (user_id = auth.uid() or exists(select 1 from public.groups where id = group_id and owner_id = auth.uid()));

drop policy if exists "rides group read" on public.rides;
drop policy if exists "rides member add" on public.rides;
create policy "rides group read" on public.rides for select using (group_id is null and user_id = auth.uid() or public.is_group_member(group_id));
create policy "rides member add" on public.rides for insert with check (user_id = auth.uid() and (group_id is null or public.is_group_member(group_id)));

drop policy if exists "challenges group read" on public.challenges;
drop policy if exists "challenges member add" on public.challenges;
drop policy if exists "challenges participants update" on public.challenges;
create policy "challenges group read" on public.challenges for select using (public.is_group_member(group_id));
create policy "challenges member add" on public.challenges for insert with check (challenger_id = auth.uid() and public.is_group_member(group_id));
create policy "challenges participants update" on public.challenges for update using (challenger_id = auth.uid() or opponent_id = auth.uid());

drop policy if exists "notifications own" on public.notifications;
create policy "notifications own" on public.notifications for all using (user_id = auth.uid()) with check (user_id = auth.uid());
