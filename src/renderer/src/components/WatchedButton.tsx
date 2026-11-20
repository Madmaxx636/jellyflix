import type { Api, Item } from '../api/jellyfin'
import { togglePlayed, useFlags } from '../userdata'
import Icon, { type IconName } from './Icon'

/** Marks a title or episode as watched, or as not watched. */
export default function WatchedButton({ api, item, className = 'btn round', size = 18, onIcon = 'eye' }: {
  api: Api
  item: Item
  className?: string
  size?: number
  /** The icon shown while it is marked as watched. */
  onIcon?: IconName
}) {
  const { played } = useFlags(item)
  const label = played ? 'Mark as unwatched' : 'Mark as watched'
  return (
    <button className={`${className}${played ? ' on' : ''}`.trim()} data-act="watched" aria-pressed={played} aria-label={label} title={label}
      onClick={() => togglePlayed(api, item)}>
      <Icon name={played ? onIcon : 'eye'} size={size} />
    </button>
  )
}
