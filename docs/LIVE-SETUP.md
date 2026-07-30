# VELO LEAGUE live testen

## Bereits vorbereitet

- Mobile PWA mit installierbarer App-Hülle
- Datenbankschema in `supabase/schema.sql`
- Strava-UI sowie ein Adapter, der später eine sichere Serverfunktion aufruft

## Für die öffentliche Testversion noch nötig

1. Ein Supabase-Projekt erstellen und `supabase/schema.sql` im SQL Editor ausführen.
2. Die Vite-Variablen `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` hinterlegen.
3. Das Projekt bei Vercel importieren und deployen.
4. Eine Strava Developer App anlegen. Deren OAuth-Callback muss eine **Server-/Edge-Function** sein; das Client Secret darf nie in das Frontend.

Erst nach Schritt 4 kann die Schaltfläche „Mit Strava verbinden“ echte Strava-Aktivitäten importieren.
