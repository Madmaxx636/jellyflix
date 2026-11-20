import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import type { Api, Item } from '../api/jellyfin'
import { useLoad } from '../hooks/useLoad'
import { useParamUpdater } from '../hooks/useParamUpdater'
import { usePageTitle } from '../hooks/usePageTitle'
import { useTheme } from '../theme'
import { allOrFallback } from '../util/settle'
import { Card } from '../components/Card'
import Icon from '../components/Icon'
import Row from '../components/Row'
import { ErrorBox } from '../components/Status'

const RECENT = 'jellyflix.recent'
const KINDS = [['all', 'All'], ['movies', 'Movies'], ['shows', 'Shows'], ['people', 'People']] as const
type Kind = (typeof KINDS)[number][0]
interface Results { movies: Item[]; shows: Item[]; people: Item[] }
const NOTHING: Results = { movies: [], shows: [], people: [] }
const TYPING_PAUSE_MS = 250

const loadRecent = (): string[] => {
  try {
    const list: unknown = JSON.parse(localStorage.getItem(RECENT) ?? '[]')
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : []
  } catch { return [] }
}
const saveRecent = (q: string) => {
  try { localStorage.setItem(RECENT, JSON.stringify([q, ...loadRecent().filter(x => x.toLowerCase() !== q.toLowerCase())].slice(0, 8))) } catch { /* storage unavailable */ }
}

async function searchFor(api: Api, query: string, kind: Kind): Promise<Results> {
  if (!query) return NOTHING
  const wants = (k: Kind) => kind === 'all' || kind === k
  const jobs: { into: keyof Results; call: Promise<Item[]> }[] = []
  if (wants('movies')) jobs.push({ into: 'movies', call: api.search(query, ['Movie']) })
  if (wants('shows')) jobs.push({ into: 'shows', call: api.search(query, ['Series']) })
  if (wants('people')) jobs.push({ into: 'people', call: api.searchPeople(query) })
  const found = await allOrFallback(jobs.map(j => j.call), [] as Item[])
  const out: Results = { movies: [], shows: [], people: [] }
  jobs.forEach((j, i) => { out[j.into] = found[i] })
  if (out.movies.length + out.shows.length + out.people.length > 0) saveRecent(query) // worth coming back to
  return out
}

export default function Search({ api }: { api: Api }) {
  const { theme } = useTheme()
  const w = theme.words
  const [params] = useSearchParams()
  const update = useParamUpdater()
  const q = params.get('q') ?? ''
  const kind: Kind = KINDS.find(([id]) => id === params.get('type'))?.[0] ?? 'all'
  usePageTitle(q.trim() ? `Search: ${q.trim()}` : 'Search')

  // Search once typing pauses, not on every key.
  const [typed, setTyped] = useState(q)
  useEffect(() => {
    const timer = setTimeout(() => setTyped(q), TYPING_PAUSE_MS)
    return () => clearTimeout(timer)
  }, [q])
  const query = typed.trim()

  const results = useLoad(api, `${query}|${kind}`, a => searchFor(a, query, kind), { keepPrevious: true })
  const suggestions = useLoad(api, 'suggested', a => a.items({ types: ['Movie', 'Series'], sortBy: 'CommunityRating', sortOrder: 'Descending', limit: 20 }).then(p => p.items), { remember: true })
  const showingSuggestions = !q.trim()
  const recent = useMemo(() => (showingSuggestions ? loadRecent() : []), [showingSuggestions]) // read again each time the box is emptied
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => { input.current?.focus() }, [])

  const found = results.data ? results.data.movies.length + results.data.shows.length + results.data.people.length : 0
  const settled = !!results.data && !results.loading

  const { movies, shows, people } = results.data ?? NOTHING
  return (
    <div className="page search-page">
      <div className="search-input">
        <Icon name="search" size={22} />
        <input ref={input} type="search" value={q} placeholder={w.searchHint} onChange={e => update({ q: e.target.value })} aria-label="Search" />
      </div>
      <div className="seg chips" role="group" aria-label="Search in">
        {KINDS.map(([id, label]) => <button key={id} data-type={id} aria-pressed={kind === id} className={kind === id ? 'on' : ''} onClick={() => update({ type: id })}>{label}</button>)}
      </div>

      {showingSuggestions && (
        <>
          {recent.length > 0 && (
            <div className="recent">
              <h3>Recent searches</h3>
              <div className="chips">{recent.map(r => <button key={r} onClick={() => update({ q: r })}>{r}</button>)}</div>
            </div>
          )}
          <Row title={w.topRated} items={suggestions.data ?? []} api={api} />
        </>
      )}

      {!showingSuggestions && (
        <>
          {results.error && <ErrorBox error={results.error} what="search results" onRetry={results.reload} />}
          {results.loading && !results.error && <p className="count" role="status">Searching…</p>}
          {settled && found === 0 && <p className="empty" role="status">No results for “{q}”.</p>}
          {movies.length > 0 && <><h2 className="sec-title">Movies</h2><div className="grid">{movies.map(i => <Card key={i.Id} item={i} api={api} />)}</div></>}
          {shows.length > 0 && <><h2 className="sec-title">Shows</h2><div className="grid">{shows.map(i => <Card key={i.Id} item={i} api={api} />)}</div></>}
          {people.length > 0 && (
            <>
              <h2 className="sec-title">People</h2>
              <div className="people">
                {people.map(p => (
                  <Link key={p.Id} to={`/person/${encodeURIComponent(p.Id)}`} className="person" data-person={p.Id}>
                    {p.ImageTags?.Primary ? <img src={api.image(p.Id, p.ImageTags.Primary, 200)} alt="" loading="lazy" /> : <span className="ph" aria-hidden="true">{p.Name.slice(0, 1)}</span>}
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
