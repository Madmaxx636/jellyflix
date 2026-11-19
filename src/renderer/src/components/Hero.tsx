import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Api, Item, ticksToMin } from '../api/jellyfin'
import { useTheme } from '../theme'
import { useSettings } from '../settings'
import { isPlayable, playItem } from '../util/play'
import { toggleFavorite, useFlags } from '../userdata'
import Icon from './Icon'

/** The featured banner: a single title, or a rotating carousel of up to five, depending on the look. */
export default function Hero({ items, api }: { items: Item[]; api: Api }) {
  const { theme } = useTheme()
  const { settings } = useSettings()
  const [i, setI] = useState(0)
  const [hover, setHover] = useState(false)
  const slides = theme.hero === 'carousel' ? items.slice(0, 5) : items.slice(0, 1)
  const rotate = theme.hero === 'carousel' && settings.rotateHero && !settings.reduceMotion && slides.length > 1 && !hover

  useEffect(() => {
    if (!rotate) return
    const t = setInterval(() => setI(n => (n + 1) % slides.length), 8000)
    return () => clearInterval(t)
  }, [rotate, slides.length])
  useEffect(() => { if (i >= slides.length) setI(0) }, [slides.length, i])

  const item = slides[i] ?? slides[0]
  if (!item) return null
  return (
    <header className={`hero ${theme.hero}`} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} data-hero={item.Id}>
      <Slide item={item} api={api} />
      {slides.length > 1 && (
        <>
          <div className="hero-dots">
            {slides.map((s, n) => <button key={s.Id} className={n === i ? 'on' : ''} aria-label={`Show ${s.Name}`} onClick={() => setI(n)} />)}
          </div>
          <button className="hero-nav prev" aria-label="Previous" onClick={() => setI((i + slides.length - 1) % slides.length)}><Icon name="left" size={28} /></button>
          <button className="hero-nav next" aria-label="Next" onClick={() => setI((i + 1) % slides.length)}><Icon name="right" size={28} /></button>
        </>
      )}
    </header>
  )
}

function Slide({ item, api }: { item: Item; api: Api }) {
  const nav = useNavigate()
  const { theme } = useTheme()
  const flags = useFlags(item)
  const w = theme.words
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
          {isPlayable(item) && <button className="btn primary" data-act="play" onClick={() => playItem(api, item, nav)}><Icon name="play" size={18} />{w.play}</button>}
          <button className="btn" data-act="info" onClick={() => nav(`/title/${item.Id}`)}><Icon name="info" size={18} />More Info</button>
          <button className={`btn round ${flags.fav ? 'on' : ''}`} data-act="list" aria-pressed={flags.fav}
            aria-label={flags.fav ? `Remove from ${w.myList}` : `Add to ${w.myList}`} onClick={() => toggleFavorite(api, item)}>
            <Icon name={flags.fav ? 'check' : 'plus'} size={18} />
          </button>
        </div>
      </div>
    </>
  )
}
