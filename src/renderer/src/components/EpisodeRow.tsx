import { Link } from 'react-router-dom'
import type { Api, Item } from '../api/jellyfin'
import { ticksToMin } from '../util/time'
import Icon from './Icon'
import WatchedButton from './WatchedButton'

/** One episode in a season list: its picture, number, description, and a watched button. The row itself is the link that plays it. */
export default function EpisodeRow({ ep, api }: { ep: Item; api: Api }) {
  const pct = ep.UserData?.PlayedPercentage
  const thumb = ep.ImageTags?.Primary ? api.image(ep.Id, ep.ImageTags.Primary, 320) : ''
  return (
    <div className="episode" data-ep={ep.Id}>
      <Link className="ep-link" to={`/play/${encodeURIComponent(ep.Id)}`} aria-label={`Play episode ${ep.IndexNumber}: ${ep.Name}`} />
      <span className="num">{ep.IndexNumber}</span>
      <div className="ep-thumb">
        {thumb ? <img src={thumb} alt="" loading="lazy" /> : null}
        <span className="ep-play"><Icon name="play" size={22} /></span>
        {pct ? <div className="progress"><div style={{ width: `${pct}%` }} /></div> : null}
      </div>
      <div className="ep-body">
        <div className="ep-title">{ep.Name}</div>
        <div className="ep-ov">{ep.Overview}</div>
      </div>
      <span className="ep-time">{ep.RunTimeTicks ? `${ticksToMin(ep.RunTimeTicks)} min` : ''}</span>
      <WatchedButton api={api} item={ep} className="ep-watched" onIcon="check" />
    </div>
  )
}
