-- VELO LEAGUE · Reparatur für die Trikot-Historie
-- Einmal vollständig im Supabase SQL Editor ausführen.

alter table public.jersey_history
  drop constraint if exists jersey_history_jersey_key_check;

alter table public.jersey_history
  add constraint jersey_history_jersey_key_check
  check (jersey_key in ('yellow', 'polka', 'green', 'white', 'red', 'violet'));
