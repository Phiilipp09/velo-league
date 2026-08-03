# VELO LEAGUE - Fahrerkarte

## Zielbild

Die Fahrerkarte ist die sportliche Identität eines Fahrers innerhalb einer Liga. Sie verwendet nur echte Gruppen-, Fahrten-, Punkte- und Trikotdaten. Es gibt keine kaufbaren Vorteile.

## Phase 1

- Responsive Hauptkarte auf der Profilseite.
- Eindeutige Startnummer je Liga.
- Aktuelles Trikot als Farbwelt.
- Echte Saisonwerte: Punkte, Siege, Kilometer und Höhenmeter.
- Initialen-Avatar, bis Nutzerfotos ergänzt werden.
- Optionaler Teamname im Profil; ohne Angabe erscheint "Independent Riders".
- Datenfundament für spätere Saison-Snapshots.

## Phase 2

- Trikot-Spezialkarten erscheinen automatisch, wenn ein Fahrer eine aktuelle Wertung anführt.
- Jede Spezialkarte ist öffnbar und erklärt Wertung und Liga.
- Karrierebereich mit aktueller Live-Saison und allen bereits gespeicherten Saisonarchiven.
- Die Punkteentwicklung wird ausschließlich aus Live- und Archivdaten erzeugt.

## Noch offen

1. Beim Saisonabschluss wird eine Saisonkarte dauerhaft als Snapshot gespeichert.
2. Hall of Fame und gruppenweite Titelhistorie.
3. PNG-/Story-Export und Teilen.
4. Echte Teams als eigenes Liga-Modul.

## Datenquellen

| Kartenwert | Quelle |
| --- | --- |
| Name / Avatar / Team | `profiles` |
| Liga / Startnummer | `groups`, `group_members` |
| Punkte / Kilometer / Höhenmeter | `rides`, `season_point_adjustments` |
| Aktuelles Trikot | `seasonRules` |
| Karrierearchiv | `season_card_snapshots` |

## Voraussetzung

Die Migration `supabase/rider_card_phase_1.sql` muss einmal im Supabase SQL Editor ausgeführt sein. Bestehende Testdaten bleiben dabei erhalten.
