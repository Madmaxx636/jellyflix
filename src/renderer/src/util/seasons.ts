// Seasonal picks: what to suggest around a holiday, and when. Each season says how to find its titles in a library: the
// short list of classics (holidayData.ts), plus tags and names, plus a genre for seasons that have one.

export interface Season {
  id: 'valentines' | 'halloween' | 'thanksgiving' | 'christmas'
  title: string
  tags: string[]
  /** Words to look for in a title's name. */
  names: string[]
  /** Genres that fit the season on their own (scary films at Halloween). */
  genres: string[]
  /** Whether horror and thrillers are welcome. They are only at Halloween: a Christmas horror film isn't a holiday pick. */
  horror: boolean
}

const SEASONS: Record<Season['id'], Season> = {
  valentines: { id: 'valentines', title: "Valentine's Day picks", tags: ['valentine', 'valentines'], names: ['valentine'], genres: ['Romance'], horror: false },
  halloween: { id: 'halloween', title: 'Halloween watch', tags: ['halloween'], names: ['halloween'], genres: ['Horror'], horror: true },
  thanksgiving: { id: 'thanksgiving', title: 'Thanksgiving favourites', tags: ['thanksgiving'], names: ['thanksgiving'], genres: [], horror: false },
  christmas: { id: 'christmas', title: 'Christmas classics', tags: ['christmas', 'xmas', 'holiday'], names: ['christmas', 'xmas', 'santa'], genres: [], horror: false }
}

/** The fourth Thursday of November in [year]. */
export function thanksgivingDay(year: number): number {
  const firstThursday = 1 + ((4 - new Date(year, 10, 1).getDay() + 7) % 7)
  return firstThursday + 21
}

/**
 * The seasons [date] falls in, the nearest first. They can overlap: from mid November it is both Thanksgiving and Christmas
 * time, and the banner mixes the two. Thanksgiving runs from early November to the day itself; Christmas from mid November to
 * the end of the year.
 */
export function seasonsFor(date: Date): Season[] {
  const m = date.getMonth() + 1
  const d = date.getDate()
  const at = m * 100 + d
  const found: Season[] = []
  if (at >= 201 && at <= 214) found.push(SEASONS.valentines)
  if (m === 10) found.push(SEASONS.halloween)
  if (at >= 1108 && at <= 1100 + thanksgivingDay(date.getFullYear())) found.push(SEASONS.thanksgiving)
  if (at >= 1115 && at <= 1231) found.push(SEASONS.christmas)
  // The one that ends first leads: it is the one about to be over.
  return found
}

/** The first season [date] falls in, or null for the rest of the year. */
export function seasonFor(date: Date): Season | null {
  return seasonsFor(date)[0] ?? null
}
