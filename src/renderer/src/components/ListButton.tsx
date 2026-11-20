import type { Api, Item } from '../api/jellyfin'
import { useTheme } from '../theme'
import { toggleFavorite, useFlags } from '../userdata'
import Icon from './Icon'

/** The + / ✓ button that puts a title on your list (My List, My Stuff, Watchlist) or takes it off. */
export default function ListButton({ api, item, className = 'btn round', size = 18 }: { api: Api; item: Item; className?: string; size?: number }) {
  const { theme } = useTheme()
  const { fav } = useFlags(item)
  const label = fav ? `Remove from ${theme.words.myList}` : `Add to ${theme.words.myList}`
  return (
    <button className={`${className}${fav ? ' on' : ''}`.trim()} data-act="list" aria-pressed={fav} aria-label={label} title={label}
      onClick={() => toggleFavorite(api, item)}>
      <Icon name={fav ? 'check' : 'plus'} size={size} />
    </button>
  )
}
