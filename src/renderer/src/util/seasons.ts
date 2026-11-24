// Seasonal picks: what to suggest around a holiday. Each season says when it runs and how to find its movies in a library
// (Jellyfin has no "holiday" field, so this looks at tags, names and genres together).

export interface Season {
  id: string
  title: string
  tags: string[]
  /** Words to look for in a title's name. */
  names: string[]
  genres: string[]
}

interface Window { season: Season; from: [month: number, day: number]; to: [month: number, day: number] }

const SEASONS: Window[] = [
  { season: { id: 'valentines', title: "Valentine's Day picks", tags: ['valentine', 'valentines'], names: ['valentine'], genres: ['Romance'] }, from: [2, 1], to: [2, 14] },
  { season: { id: 'halloween', title: 'Halloween watch', tags: ['halloween'], names: ['halloween'], genres: ['Horror'] }, from: [10, 1], to: [10, 31] },
  { season: { id: 'christmas', title: 'Christmas movies', tags: ['christmas', 'xmas', 'holiday'], names: ['christmas', 'xmas', 'santa'], genres: [] }, from: [12, 1], to: [12, 31] }
]

/** The season [date] falls in, or null for the rest of the year. */
export function seasonFor(date: Date): Season | null {
  const m = date.getMonth() + 1
  const d = date.getDate()
  const at = m * 100 + d
  return SEASONS.find(w => at >= w.from[0] * 100 + w.from[1] && at <= w.to[0] * 100 + w.to[1])?.season ?? null
}
