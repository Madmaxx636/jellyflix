import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Api, Item } from '../api/jellyfin'
import { usePageVisible } from '../hooks/usePageVisible'
import { useSettings } from '../settings'
import { useTheme } from '../theme'
import { isPlayable, playItem } from '../util/play'
import { ticksToMin } from '../util/time'
import Icon from './Icon'
import ListButton from './ListButton'

const ROTATE_EVERY_MS = 8000

/** The featured banner: a single title, or a rotating carousel of up to five, depending on the look. */
export default function Hero({ items, api }: { items: Item[]; api: Api }) {
  const { theme } = useTheme()
  const { settings } = useSettings()
  const visible = usePageVisible()
  const [requested, setRequested] = useState(0)
  const [hover, setHover] = useState(false)
  const slides = theme.hero === 'carousel' ? items.slice(0, 5) : items.slice(0, 1)
  const index = requested < slides.length ? requested : 0
  const rotate = theme.hero === 'carousel' && settings.rotateHero && !settings.reduceMotion && slides.length > 1 && !hover && visible

  useEffect(() => {
    if (!rotate) return
    const timer = setInterval(() => setRequested(n => (n + 1) % slides.length), ROTATE_EVERY_MS)
    return () => clearInterval(timer)
  }, [rotate, slides.length])

  const item = slides[index]
  if (!item) return null
  return (
    <header className={`hero ${theme.hero}`} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} data-hero={item.Id}>
      <Slide item={item} api={api} />
      {slides.length > 1 && (
        <>
          <div className="hero-dots">
            {slides.map((s, n) => <button key={s.Id} className={n === index ? 'on' : ''} aria-label={`Show ${s.Name}`} aria-current={n === index} onClick={() => setRequested(n)} />)}
          </div>
          <button className="hero-nav prev" aria-label="Previous" onClick={() => setRequested((index + slides.length - 1) % slides.length)}><Icon name="left" size={28} /></button>
          <button className="hero-nav next" aria-label="Next" onClick={() => setRequested((index + 1) % slides.length)}><Icon name="right" size={28} /></button>
        </>
      )}
    </header>
  )
}

function Slide({ item, api }: { item: Item; api: Api }) {
  const nav = useNavigate()
  const { theme } = useTheme()
  const bg = api.backdrop(item)
  return (
    <>
      <div className="hero-art" key={item.Id} style={bg ? { backgroundImage: `url(${bg})` } : undefined} />
      <div className="hero-fade" />
      <div className="hero-body" key={`b${item.Id}`}>
        <h1>{item.Name}</h1>
        <p className="meta">
          {item.ProductionYear} {item.OfficialRating && <span className="badge">{item.OfficialRating}</span>}
          {item.Type === 'Movie' && item.RunTimeTicks ? ` ${ticksToMin(item.RunTimeTicks)} min` : ''}
          {item.Genres?.length ? ` · ${item.Genres.slice(0, 2).join(' · ')}` : ''}
        </p>
        <p className="overview">{item.Overview}</p>
        <div className="actions">
          {isPlayable(item) && <button className="btn primary" data-act="play" onClick={() => playItem(api, item, nav)}><Icon name="play" size={18} />{theme.words.play}</button>}
          <button className="btn" data-act="info" onClick={() => nav(`/title/${encodeURIComponent(item.Id)}`)}><Icon name="info" size={18} />More Info</button>
          <ListButton api={api} item={item} />
        </div>
      </div>
    </>
  )
}
