import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Api, Item, Query } from '../api/jellyfin'
import { useTheme } from '../theme'
import { Card } from './Card'
import { Select } from './Fields'
import { flagsOf, useFlagsVersion } from '../userdata'

const PAGE = 48
type Filter = NonNullable<Query['filters']>[number]

export const SORTS = [
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
  base: { parentId?: string; types: string[]; personId?: string; recursive?: boolean }
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

/** A sortable, filterable grid that loads more as you scroll. The choices live in the address so Back works. */
export default function Browse(p: BrowseProps) {
  const { api } = p
  const { theme } = useTheme()
  const [sp, setSp] = useSearchParams()
  const sort = SORTS.find(s => s.id === (sp.get('sort') ?? p.defaultSort ?? 'name')) ?? SORTS[0]
  const genre = p.lockedGenre ?? sp.get('genre') ?? ''
  const filter = sp.get('filter') ?? 'all'
  const type = sp.get('type') ?? 'all'

  const [genres, setGenres] = useState<string[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const gen = useRef(0)
  const sentinel = useRef<HTMLDivElement>(null)
  useFlagsVersion()

  const types = useMemo(
    () => (p.typeSwitch && type !== 'all' ? [type === 'movies' ? 'Movie' : 'Series'] : p.base.types),
    [p.typeSwitch, type, p.base.types]
  )
  const filters = useMemo(() => {
    const f: Filter[] = [...(p.lockedFilters ?? [])]
    if (filter === 'unplayed') f.push('IsUnplayed')
    if (filter === 'played') f.push('IsPlayed')
    if (filter === 'fav') f.push('IsFavorite')
    return f
  }, [p.lockedFilters, filter])
  const key = JSON.stringify([p.base, types, filters, genre, sort.id])

  const fetchPage = useCallback(async (start: number, g: number) => {
    setLoading(true)
    try {
      const r = await api.items({
        parentId: p.base.parentId, personId: p.base.personId, recursive: p.base.recursive, types,
        genres: genre ? [genre] : undefined, filters, sortBy: sort.by, sortOrder: sort.order,
        start, limit: sort.by === 'Random' ? 60 : PAGE
      })
      if (g !== gen.current) return // a newer query replaced this one
      setItems(cur => (start === 0 ? r.items : [...cur, ...r.items]))
      setTotal(r.total)
    } catch (e) {
      if (g === gen.current) setErr((e as Error).message)
    } finally {
      if (g === gen.current) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, key])

  useEffect(() => {
    gen.current++
    setItems([]); setTotal(null); setErr('')
    fetchPage(0, gen.current)
  }, [fetchPage])

  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const more = total != null && items.length < total && sort.by !== 'Random'
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loading && more) fetchPage(items.length, gen.current)
    }, { rootMargin: '800px' })
    io.observe(el)
    return () => io.disconnect()
  }, [items.length, total, loading, fetchPage, sort.by])

  useEffect(() => {
    if (!p.genreScope) return
    let live = true
    api.genres(p.genreScope).then(g => { if (live) setGenres(g) }).catch(() => {})
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, JSON.stringify(p.genreScope)])

  const update = (patch: Record<string, string>) =>
    setSp(prev => {
      const n = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(patch)) { if (v && v !== 'all') n.set(k, v); else n.delete(k) }
      return n
    }, { replace: true })

  const shown = p.dropUnfavorited ? items.filter(i => flagsOf(i).fav) : items
  const count = p.dropUnfavorited && total != null && items.length >= total ? shown.length : total
  const w = theme.words

  return (
    <div className="browse page" data-browse>
      <header className="browse-head">
        <h1 className="page-title">{p.title}</h1>
        <div className="browse-tools">
          {p.genreScope && !p.lockedGenre && (
            <label className="tool"><span>{w.genres}</span>
              <Select label={w.genres} value={genre} onChange={v => update({ genre: v })}
                options={[{ value: '', label: 'All genres' }, ...genres.map(g => ({ value: g, label: g }))]} />
            </label>
          )}
          {p.typeSwitch && (
            <div className="seg" role="group" aria-label="Type">
              {[['all', 'All'], ['movies', 'Movies'], ['shows', 'Shows']].map(([id, label]) => (
                <button key={id} data-type={id} className={type === id ? 'on' : ''} onClick={() => update({ type: id })}>{label}</button>
              ))}
            </div>
          )}
          {!p.hideFilter && (
            <label className="tool"><span>Show</span>
              <Select label="Show" value={filter} onChange={v => update({ filter: v })}
                options={[{ value: 'all', label: 'Everything' }, { value: 'unplayed', label: 'Unwatched' }, { value: 'played', label: 'Watched' }, { value: 'fav', label: `In ${w.myList}` }]} />
            </label>
          )}
          <label className="tool"><span>Sort</span>
            <Select label="Sort" value={sort.id} onChange={v => update({ sort: v })} options={SORTS.map(s => ({ value: s.id, label: s.label }))} />
          </label>
        </div>
      </header>
      {p.subtitle}
      {err && <p className="error">Couldn't load this list: {err}</p>}
      <div className="grid">{shown.map(it => <Card key={it.Id} item={it} api={api} />)}</div>
      {!loading && !err && shown.length === 0 && total === 0 && <p className="empty">{p.empty ?? 'Nothing here yet.'}</p>}
      {!loading && !err && shown.length === 0 && total != null && total > 0 && p.dropUnfavorited && <p className="empty">{p.empty ?? 'Nothing here yet.'}</p>}
      <div ref={sentinel} className="sentinel" />
      {loading && <p className="count">Loading…</p>}
      {!loading && count != null && count > 0 && <p className="count" data-count={count}>{count} {count === 1 ? 'title' : 'titles'}</p>}
    </div>
  )
}
