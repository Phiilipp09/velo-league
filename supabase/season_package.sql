-- VELO LEAGUE · Saisonpaket (einmal im Supabase SQL Editor ausführen)
create unique index if not exists jersey_history_one_active_per_jersey
  on public.jersey_history(group_id, jersey_key) where lost_at is null;
alter table public.jersey_history enable row level security;
drop policy if exists "jersey history group read" on public.jersey_history;
create policy "jersey history group read" on public.jersey_history for select using (public.is_group_member(group_id));

create or replace function public.sync_jersey_history(target_group_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare key_name text; next_holder uuid; current_holder uuid;
begin
  if not public.is_group_member(target_group_id) then raise exception 'Keine Berechtigung für diese Gruppe'; end if;
  foreach key_name in array array['yellow','polka','white','red','violet'] loop
    next_holder := null;
    if key_name = 'yellow' then
      select user_id into next_holder from public.rides where group_id=target_group_id group by user_id order by sum(points) desc, min(started_at) asc limit 1;
    elsif key_name = 'polka' then
      select user_id into next_holder from public.rides where group_id=target_group_id group by user_id order by sum(elevation_m) desc, min(started_at) asc limit 1;
    elsif key_name = 'red' then
      select user_id into next_holder from public.rides where group_id=target_group_id and started_at >= now() - interval '7 days' group by user_id order by sum(points) desc, min(started_at) asc limit 1;
    elsif key_name = 'violet' then
      select user_id into next_holder from public.rides where group_id=target_group_id and started_at >= now() - interval '30 days' group by user_id order by sum(points) desc, min(started_at) asc limit 1;
    elsif key_name = 'white' then
      select r.user_id into next_holder from public.rides r join public.profiles p on p.id=r.user_id where r.group_id=target_group_id and p.birth_date > (current_date - interval '23 years') group by r.user_id order by sum(r.points) desc, min(r.started_at) asc limit 1;
    end if;
    if next_holder is not null then
      select user_id into current_holder from public.jersey_history where group_id=target_group_id and jersey_key=key_name and lost_at is null;
      if current_holder is distinct from next_holder then
        update public.jersey_history set lost_at=now() where group_id=target_group_id and jersey_key=key_name and lost_at is null;
        insert into public.jersey_history(group_id, jersey_key, user_id, reason) values(target_group_id,key_name,next_holder,'Automatisch aus Gruppenfahrten berechnet');
      end if;
    end if;
  end loop;
end;
$$;
