import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { Api, Item } from '../api/jellyfin'
import { useTheme } from '../theme'
import { Card } from '../components/Card'
import Row from '../components/Row'
import Icon from '../components/Icon'

const RECENT = 'jellyflix.recent'
const loadRecent = (): string[] => { try { return JSON.parse(localStorage.getItem(RECENT) ?? '[]') } catch { return [] } }
const saveRecent = (q: string) => {
  try { localStorage.setItem(RECENT, JSON.stringify([q, ...loadRecent().filter(x => x.toLowerCase() !== q.toLowerCase())].slice(0, 8))) } catch { /* storage unavailable */ }
}

const KINDS = [['all', 'All'], ['movies', 'Movies'], ['shows', 'Shows'], ['people', 'People']] as const

export default function Search({ api }: { api: Api }) {
  const { theme } = useTheme()
  const w = theme.words
  const [sp, setSp] = useSearchParams()
  const q = sp.get('q') ?? ''
  const kind = sp.get('type') ?? 'all'
  const [debounced, setDebounced] = useState(q)
  const [movies, setMovies] = useState<Item[]>([])
  const [shows, setShows] = useState<Item[]>([])
  const [people, setPeople] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [recent, setRecent] = useState<string[]>(loadRecent)
  const [top, setTop] = useState<Item[]>([])

  useEffect(() => { const t = setTimeout(() => setDebounced(q), 250); return () => clearTimeout(t) }, [q])

  useEffect(() => {
    if (!debounced.trim()) { setMovies([]); setShows([]); setPeople([]); setLoading(false); return }
    let live = true
    setLoading(true)
    Promise.all([
      kind === 'all' || kind === 'movies' ? api.search(debounced, ['Movie']).catch(() => [] as Item[]) : Promise.resolve([] as Item[]),
      kind === 'all' || kind === 'shows' ? api.search(debounced, ['Series']).catch(() => [] as Item[]) : Promise.resolve([] as Item[]),
      kind === 'all' || kind === 'people' ? api.searchPeople(debounced) : Promise.resolve([] as Item[])
    ]).then(([m, s, p]) => {
      if (!live) return
      setMovies(m); setShows(s); setPeople(p); setLoading(false)
      if (m.length + s.length + p.length > 0) { saveRecent(debounced.trim()); setRecent(loadRecent()) }
    })
    return () => { live = false }
  }, [debounced, kind, api])

  // With nothing typed yet, suggest what is rated best.
  useEffect(() => {
    let live = true
    api.items({ types: ['Movie', 'Series'], sortBy: 'CommunityRating', sortOrder: 'Descending', limit: 20 }).then(p => { if (live) setTop(p.items) }).catch(() => {})
    return () => { live = false }
  }, [api])

  const update = (patch: Record<string, string>) =>
    setSp(prev => {
      const n = new URLSearchParams(prev)
      for (const [k, v] of Object.entries(patch)) { if (v && v !== 'all') n.set(k, v); else n.delete(k) }
      return n
    }, { replace: true })

  const found = movies.length + shows.length + people.length
  return (
    <div className="page search-page">
      <div className="search-input">
        <Icon name="search" size={22} />
        <input autoFocus value={q} placeholder={w.searchHint} onChange={e => update({ q: e.target.value })} aria-label="Search" />
      </div>
      <div className="seg chips" role="group" aria-label="Search in">
        {KINDS.map(([id, label]) => <button key={id} data-type={id} className={kind === id ? 'on' : ''} onClick={() => update({ type: id })}>{label}</button>)}
      </div>

      {!q.trim() && (
        <>
          {recent.length > 0 && (
            <div className="recent">
              <h3>Recent searches</h3>
              <div className="chips">{recent.map(r => <button key={r} onClick={() => update({ q: r })}>{r}</button>)}</div>
            </div>
          )}
          <Row title={w.topRated} items={top} api={api} />
        </>
      )}

      {q.trim() && (
        <>
          {loading && <p className="count">Searching…</p>}
          {!loading && found === 0 && <p className="empty">No results for “{q}”.</p>}
          {movies.length > 0 && <><h3 className="sec-title">Movies</h3><div className="grid">{movies.map(i => <Card key={i.Id} item={i} api={api} />)}</div></>}
          {shows.length > 0 && <><h3 className="sec-title">Shows</h3><div className="grid">{shows.map(i => <Card key={i.Id} item={i} api={api} />)}</div></>}
          {people.length > 0 && (
            <>
              <h3 className="sec-title">People</h3>
              <div className="people">
                {people.map(p => (
                  <Link key={p.Id} to={`/person/${p.Id}`} className="person" data-person={p.Id}>
                    {p.ImageTags?.Primary ? <img src={api.image(p.Id, p.ImageTags.Primary, 200)} alt="" loading="lazy" /> : <span className="ph">{p.Name.slice(0, 1)}</span>}
                    <span>{p.Name}</span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
