import type { KeyboardEvent, MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Api, Item, ticksToMin } from '../api/jellyfin'
import { useTheme } from '../theme'
import { isPlayable, openTarget, playItem } from '../util/play'
import { toggleFavorite, useFlags } from '../userdata'
import Icon from './Icon'

/** A poster or wide tile. Hovering reveals Play, add-to-list and more-info buttons. */
export function Card({ item, api }: { item: Item; api: Api }) {
  const nav = useNavigate()
  const { theme } = useTheme()
  const flags = useFlags(item)
  const wide = theme.shape === 'landscape'
  const img = wide ? api.thumb(item) : api.poster(item)
  const pct = item.UserData?.PlayedPercentage
  const isEp = item.Type === 'Episode'
  const label = isEp ? `${item.SeriesName} · S${item.ParentIndexNumber}E${item.IndexNumber}` : item.Name
  const open = () => nav(`/title/${openTarget(item)}`)
  const stop = (fn: () => void) => (e: MouseEvent) => { e.stopPropagation(); fn() }
  const meta = [item.ProductionYear, item.OfficialRating, item.RunTimeTicks ? `${ticksToMin(item.RunTimeTicks)} min` : ''].filter(Boolean).join(' · ')
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter') open() }
  const listLabel = flags.fav ? `Remove from ${theme.words.myList}` : `Add to ${theme.words.myList}`

  return (
    <div className={`card ${wide ? 'wide' : 'tall'}`} tabIndex={0} role="link" onClick={open} onKeyDown={onKey} title={label} data-id={item.Id}>
      {img ? <img src={img} loading="lazy" alt={item.Name} /> : <div className="noimg">{item.Name}</div>}
      {wide && <div className="card-title">{label}</div>}
      {pct ? <div className="progress"><div style={{ width: `${pct}%` }} /></div> : null}
      <div className="card-hover">
        <div className="card-name">{label}</div>
        {meta && <div className="card-meta">{meta}</div>}
        <div className="card-btns">
          {isPlayable(item) && (
            <button aria-label={theme.words.play} data-act="play" onClick={stop(() => playItem(api, item, nav))}><Icon name="play" size={16} /></button>
          )}
          <button className={flags.fav ? 'on' : ''} aria-label={listLabel} aria-pressed={flags.fav} data-act="list"
            onClick={stop(() => toggleFavorite(api, item))}><Icon name={flags.fav ? 'check' : 'plus'} size={16} /></button>
          <button aria-label="More info" data-act="info" onClick={stop(open)}><Icon name="chevron" size={16} /></button>
        </div>
      </div>
    </div>
  )
}
