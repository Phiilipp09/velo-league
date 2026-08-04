-- VELO LEAGUE: Fahrerkarte – Leistungsprofil & Bike
-- Erst ausführen, wenn das vorbereitete Profil-Paket veröffentlicht werden soll.

alter table public.profiles
  add column if not exists bike_brand text,
  add column if not exists bike_model text,
  add column if not exists bike_type text;
