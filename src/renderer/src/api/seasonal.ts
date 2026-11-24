import { HOLIDAY_DATA, plainName, type Classic, type ClassicEpisode } from '../util/holidayData'
import type { Season } from '../util/seasons'
import type { Api } from './client'
import type { Item } from './types'

const PER_SEARCH = 30
const PER_SEASON = 12
const CONCURRENCY = 6
const KEEP_FOR_MS = 12 * 60 * 60 * 1000 // finding the picks takes a few dozen requests, so they are kept for half a day

const ADULT = /^(R|NC-17|X|TV-MA|18|18\+|16|AO)$/i
const FAMILY = /^(G|PG|TV-G|TV-PG|TV-Y|TV-Y7|TV-Y7-FV)$/i
const SCARY = new Set(['Horror', 'Thriller'])
const MIN_RATING = 6.4
const CLASSIC_UNTIL = 1995 // a title this old with no rating at all is trusted: time has judged it

export interface Picks { items: Item[]; /** Which holiday brought each title in: what the banner says above its name. */ labels: Record<string, string> }

/** Does [item] match a title from the list of classics: the same name, and the same year give or take one when both are known. */
export function matchesClassic(item: Item, wanted: Classic): boolean {
  if (plainName(item.Name) !== plainName(wanted.title)) return false
  return wanted.year == null || item.ProductionYear == null || Math.abs(item.ProductionYear - wanted.year) <= 1
}

/** Does [item] match an episode from the list: the same episode name, in the series asked for. */
export function matchesEpisode(item: Item, wanted: ClassicEpisode): boolean {
  return item.Type === 'Episode' && plainName(item.Name) === plainName(wanted.title) && plainName(item.SeriesName ?? '').includes(plainName(wanted.series))
}

/**
 * Is [item] a pick for [season] that this library has no reason to be embarrassed by? Adult ratings, scary films outside Halloween
 * and poorly rated titles are out; with no rating at all, only older titles are trusted. Titles from the list of classics skip this.
 */
export function qualifies(item: Item, season: Pick<Season, 'horror'>): boolean {
  if (item.OfficialRating && ADULT.test(item.OfficialRating.trim())) return false
  const genres = item.Genres ?? []
  const scary = genres.some(g => SCARY.has(g))
  if (scary && !season.horror) return false
  const rating = item.CommunityRating
  if (rating == null) return (item.ProductionYear ?? 9999) <= CLASSIC_UNTIL
  return rating >= (scary ? 7 : MIN_RATING)
}

/** How good a pick [item] is: a well-liked, family-friendly, older title scores most. */
export function score(item: Item): number {
  const year = item.ProductionYear ?? 2020
  return (item.CommunityRating ?? 6) * 10 + (item.OfficialRating && FAMILY.test(item.OfficialRating.trim()) ? 15 : 0) + (year <= 1980 ? 12 : year <= 2000 ? 6 : 0)
}

/** Runs [work] over [list] a few at a time, so a long list doesn't become dozens of requests at once. */
async function inBatches<T, R>(list: T[], work: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array<R>(list.length)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, list.length) }, async () => {
    while (next < list.length) {
      const i = next++
      // eslint-disable-next-line no-await-in-loop -- one after another within each lane, on purpose
      out[i] = await work(list[i])
    }
  }))
  return out
}

async function classics(api: Api, season: Season): Promise<Item[]> {
  const data = HOLIDAY_DATA[season.id]
  const movies = await inBatches(data.movies, async w =>
    (await api.items({ types: ['Movie'], search: w.title, limit: 8 }).then(r => r.items, () => [] as Item[])).filter(i => matchesClassic(i, w)))
  const episodes = await inBatches(data.episodes, async w =>
    (await api.items({ types: ['Episode'], search: w.title, limit: 12 }).then(r => r.items, () => [] as Item[])).filter(i => matchesEpisode(i, w)))
  return [...movies.flat(), ...episodes.flat()]
}

/** Titles that look like the season by tag, by name or by genre. Many are not worth watching: [qualifies] weeds them out. */
async function candidates(api: Api, season: Season): Promise<Item[]> {
  const asks = [
    ...(season.tags.length ? [api.items({ types: ['Movie'], tags: season.tags, limit: PER_SEARCH })] : []),
    ...season.names.map(name => api.items({ types: ['Movie'], search: name, limit: PER_SEARCH })),
    ...season.genres.map(genre => api.items({ types: ['Movie'], genres: [genre], sortBy: 'CommunityRating', sortOrder: 'Descending', limit: PER_SEARCH }))
  ]
  return (await Promise.all(asks.map(p => p.then(r => r.items, () => [] as Item[])))).flat()
}

function dedupe(items: Item[]): Item[] {
  const seen = new Set<string>()
  return items.filter(i => (seen.has(i.Id) ? false : (seen.add(i.Id), true)))
}

/** The picks for one season: the library's classics first, then the best-rated of what matches. */
export async function picksFor(api: Api, season: Season, style: 'classics' | 'all'): Promise<Item[]> {
  const [known, found] = await Promise.all([classics(api, season), candidates(api, season)])
  const knownIds = new Set(known.map(i => i.Id))
  const extra = dedupe(found).filter(i => !knownIds.has(i.Id) && (style === 'all' || qualifies(i, season)))
  extra.sort((a, b) => score(b) - score(a))
  return [...dedupe(known).sort((a, b) => score(b) - score(a)), ...extra].slice(0, style === 'all' ? PER_SEASON * 2 : PER_SEASON)
}

interface Stored { at: number; items: Item[] }

function recall(key: string): Item[] | null {
  try {
    const s = JSON.parse(localStorage.getItem(key) ?? 'null') as Stored | null
    return s && Date.now() - s.at < KEEP_FOR_MS ? s.items : null
  } catch { return null }
}

/**
 * The titles for the banner: each season in turn gives its picks (kept for half a day), and where seasons overlap they take
 * turns, so Thanksgiving and Christmas share the banner in late November.
 */
export async function holidayPicks(api: Api, seasons: Season[], style: 'classics' | 'all'): Promise<Picks> {
  const lists = await Promise.all(seasons.map(async season => {
    const key = `jellyflix.holiday.${api.cacheKey}.${season.id}.${style}`
    const kept = recall(key)
    if (kept) return { season, items: kept }
    const items = await picksFor(api, season, style)
    if (items.length) { try { localStorage.setItem(key, JSON.stringify({ at: Date.now(), items } satisfies Stored)) } catch { /* storage full */ } }
    return { season, items }
  }))
  const items: Item[] = []
  const labels: Record<string, string> = {}
  for (let i = 0; lists.some(l => i < l.items.length); i++) {
    for (const { season, items: list } of lists) {
      const it = list[i]
      if (it && !(it.Id in labels)) { labels[it.Id] = season.title; items.push(it) }
    }
  }
  return { items, labels }
}
