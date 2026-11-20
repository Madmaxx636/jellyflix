import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigationType, useSearchParams } from 'react-router-dom'
import type { Api, Item, Query } from '../api/jellyfin'
import { recall, remember } from '../hooks/memory'
import { useParamUpdater } from '../hooks/useParamUpdater'
import { usePageTitle } from '../hooks/usePageTitle'
import { useTheme } from '../theme'
import { flagsOf, useFlagsVersion } from '../userdata'
import { Card } from './Card'
import { Select } from './Fields'
import { ErrorBox, GridSkeleton } from './Status'

const PAGE_SIZE = 48
const SHUFFLE_SIZE = 60 // a shuffled list can't be paged (the order would change), so it is one page
type Filter = NonNullable<Query['filters']>[number]

const SORTS = [
  { id: 'name', label: 'Name (A–Z)', by: 'SortName', order: 'Ascending' },
  { id: 'name-desc', label: 'Name (Z–A)', by: 'SortName', order: 'Descending' },
  { id: 'added', label: 'Recently added', by: 'DateCreated', order: 'Descending' },
  { id: 'released', label: 'Release date', by: 'PremiereDate', order: 'Descending' },
  { id: 'rating', label: 'Rating', by: 'CommunityRating', order: 'Descending' },
  { id: 'random', label: 'Shuffle', by: 'Random', order: 'Ascending' }
] as const

export interface BrowseProps {
  api: Api
  title: string
  subtitle?: ReactNode
  base: { parentId?: string; types: string[]; personId?: string }
  /** Filters the viewer can't change, e.g. My List. */
  lockedFilters?: Filter[]
  /** A genre fixed by the page (the genre page). */
  lockedGenre?: string
  /** Show the genre dropdown, listing the genres found here. */
  genreScope?: { parentId?: string; types?: string[] }
  /** Offer All / Movies / Shows. */
  typeSwitch?: boolean
  hideFilter?: boolean
  defaultSort?: string
  empty?: ReactNode
  /** Remove a title from the grid right away when it is taken off My List. */
  dropUnfavorited?: boolean
}

/** What is on screen: one query's titles so far. */
interface Shown { key: string; items: Item[]; total: number | null; error: Error | null }

/**
 * A sortable, filterable grid that loads more as you scroll. The choices live in the address, so Back and reload behave,
 * and going Back to a grid you scrolled down brings back everything that was loaded.
 */
export default function Browse(p: BrowseProps) {
  const { api, lockedFilters, lockedGenre, typeSwitch, genreScope } = p
  const { theme } = useTheme()
  const [params] = useSearchParams()
  const setParam = useParamUpdater()
  const { key: entry } = useLocation()
  const navigation = useNavigationType()
  usePageTitle(p.title)

  const sort = SORTS.find(s => s.id === (params.get('sort') ?? p.defaultSort ?? 'name')) ?? SORTS[0]
  const genre = lockedGenre ?? params.get('genre') ?? ''
  const filter = params.get('filter') ?? 'all'
  const type = params.get('type') ?? 'all'
  const [attempt, setAttempt] = useState(0) // "Try again" asks for a fresh first page

  const types = useMemo(() => (typeSwitch && type !== 'all' ? [type === 'movies' ? 'Movie' : 'Series'] : p.base.types), [typeSwitch, type, p.base.types])
  const filters = useMemo(() => {
    const f: Filter[] = [...(lockedFilters ?? [])]
    if (filter === 'unplayed') f.push('IsUnplayed')
    if (filter === 'played') f.push('IsPlayed')
    if (filter === 'fav') f.push('IsFavorite')
    return f
  }, [lockedFilters, filter])
  const request = useMemo<Query>(() => ({
    parentId: p.base.parentId, personId: p.base.personId, types, genres: genre ? [genre] : undefined,
    filters, sortBy: sort.by, sortOrder: sort.order
  }), [p.base.parentId, p.base.personId, types, genre, filters, sort])
  const queryKey = JSON.stringify([request, attempt])

  const slot = `browse|${entry}`
  const [saved] = useState(() => (navigation === 'POP' ? recall<Shown>(slot) : undefined))
  const [shown, setShown] = useState<Shown>(() => saved?.key === queryKey ? saved : { key: '', items: [], total: null, error: null })
  const current = shown.key === queryKey
  const items = current ? shown.items : []
  const total = current ? shown.total : null
  const error = current ? shown.error : null
  const [pending, setPending] = useState(false)
  const query = useRef<AbortController | null>(null) // stops whatever is still loading for the previous query
  const inFlight = useRef(false)
  const skipFirstLoad = useRef(saved?.key === queryKey)
  const sentinel = useRef<HTMLDivElement>(null)
  const [genres, setGenres] = useState<string[]>([])
  useFlagsVersion()

  const load = useCallback(async (start: number, signal: AbortSignal) => {
    inFlight.current = true
    setPending(true)
    try {
      const r = await api.with(signal).items({ ...request, start, limit: sort.by === 'Random' ? SHUFFLE_SIZE : PAGE_SIZE })
      if (signal.aborted) return // a newer query replaced this one
      setShown(cur => ({ key: queryKey, items: start === 0 || cur.key !== queryKey ? r.items : [...cur.items, ...r.items], total: r.total, error: null }))
    } catch (e) {
      if (signal.aborted) return
      setShown(cur => ({ key: queryKey, items: cur.key === queryKey ? cur.items : [], total: cur.key === queryKey ? cur.total : null, error: e as Error }))
    } finally {
      if (!signal.aborted) { inFlight.current = false; setPending(false) }
    }
  }, [api, request, queryKey, sort.by])

  useEffect(() => {
    const ctl = new AbortController()
    query.current = ctl
    if (skipFirstLoad.current) skipFirstLoad.current = false // coming Back: what was loaded is already here
    else void load(0, ctl.signal)
    return () => ctl.abort()
  }, [load])

  useEffect(() => {
    if (current) remember(slot, shown)
  }, [slot, shown, current])

  // The sentinel sits under the last row: when it comes near the screen, load the next page. A failed page stops the
  // paging (the error box offers "Try again") instead of asking again straight away.
  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const more = total != null && items.length < total && !error && sort.by !== 'Random'
    const watcher = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && more && !inFlight.current && query.current) void load(items.length, query.current.signal)
    }, { rootMargin: '800px' })
    watcher.observe(el)
    return () => watcher.disconnect()
  }, [items.length, total, error, load, sort.by])

  useEffect(() => {
    if (!genreScope) return
    const ctl = new AbortController()
    api.with(ctl.signal).genres(genreScope).then(g => { if (!ctl.signal.aborted) setGenres(g) }, () => { /* the menu just stays short */ })
    return () => ctl.abort()
  }, [api, genreScope])

  const visible = p.dropUnfavorited ? items.filter(i => flagsOf(i).fav) : items
  const count = p.dropUnfavorited && total != null && items.length >= total ? visible.length : total
  const w = theme.words
  const firstPageLoading = !current && !error

  return (
    <div className="browse page" data-browse>
      <header className="browse-head">
        <h1 className="page-title">{p.title}</h1>
        <div className="browse-tools">
          {genreScope && !lockedGenre && (
            <label className="tool" htmlFor="browse-genre"><span>{w.genres}</span>
              <Select id="browse-genre" label={w.genres} value={genre} onChange={v => setParam({ genre: v })}
                options={[{ value: '', label: 'All genres' }, ...genres.map(g => ({ value: g, label: g }))]} />
            </label>
          )}
          {typeSwitch && (
            <div className="seg" role="group" aria-label="Type">
              {[['all', 'All'], ['movies', 'Movies'], ['shows', 'Shows']].map(([id, label]) => (
                <button key={id} data-type={id} aria-pressed={type === id} className={type === id ? 'on' : ''} onClick={() => setParam({ type: id })}>{label}</button>
              ))}
            </div>
          )}
          {!p.hideFilter && (
            <label className="tool" htmlFor="browse-show"><span>Show</span>
              <Select id="browse-show" label="Show" value={filter} onChange={v => setParam({ filter: v })}
                options={[{ value: 'all', label: 'Everything' }, { value: 'unplayed', label: 'Unwatched' }, { value: 'played', label: 'Watched' }, { value: 'fav', label: `In ${w.myList}` }]} />
            </label>
          )}
          <label className="tool" htmlFor="browse-sort"><span>Sort</span>
            <Select id="browse-sort" label="Sort" value={sort.id} onChange={v => setParam({ sort: v })} options={SORTS.map(s => ({ value: s.id, label: s.label }))} />
          </label>
        </div>
      </header>
      {p.subtitle}
      {error && <ErrorBox error={error} what="this list" onRetry={() => setAttempt(a => a + 1)} />}
      {firstPageLoading && <GridSkeleton />}
      <div className="grid">{visible.map(it => <Card key={it.Id} item={it} api={api} />)}</div>
      {current && !pending && !error && visible.length === 0 && (p.dropUnfavorited ? total != null : total === 0) && <p className="empty">{p.empty ?? 'Nothing here yet.'}</p>}
      <div ref={sentinel} className="sentinel" />
      {pending && current && <p className="count" role="status">Loading…</p>}
      {!pending && count != null && count > 0 && <p className="count" data-count={count}>{count} {count === 1 ? 'title' : 'titles'}</p>}
    </div>
  )
}
