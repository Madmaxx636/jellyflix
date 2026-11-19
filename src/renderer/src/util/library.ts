import type { View } from '../api/jellyfin'

/** The item types a library holds, by its collection type. */
export function typesFor(collectionType?: string): string[] {
  switch ((collectionType ?? '').toLowerCase()) {
    case 'movies': return ['Movie']
    case 'tvshows': return ['Series']
    case 'boxsets': return ['BoxSet']
    case 'homevideos': return ['Video']
    case 'musicvideos': return ['MusicVideo']
    default: return ['Movie', 'Series', 'BoxSet', 'Video']
  }
}

// Libraries this app can't browse (it plays video only).
const HIDDEN = ['music', 'books', 'playlists', 'livetv', 'photos', 'audiobooks']
export const isBrowsable = (v: View) => !HIDDEN.includes((v.CollectionType ?? '').toLowerCase())

/** A stable hue from a name, for tiles that have no artwork. */
export const hueOf = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % 360
