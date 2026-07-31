-- Einmal im Supabase SQL Editor ausführen.
-- Repariert die Gruppenrollen der frühen Testdaten und ergänzt den Onboarding-Status.
alter table public.group_members drop constraint if exists group_members_role_check;
alter table public.group_members add constraint group_members_role_check check (role in ('admin', 'member'));

insert into public.group_members (group_id, user_id, role)
select groups.id, groups.owner_id, 'admin'
from public.groups as groups
left join public.group_members as members
  on members.group_id = groups.id and members.user_id = groups.owner_id
where members.user_id is null
on conflict (group_id, user_id) do nothing;

alter table public.profiles add column if not exists onboarding_completed boolean not null default false;
