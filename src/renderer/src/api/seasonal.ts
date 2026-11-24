import type { Season } from '../util/seasons'
import type { Api } from './client'
import type { Item } from './types'

const PER_SEARCH = 24
const SHOWN = 20

/**
 * Movies for a season: those tagged for it, those named for it and, for seasons with a genre (horror at Halloween), a random
 * sample of that genre, in that order of preference. Each search that fails is skipped, so a slow or odd server gives a
 * shorter row rather than none.
 */
export async function seasonalMovies(api: Api, season: Season): Promise<Item[]> {
  const asks = [
    ...(season.tags.length ? [api.items({ types: ['Movie'], tags: season.tags, sortBy: 'Random', limit: PER_SEARCH })] : []),
    ...season.names.map(name => api.items({ types: ['Movie'], search: name, sortBy: 'Random', limit: PER_SEARCH })),
    ...season.genres.map(genre => api.items({ types: ['Movie'], genres: [genre], sortBy: 'Random', limit: PER_SEARCH }))
  ]
  const pages = await Promise.all(asks.map(p => p.then(r => r.items, () => [] as Item[])))
  const seen = new Set<string>()
  const out: Item[] = []
  for (const it of pages.flat()) {
    if (!seen.has(it.Id)) { seen.add(it.Id); out.push(it) }
  }
  return out.slice(0, SHOWN)
}
