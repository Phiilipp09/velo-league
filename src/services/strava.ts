export type ImportedRide = { id: number; title: string; date: string; distance: string; elevation: string; duration: string; points: number; synced: boolean }

export const importedRides: ImportedRide[] = [
  { id: 1, title: 'Mendelpass Attack', date: 'Heute, 08:14', distance: '42,8 km', elevation: '1.120 hm', duration: '2:06:38', points: 180, synced: true },
  { id: 2, title: 'Dolomiten Recovery', date: 'Gestern, 17:42', distance: '28,4 km', elevation: '410 hm', duration: '1:11:09', points: 64, synced: true },
]

// UI adapter: später durch einen Backend-Endpunkt ersetzen. OAuth-Tokens gehören nie in den Browser.
export async function syncStravaActivities(): Promise<ImportedRide[]> {
  await new Promise(resolve => window.setTimeout(resolve, 1200))
  return [{ id: 3, title: 'Pustertal Morning Ride', date: '28. Juli, 06:58', distance: '61,2 km', elevation: '880 hm', duration: '2:21:44', points: 142, synced: true }, ...importedRides]
}
