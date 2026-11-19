import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Api, Item, Recommendation, Session, View } from '../api/jellyfin'
import { useTheme, type Words } from '../theme'
import { useSettings } from '../settings'
import { isBrowsable } from '../util/library'
import Hero from '../components/Hero'
import Row from '../components/Row'
import { LibraryTile } from '../components/Tiles'

interface HomeData {
  resume: Item[]; nextUp: Item[]; movies: Item[]; shows: Item[]; favs: Item[]; top: Item[]
  recs: Recommendation[]; views: View[]; genreRows: { title: string; items: Item[] }[]
}
interface RowDef { key: string; title: string; items: Item[]; ranked?: boolean; to?: string }

function recTitle(r: Recommendation, w: Words): string {
  const name = r.BaselineItemName ?? ''
  if (/director/i.test(r.RecommendationType)) return `Directed by ${name}`
  if (/actor/i.test(r.RecommendationType)) return `Starring ${name}`
  return w.becauseYouWatched(name)
}

function shuffled<T>(list: T[]): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  return a
}

export default function Home({ api, session }: { api: Api; session: Session }) {
  const { theme } = useTheme()
  const { settings: st } = useSettings()
  const w = theme.words
  const [d, setD] = useState<HomeData | null>(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    let live = true
    const safe = <T,>(p: Promise<T>, fallback: T) => p.catch(() => fallback)
    ;(async () => {
      try {
        // Continue Watching is the canary: if even that fails, it's a sign-in or connection problem and worth showing.
        const [resume, nextUp, movies, shows, genres, favs, top, recs, views] = await Promise.all([
          api.resume(),
          safe(api.nextUp(), [] as Item[]),
          safe(api.latest('Movie'), [] as Item[]),
          safe(api.latest('Series'), [] as Item[]),
          safe(api.genres(), [] as string[]),
          safe(api.items({ types: ['Movie', 'Series', 'BoxSet'], filters: ['IsFavorite'], sortBy: 'DateCreated', sortOrder: 'Descending', limit: 20 }).then(p => p.items), [] as Item[]),
          safe(api.items({ types: ['Movie', 'Series'], sortBy: 'CommunityRating', sortOrder: 'Descending', limit: 10 }).then(p => p.items), [] as Item[]),
          safe(api.recommendations(), [] as Recommendation[]),
          safe(api.views(), [] as View[])
        ])
        const genreRows = await Promise.all(genres.slice(0, 12).map(async g => ({ title: g, items: await safe(api.byGenre(g), [] as Item[]) })))
        if (live) setD({ resume, nextUp, movies, shows, favs, top, recs, views: views.filter(isBrowsable), genreRows })
      } catch (e) { if (live) setErr((e as Error).message) }
    })()
    return () => { live = false }
  }, [api])

  // Titles worth featuring: they have a backdrop and a description.
  const heroItems = useMemo(() => {
    if (!d) return []
    const seen = new Set<string>()
    const pool: Item[] = []
    for (const it of [...d.movies, ...d.shows, ...d.top, ...d.recs.flatMap(r => r.Items)]) {
      if (!seen.has(it.Id) && it.BackdropImageTags?.length && it.Overview) { seen.add(it.Id); pool.push(it) }
    }
    return shuffled(pool).slice(0, 5)
  }, [d])

  if (err) return <p className="error pad">Failed to load library: {err}</p>
  if (!d) return <p className="pad count">Loading…</p>

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
      {hasHero && <Hero items={heroItems} api={api} />}
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
