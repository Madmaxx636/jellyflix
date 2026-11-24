import { useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import type { Api, Item, Recommendation, Session, View } from '../api/jellyfin'
import { useLoad } from '../hooks/useLoad'
import { useSettings } from '../settings'
import { useTheme, type Words } from '../theme'
import { isBrowsable } from '../util/library'
import { seasonsFor, type Season } from '../util/seasons'
import { seedFrom, shuffled } from '../util/shuffle'
import { holidayPicks, type Picks } from '../api/seasonal'
import Hero from '../components/Hero'
import Row from '../components/Row'
import { ErrorBox, RowsSkeleton } from '../components/Status'
import { LibraryTile } from '../components/Tiles'

const NO_PICKS: Picks = { items: [], labels: {} }
/** Finding the holiday picks the first time takes a few dozen requests; Home doesn't wait longer than this for them (they are kept for next time). */
const HOLIDAY_WAIT_MS = 4000
const withinMs = <T,>(p: Promise<T>, ms: number, fallback: T) => Promise.race([p, new Promise<T>(res => setTimeout(() => res(fallback), ms))])

const GENRE_ROWS = 12
const HERO_SLIDES = 5

interface HomeData {
  resume: Item[]; nextUp: Item[]; movies: Item[]; shows: Item[]; favs: Item[]; top: Item[]
  recs: Recommendation[]; views: View[]; genreRows: { title: string; items: Item[] }[]
  seasons: Season[]; holiday: Picks
}
interface RowDef { key: string; title: string; items: Item[]; ranked?: boolean; to?: string }

function recTitle(r: Recommendation, w: Words): string {
  const name = r.BaselineItemName ?? ''
  if (/director/i.test(r.RecommendationType)) return `Directed by ${name}`
  if (/actor/i.test(r.RecommendationType)) return `Starring ${name}`
  return w.becauseYouWatched(name)
}

async function loadHome(api: Api, style: 'classics' | 'all', holidays: boolean): Promise<HomeData> {
  const safe = <T,>(p: Promise<T>, fallback: T) => p.catch(() => fallback)
  // Continue Watching is the canary: if even that fails, it's a sign-in or connection problem and worth showing.
  const seasons = holidays ? seasonsFor(new Date()) : []
  const [resume, nextUp, movies, shows, genres, favs, top, recs, views, holiday] = await Promise.all([
    api.resume(),
    safe(api.nextUp(), [] as Item[]),
    safe(api.latest('Movie'), [] as Item[]),
    safe(api.latest('Series'), [] as Item[]),
    safe(api.genres(), [] as string[]),
    safe(api.items({ types: ['Movie', 'Series', 'BoxSet'], filters: ['IsFavorite'], sortBy: 'DateCreated', sortOrder: 'Descending', limit: 20 }).then(p => p.items), [] as Item[]),
    safe(api.items({ types: ['Movie', 'Series'], sortBy: 'CommunityRating', sortOrder: 'Descending', limit: 10 }).then(p => p.items), [] as Item[]),
    safe(api.recommendations(), [] as Recommendation[]),
    safe(api.views(), [] as View[]),
    seasons.length ? safe(withinMs(holidayPicks(api, seasons, style), HOLIDAY_WAIT_MS, NO_PICKS), NO_PICKS) : Promise.resolve(NO_PICKS)
  ])
  const genreRows = await Promise.all(genres.slice(0, GENRE_ROWS).map(async g => ({ title: g, items: await safe(api.byGenre(g), [] as Item[]) })))
  return { resume, nextUp, movies, shows, favs, top, recs, views: views.filter(isBrowsable), genreRows, seasons, holiday }
}

const worthFeaturing = (it: Item) => !!(it.BackdropImageTags?.length || it.ParentBackdropImageTags?.length) && !!it.Overview
const MIN_SEASONAL_SLIDES = 2

/**
 * Titles worth featuring (they have a backdrop and a description), in an order that stays the same for one visit to the
 * page. In a holiday's weeks the banner shows that holiday's movies instead, when the library has at least two to show.
 */
function featured(d: HomeData, seed: string, seasonal: boolean): { items: Item[]; labels: Record<string, string> } {
  if (seasonal) {
    const holiday = d.holiday.items.filter(worthFeaturing)
    if (holiday.length >= MIN_SEASONAL_SLIDES) return { items: shuffled(holiday, seedFrom(seed)).slice(0, HERO_SLIDES), labels: d.holiday.labels }
  }
  const seen = new Set<string>()
  const pool: Item[] = []
  for (const it of [...d.movies, ...d.shows, ...d.top, ...d.recs.flatMap(r => r.Items)]) {
    if (!seen.has(it.Id) && worthFeaturing(it)) { seen.add(it.Id); pool.push(it) }
  }
  return { items: shuffled(pool, seedFrom(seed)).slice(0, HERO_SLIDES), labels: {} }
}

export default function Home({ api, session }: { api: Api; session: Session }) {
  const { theme } = useTheme()
  const { settings: st } = useSettings()
  const { key: visit } = useLocation()
  const w = theme.words
  const { data: d, error, reload } = useLoad(api, `home|${st.seasonalStyle}|${st.rows.seasonal}`, a => loadHome(a, st.seasonalStyle, st.rows.seasonal), { remember: true })
  const hero = useMemo(() => (d ? featured(d, visit, st.rows.seasonal) : { items: [], labels: {} }), [d, visit, st.rows.seasonal])
  const heroItems = hero.items

  if (error) return <div className="page"><ErrorBox error={error} what="your library" onRetry={reload} /></div>
  if (!d) return <div className="rows nohero"><RowsSkeleton /></div>

  const rows: RowDef[] = []
  if (st.rows.continueWatching) rows.push({ key: 'resume', title: w.continueWatching(session.userName), items: d.resume })
  if (st.rows.nextUp) rows.push({ key: 'nextup', title: w.nextUp, items: d.nextUp })
  if (st.rows.myList) rows.push({ key: 'mylist', title: w.myList, items: d.favs, to: '/mylist' })
  if (st.rows.recommended) d.recs.forEach((r, i) => rows.push({ key: `rec-${i}`, title: recTitle(r, w), items: r.Items }))
  if (st.rows.topRated) rows.push({ key: 'top', title: w.topRated, items: d.top, ranked: theme.top10, to: '/new' })
  if (st.rows.recent) {
    rows.push({ key: 'movies', title: w.recentlyAdded('movies'), items: d.movies, to: '/movies?sort=added' })
    rows.push({ key: 'shows', title: w.recentlyAdded('shows'), items: d.shows, to: '/shows?sort=added' })
  }
  d.genreRows.slice(0, st.genreRows).forEach(g => rows.push({ key: `g-${g.title}`, title: g.title, items: g.items, to: `/genre/${encodeURIComponent(g.title)}` }))

  const hasHero = st.showHero && heroItems.length > 0
  // Jellyfin already lists a "Collections" library when there are box sets, so don't add a second tile for it.
  const hasCollectionsLibrary = d.views.some(v => (v.CollectionType ?? '').toLowerCase() === 'boxsets')
  const anything = rows.some(r => r.items.length)
  return (
    <>
      {hasHero && <Hero items={heroItems} api={api} labels={hero.labels} />}
      {theme.brandTiles && (
        <div className={`brand-row ${hasHero ? '' : 'nohero'}`} data-brands>
          {d.views.slice(0, 5).map(v => <LibraryTile key={v.Id} api={api} view={v} />)}
          {!hasCollectionsLibrary && <Link to="/collections" className="tile lib misc"><span className="tile-name">{w.collections}</span></Link>}
          <Link to="/genres" className="tile lib misc alt"><span className="tile-name">{w.genres}</span></Link>
        </div>
      )}
      <div className={`rows ${hasHero || theme.brandTiles ? '' : 'nohero'}`}>
        {rows.map(r => <Row key={r.key} title={r.title} items={r.items} api={api} ranked={r.ranked} to={r.to} />)}
        {!anything && <p className="empty pad">Nothing to show yet. Add some titles to your Jellyfin library and they'll appear here.</p>}
      </div>
    </>
  )
}
