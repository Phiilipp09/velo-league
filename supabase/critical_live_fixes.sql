-- VELO LEAGUE · Kritische Live-Reparatur (einmal im Supabase SQL Editor ausführen)
--
-- Ordnet alte Fahrten ohne Gruppe genau dann der einzigen Gruppe des Fahrers zu,
-- wenn die Zuordnung eindeutig ist. Fahrer mit mehreren Gruppen bleiben bewusst
-- unverändert, damit keine Fahrt versehentlich der falschen Liga zugeordnet wird.
with single_group as (
  select user_id, (array_agg(group_id))[1] as group_id
  from public.group_members
  group by user_id
  having count(*) = 1
)
update public.rides as rides
set group_id = single_group.group_id
from single_group
where rides.user_id = single_group.user_id
  and rides.group_id is null;
