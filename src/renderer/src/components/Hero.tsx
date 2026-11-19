import { useNavigate } from 'react-router-dom'
import { Api, Item, ticksToMin } from '../api/jellyfin'

export default function Hero({ item, api }: { item: Item; api: Api }) {
  const nav = useNavigate()
  const bg = api.backdrop(item)
  return (
    <header className="hero">
      <div className="hero-art" style={bg ? { backgroundImage: `url(${bg})` } : undefined} />
      <div className="hero-fade" />
      <div className="hero-body">
        <h1>{item.Name}</h1>
        <p className="meta">
          {item.ProductionYear} {item.OfficialRating && <span className="badge">{item.OfficialRating}</span>}
          {item.Type === 'Movie' && ` ${ticksToMin(item.RunTimeTicks)} min`}
        </p>
        <p className="overview">{item.Overview}</p>
        <div className="actions">
          {item.Type === 'Movie' && <button className="btn primary" onClick={() => nav(`/play/${item.Id}`)}>▶ Play</button>}
          <button className="btn" onClick={() => nav(`/title/${item.Id}`)}>ⓘ More Info</button>
        </div>
      </div>
    </header>
  )
}
