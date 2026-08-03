-- Einmal im Supabase SQL Editor ausführen: Wochenende-Testlauf Reparaturen
alter table public.challenges add column if not exists creator_id uuid references public.profiles(id) on delete cascade;
update public.challenges set creator_id = challenger_id where creator_id is null;
alter table public.challenges alter column creator_id set not null;

create table if not exists public.group_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  details text,
  created_at timestamptz not null default now()
);
create table if not exists public.event_rsvps (
  event_id uuid not null references public.group_events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null check (status in ('accepted','declined','pending')) default 'pending',
  primary key (event_id,user_id)
);
alter table public.group_events enable row level security;
alter table public.event_rsvps enable row level security;
drop policy if exists "events group read" on public.group_events;
drop policy if exists "events member create" on public.group_events;
create policy "events group read" on public.group_events for select using (public.is_group_member(group_id));
create policy "events member create" on public.group_events for insert with check (creator_id=auth.uid() and public.is_group_member(group_id));
drop policy if exists "event rsvp group read" on public.event_rsvps;
drop policy if exists "event rsvp own write" on public.event_rsvps;
create policy "event rsvp group read" on public.event_rsvps for select using (exists(select 1 from public.group_events where id=event_id and public.is_group_member(group_id)));
create policy "event rsvp own write" on public.event_rsvps for all using (user_id=auth.uid()) with check (user_id=auth.uid());

drop policy if exists "rides own delete" on public.rides;
create policy "rides own delete" on public.rides for delete using (user_id = auth.uid());

drop policy if exists "members owner manage" on public.group_members;
create policy "members owner manage" on public.group_members for update using (exists(select 1 from public.groups where id=group_id and owner_id=auth.uid()));
create policy "members self leave or owner remove" on public.group_members for delete using (user_id=auth.uid() or exists(select 1 from public.groups where id=group_id and owner_id=auth.uid()));
