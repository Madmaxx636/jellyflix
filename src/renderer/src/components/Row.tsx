import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Api, Item } from '../api/jellyfin'
import { useTheme } from '../theme'

export function Card({ item, api }: { item: Item; api: Api }) {
  const nav = useNavigate()
  const { theme } = useTheme()
  const wide = theme.shape === 'landscape'
  const img = wide ? api.thumb(item) : api.poster(item)
  const pct = item.UserData?.PlayedPercentage
  const label = item.Type === 'Episode' ? `${item.SeriesName} · S${item.ParentIndexNumber}E${item.IndexNumber}` : item.Name
  const target = item.Type === 'Episode' && item.SeriesId ? item.SeriesId : item.Id
  return (
    <div className={`card ${wide ? 'wide' : 'tall'}`} onClick={() => nav(`/title/${target}`)} title={label}>
      {img ? <img src={img} loading="lazy" alt={item.Name} /> : <div className="noimg">{item.Name}</div>}
      {wide && <div className="card-title">{label}</div>}
      {pct ? <div className="progress"><div style={{ width: `${pct}%` }} /></div> : null}
    </div>
  )
}

export default function Row({ title, items, api }: { title: string; items: Item[]; api: Api }) {
  const ref = useRef<HTMLDivElement>(null)
  if (!items.length) return null
  const scroll = (d: number) => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.85, behavior: 'smooth' })
  return (
    <section className="row">
      <h3>{title}</h3>
      <div className="row-wrap">
        <button className="arrow left" onClick={() => scroll(-1)} aria-label="Scroll left">‹</button>
        <div className="row-scroll" ref={ref}>{items.map(i => <Card key={i.Id} item={i} api={api} />)}</div>
        <button className="arrow right" onClick={() => scroll(1)} aria-label="Scroll right">›</button>
      </div>
    </section>
  )
}
