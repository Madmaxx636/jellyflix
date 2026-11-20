import { Link, useNavigate } from 'react-router-dom'
import type { Api, Item } from '../api/jellyfin'
import { useTheme } from '../theme'
import { isPlayable, openTarget, playItem } from '../util/play'
import { ticksToMin } from '../util/time'
import Icon from './Icon'
import ListButton from './ListButton'

/**
 * A poster or wide tile. The whole card is a link to the title (a real link, so it can be reached and activated with the
 * keyboard); hovering or focusing it reveals Play, add-to-list and a hint to open it.
 */
export function Card({ item, api }: { item: Item; api: Api }) {
  const nav = useNavigate()
  const { theme } = useTheme()
  const wide = theme.shape === 'landscape'
  const img = wide ? api.thumb(item) : api.poster(item)
  const pct = item.UserData?.PlayedPercentage
  const label = item.Type === 'Episode' ? `${item.SeriesName} · S${item.ParentIndexNumber}E${item.IndexNumber}` : item.Name
  const meta = [item.ProductionYear, item.OfficialRating, item.RunTimeTicks ? `${ticksToMin(item.RunTimeTicks)} min` : ''].filter(Boolean).join(' · ')

  return (
    <div className={`card ${wide ? 'wide' : 'tall'}`} title={label} data-id={item.Id}>
      {img ? <img src={img} loading="lazy" alt="" /> : <div className="noimg">{item.Name}</div>}
      {wide && <div className="card-title">{label}</div>}
      {pct ? <div className="progress"><div style={{ width: `${pct}%` }} /></div> : null}
      <Link className="card-link" to={`/title/${encodeURIComponent(openTarget(item))}`} aria-label={label} />
      <div className="card-hover">
        <div className="card-name">{label}</div>
        {meta && <div className="card-meta">{meta}</div>}
        <div className="card-btns">
          {isPlayable(item) && (
            <button aria-label={`${theme.words.play}: ${label}`} data-act="play" onClick={() => playItem(api, item, nav)}><Icon name="play" size={16} /></button>
          )}
          <ListButton api={api} item={item} className="" size={16} />
          <span className="card-more" aria-hidden="true"><Icon name="chevron" size={16} /></span>
        </div>
      </div>
    </div>
  )
}
