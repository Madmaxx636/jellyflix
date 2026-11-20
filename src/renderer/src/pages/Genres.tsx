import { useParams } from 'react-router-dom'
import type { Api } from '../api/jellyfin'
import { useLoad } from '../hooks/useLoad'
import { usePageTitle } from '../hooks/usePageTitle'
import { useTheme } from '../theme'
import { ErrorBox, TilesSkeleton } from '../components/Status'
import { GenreTile } from '../components/Tiles'
import Browse from '../components/Browse'

const BOTH = { types: ['Movie', 'Series'] }

/** Every genre as a tile. */
export function Genres({ api }: { api: Api }) {
  const { theme } = useTheme()
  usePageTitle(theme.words.genres)
  const { data: names, error, reload } = useLoad(api, 'genres', a => a.genres(), { remember: true })
  return (
    <div className="page genres-page">
      <h1 className="page-title">{theme.words.genres}</h1>
      {error && <ErrorBox error={error} what="genres" onRetry={reload} />}
      {!names && !error && <TilesSkeleton count={12} />}
      <div className="tiles genres">{names?.map(n => <GenreTile key={n} api={api} name={n} />)}</div>
      {names && !names.length && <p className="empty">No genres yet.</p>}
    </div>
  )
}

/** The titles in one genre. */
export function Genre({ api }: { api: Api }) {
  const { name = '' } = useParams()
  return <Browse api={api} title={name} base={BOTH} lockedGenre={name} typeSwitch />
}
