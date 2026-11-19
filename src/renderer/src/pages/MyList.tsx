import type { Api } from '../api/jellyfin'
import { useTheme } from '../theme'
import Browse from '../components/Browse'

const BASE = { types: ['Movie', 'Series', 'BoxSet'] }
const FAV: 'IsFavorite'[] = ['IsFavorite']

/** My List / My Stuff / Watchlist: everything marked as a favourite in Jellyfin. */
export default function MyList({ api }: { api: Api }) {
  const { theme } = useTheme()
  const w = theme.words
  return (
    <Browse api={api} title={w.myList} base={BASE} lockedFilters={FAV} hideFilter dropUnfavorited defaultSort="added"
      empty={`Your ${w.myList} is empty. Use the + button on any title to save it here.`} />
  )
}
