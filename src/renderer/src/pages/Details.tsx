import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Api, Item, ticksToMin } from '../api/jellyfin'
import Row from '../components/Row'

export default function Details({ api }: { api: Api }) {
  const { id } = useParams()
  const nav = useNavigate()
  const [item, setItem] = useState<Item | null>(null)
  const [episodes, setEpisodes] = useState<Item[]>([])
  const [similar, setSimilar] = useState<Item[]>([])
  const [season, setSeason] = useState<number>(1)

  useEffect(() => {
    if (!id) return
    setItem(null); setEpisodes([]); setSimilar([])
    api.item(id).then(async it => {
      setItem(it)
      if (it.Type === 'Series') {
        const eps = await api.episodes(it.Id)
        setEpisodes(eps)
        const next = eps.find(e => !e.UserData?.Played) ?? eps[0]
        if (next?.ParentIndexNumber != null) setSeason(next.ParentIndexNumber)
      }
    })
    api.similar(id).then(setSimilar).catch(() => {})
    window.scrollTo(0, 0)
  }, [id, api])

  if (!item) return <p className="pad">Loading…</p>
  const bg = api.backdrop(item)
  const seasons = [...new Set(episodes.map(e => e.ParentIndexNumber ?? 0))]
  const playTarget = item.Type === 'Series' ? (episodes.find(e => !e.UserData?.Played) ?? episodes[0]) : item
  const resumeMin = ticksToMin(playTarget?.UserData?.PlaybackPositionTicks)

  return (
    <>
      <header className="hero details">
        <div className="hero-art" style={bg ? { backgroundImage: `url(${bg})` } : undefined} />
        <div className="hero-fade" />
        <div className="hero-body">
          <h1>{item.Name}</h1>
          <p className="meta">
            {item.ProductionYear} {item.OfficialRating && <span className="badge">{item.OfficialRating}</span>}
            {item.Type === 'Movie' && ` ${ticksToMin(item.RunTimeTicks)} min`}
            {item.CommunityRating ? ` ★ ${item.CommunityRating.toFixed(1)}` : ''}
          </p>
          <p className="overview">{item.Overview}</p>
          <p className="genres">{item.Genres?.join(' · ')}</p>
          <div className="actions">
            {playTarget && (
              <button className="btn primary" onClick={() => nav(`/play/${playTarget.Id}`)}>
                ▶ {resumeMin ? `Resume (${resumeMin} min in)` : 'Play'}
              </button>
            )}
            <button className="btn" onClick={() => nav(-1)}>← Back</button>
          </div>
        </div>
      </header>
      <div className="rows">
        {item.Type === 'Series' && (
          <section className="episodes">
            <div className="ep-head">
              <h3>Episodes</h3>
              <select value={season} onChange={e => setSeason(Number(e.target.value))}>
                {seasons.map(s => <option key={s} value={s}>{s === 0 ? 'Specials' : `Season ${s}`}</option>)}
              </select>
            </div>
            {episodes.filter(e => (e.ParentIndexNumber ?? 0) === season).map(e => (
              <div className="episode" key={e.Id} onClick={() => nav(`/play/${e.Id}`)}>
                <span className="num">{e.IndexNumber}</span>
                <div className="ep-body">
                  <div className="ep-title">{e.Name}{e.UserData?.Played ? ' ✓' : ''}</div>
                  <div className="ep-ov">{e.Overview}</div>
                </div>
              </div>
            ))}
          </section>
        )}
        <Row title="More Like This" items={similar} api={api} />
      </div>
    </>
  )
}
