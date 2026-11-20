import type { Api, Item, Query } from '../api/jellyfin'
import { useLoad } from '../hooks/useLoad'
import { usePageTitle } from '../hooks/usePageTitle'
import { useTheme } from '../theme'
import { allOrFallback } from '../util/settle'
import { ErrorBox, RowsSkeleton } from '../components/Status'
import Row from '../components/Row'

interface Picks { added: Item[]; released: Item[]; top: Item[]; unseen: Item[] }

const titles = (api: Api, query: Query) => api.items({ types: ['Movie', 'Series'], limit: 20, ...query }).then(p => p.items)

async function loadPicks(api: Api): Promise<Picks> {
  const [added, released, top, unseen] = await allOrFallback([
    titles(api, { sortBy: 'DateCreated', sortOrder: 'Descending' }),
    titles(api, { sortBy: 'PremiereDate', sortOrder: 'Descending' }),
    titles(api, { sortBy: 'CommunityRating', sortOrder: 'Descending' }),
    titles(api, { filters: ['IsUnplayed'], sortBy: 'Random' })
  ], [] as Item[])
  return { added, released, top, unseen }
}

/** New & Popular / Just Added: what arrived lately, what is newest, what is rated best, and unwatched picks. */
export default function NewPopular({ api }: { api: Api }) {
  const { theme } = useTheme()
  const w = theme.words
  usePageTitle(w.newPage)
  const { data, error, reload } = useLoad(api, 'new', loadPicks, { remember: true })

  return (
    <div className="page new-page">
      <h1 className="page-title">{w.newPage}</h1>
      {error && <ErrorBox error={error} what="what's new" onRetry={reload} />}
      {!data && !error && <RowsSkeleton rows={2} />}
      {data && (
        <>
          <Row title="Recently Added" items={data.added} api={api} to="/movies?sort=added" />
          <Row title="New Releases" items={data.released} api={api} to="/movies?sort=released" />
          <Row title={w.topRated} items={data.top} api={api} to="/movies?sort=rating" ranked={theme.top10} />
          <Row title="Something You Haven't Seen" items={data.unseen} api={api} to="/movies?filter=unplayed" />
          {!data.added.length && !data.released.length && !data.top.length && !data.unseen.length && <p className="empty">Nothing here yet.</p>}
        </>
      )}
    </div>
  )
}
