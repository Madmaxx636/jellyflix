import type { Api } from '../api/jellyfin'
import { useLoad } from '../hooks/useLoad'
import { usePageTitle } from '../hooks/usePageTitle'
import { useTheme } from '../theme'
import { isBrowsable } from '../util/library'
import { ErrorBox, TilesSkeleton } from '../components/Status'
import { LibraryTile } from '../components/Tiles'
import Row from '../components/Row'

/** Every video library on the server, plus its collections. Called Hubs, Brands or Libraries depending on the look. */
export default function Libraries({ api }: { api: Api }) {
  const { theme } = useTheme()
  usePageTitle(theme.words.libraries)
  const views = useLoad(api, 'views', async a => (await a.views()).filter(isBrowsable), { remember: true })
  const collections = useLoad(api, 'boxsets', a => a.items({ types: ['BoxSet'], sortBy: 'SortName', limit: 24 }).then(p => p.items), { remember: true })

  return (
    <div className="page libraries">
      <h1 className="page-title">{theme.words.libraries}</h1>
      {views.error && <ErrorBox error={views.error} what="libraries" onRetry={views.reload} />}
      {!views.data && !views.error && <TilesSkeleton />}
      <div className="tiles libs">{views.data?.map(v => <LibraryTile key={v.Id} api={api} view={v} />)}</div>
      {views.data && !views.data.length && <p className="empty">No video libraries were found for this account.</p>}
      <Row title={theme.words.collections} items={collections.data ?? []} api={api} to="/collections" />
    </div>
  )
}
