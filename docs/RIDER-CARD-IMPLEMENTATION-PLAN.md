# VELO LEAGUE – Fahrerkarte

## Zielbild

Die Fahrerkarte ist die sportliche Identität eines Fahrers innerhalb einer Liga. Sie nutzt nur echte, bereits vorhandene Gruppen-, Fahrten-, Punkte- und Trikotdaten. Es gibt keine kaufbaren Vorteile.

## Phase 1 (dieser Schritt)

- responsive Hauptkarte auf der Profilseite
- eindeutige Startnummer je Liga
- aktuelles Trikot als Farbwelt
- echte Saisonwerte: Punkte, Fahrten, Kilometer und Höhenmeter
- Profilbild als Initialen-Avatar, bis Nutzerfotos ergänzt werden
- optionaler Teamname im Profil; ohne Angabe erscheint „Independent Riders“
- Datenfundament für spätere Saison-Snapshots

## Spätere Phasen

1. Abschluss einer Saison erzeugt dauerhaft eine Saisonkarte.
2. Karriereansicht, Hall of Fame und Titelhistorie.
3. Spezielle Trikotkarten, die sich aus den aktuellen Wertungen ableiten.
4. PNG-/Story-Export und Teilen.
5. Echte Teams als eigenes Liga-Modul, falls gewünscht.

## Datenquellen

| Kartenwert | Quelle |
| --- | --- |
| Name / Avatar / Team | `profiles` |
| Liga / Startnummer | `groups`, `group_members` |
| Punkte / Kilometer / Höhenmeter | `rides`, `season_point_adjustments` |
| Aktuelles Trikot | bestehende `seasonRules` |
| spätere Karrierekarte | `season_card_snapshots` |

## Migration

Vor dem Live-Test von Phase 1 muss `supabase/rider_card_phase_1.sql` einmal im Supabase SQL Editor ausgeführt werden. Sie ist so geschrieben, dass bestehende Testdaten erhalten bleiben.
