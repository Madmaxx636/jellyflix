import type { Api } from '../api/jellyfin'
import { useTheme } from '../theme'
import Browse from '../components/Browse'

const MOVIES = { types: ['Movie'] }
const SHOWS = { types: ['Series'] }
const MOVIE_SCOPE = { types: ['Movie'] }
const SHOW_SCOPE = { types: ['Series'] }

/** All movies, or all shows, across every library, with a genre menu like the real services have. */
export default function Catalog({ api, kind }: { api: Api; kind: 'movies' | 'shows' }) {
  const { theme } = useTheme()
  const path = kind === 'movies' ? '/movies' : '/shows'
  const title = theme.nav.find(n => n.to === path)?.label ?? (kind === 'movies' ? 'Movies' : 'Shows')
  return <Browse api={api} title={title} base={kind === 'movies' ? MOVIES : SHOWS} genreScope={kind === 'movies' ? MOVIE_SCOPE : SHOW_SCOPE} />
}
