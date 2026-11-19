import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { type Api, type Item, ticksToMin } from '../api/jellyfin'
import { useTheme } from '../theme'
import { langName } from '../settings'
import { toggleFavorite, togglePlayed, useFlags } from '../userdata'
import Row from '../components/Row'
import Browse from '../components/Browse'
import Icon from '../components/Icon'

type Tab = 'episodes' | 'suggested' | 'extras' | 'details'
const EMPTY: Item = { Id: '', Name: '', Type: '' }
const uniq = (list: string[]) => [...new Set(list.filter(Boolean))]

function EpisodeRow({ ep, api }: { ep: Item; api: Api }) {
  const nav = useNavigate()
  const flags = useFlags(ep)
  const pct = ep.UserData?.PlayedPercentage
  const thumb = ep.ImageTags?.Primary ? api.image(ep.Id, ep.ImageTags.Primary, 320) : ''
  return (
    <div className="episode" onClick={() => nav(`/play/${ep.Id}`)} data-ep={ep.Id}>
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
      <button className={`ep-watched ${flags.played ? 'on' : ''}`} data-act="watched" aria-pressed={flags.played}
        aria-label={flags.played ? 'Mark as unwatched' : 'Mark as watched'}
        onClick={e => { e.stopPropagation(); togglePlayed(api, ep) }}><Icon name={flags.played ? 'check' : 'eye'} size={18} /></button>
    </div>
  )
}

export default function Details({ api }: { api: Api }) {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const { theme } = useTheme()
  const w = theme.words
  const [item, setItem] = useState<Item | null>(null)
  const [episodes, setEpisodes] = useState<Item[]>([])
  const [similar, setSimilar] = useState<Item[]>([])
  const [extras, setExtras] = useState<Item[]>([])
  const [season, setSeason] = useState(1)
  const [tab, setTab] = useState<Tab | null>(null)
  const [err, setErr] = useState('')
  const flags = useFlags(item ?? EMPTY)
  const boxBase = useMemo(() => ({ parentId: id, types: ['Movie', 'Series'] }), [id])

  useEffect(() => {
    let live = true
    setItem(null); setEpisodes([]); setSimilar([]); setExtras([]); setErr(''); setTab(null)
    api.item(id).then(async it => {
      if (!live) return
      setItem(it)
      if (it.Type === 'Series') {
        const eps = await api.episodes(it.Id).catch(() => [] as Item[])
        if (!live) return
        setEpisodes(eps)
        const next = eps.find(e => !e.UserData?.Played) ?? eps[0]
        if (next?.ParentIndexNumber != null) setSeason(next.ParentIndexNumber)
      }
    }).catch(e => { if (live) setErr((e as Error).message) })
    api.similar(id).then(s => { if (live) setSimilar(s) }).catch(() => {})
    api.extras(id).then(x => { if (live) setExtras(x) }).catch(() => {})
    return () => { live = false }
  }, [id, api])

  const isSeries = item?.Type === 'Series'
  const isBox = item?.Type === 'BoxSet'
  const tabs = useMemo(() => {
    const t: { id: Tab; label: string }[] = []
    if (isSeries) t.push({ id: 'episodes', label: w.episodes })
    if (similar.length) t.push({ id: 'suggested', label: w.moreLikeThis })
    if (extras.length) t.push({ id: 'extras', label: w.extras })
    t.push({ id: 'details', label: w.details })
    return t
  }, [isSeries, similar.length, extras.length, w.episodes, w.moreLikeThis, w.extras, w.details])
  const active: Tab = tab && tabs.some(t => t.id === tab) ? tab : tabs[0].id
  const show = (t: Tab) => !theme.detailTabs || active === t

  if (err) return <p className="pad error">Couldn't load this title: {err}</p>
  if (!item) return <p className="pad count">Loading…</p>

  const bg = api.backdrop(item)
  const seasons = [...new Set(episodes.map(e => e.ParentIndexNumber ?? 0))]
  const playTarget = isBox ? null : isSeries ? (episodes.find(e => !e.UserData?.Played) ?? episodes[0]) : item
  const resumeSec = (playTarget?.UserData?.PlaybackPositionTicks ?? 0) / 1e7
  const resuming = resumeSec > 5 // the player starts from a saved spot past 5 seconds
  const resumeLabel = resumeSec >= 60 ? `${w.resume} (${Math.round(resumeSec / 60)} min in)` : w.resume
  const trailer = item.RemoteTrailers?.[0]?.Url
  const people = item.People ?? []
  const cast = people.filter(p => p.Type === 'Actor' || p.Type === 'GuestStar')
  const crew = people.filter(p => p.Type === 'Director' || p.Type === 'Writer' || p.Type === 'Producer')
  const streams = item.MediaSources?.[0]?.MediaStreams ?? []
  const audioLangs = uniq(streams.filter(s => s.Type === 'Audio').map(s => langName(s.Language)))
  const subLangs = uniq(streams.filter(s => s.Type === 'Subtitle').map(s => langName(s.Language)))

  return (
    <>
      <header className="hero details">
        <div className="hero-art" style={bg ? { backgroundImage: `url(${bg})` } : undefined} />
        <div className="hero-fade" />
        <div className="hero-body">
          <h1>{item.Name}</h1>
          <p className="meta">
            {item.ProductionYear} {item.OfficialRating && <span className="badge">{item.OfficialRating}</span>}
            {item.Type === 'Movie' && item.RunTimeTicks ? ` ${ticksToMin(item.RunTimeTicks)} min` : ''}
            {item.CommunityRating ? ` ★ ${item.CommunityRating.toFixed(1)}` : ''}
          </p>
          {item.Taglines?.[0] && <p className="tagline">{item.Taglines[0]}</p>}
          <p className="overview">{item.Overview}</p>
          <p className="genres">
            {item.Genres?.map((g, i) => <span key={g}>{i > 0 && ' · '}<Link to={`/genre/${encodeURIComponent(g)}`}>{g}</Link></span>)}
          </p>
          <div className="actions">
            {playTarget && (
              <button className="btn primary" data-act="play" onClick={() => nav(`/play/${playTarget.Id}`)}>
                <Icon name="play" size={18} />{resuming ? resumeLabel : w.play}
              </button>
            )}
            {playTarget && resuming && <button className="btn" data-act="restart" onClick={() => nav(`/play/${playTarget.Id}?t=0`)}>{w.playFromStart}</button>}
            <button className={`btn round ${flags.fav ? 'on' : ''}`} data-act="list" aria-pressed={flags.fav}
              aria-label={flags.fav ? `Remove from ${w.myList}` : `Add to ${w.myList}`} title={flags.fav ? `Remove from ${w.myList}` : `Add to ${w.myList}`}
              onClick={() => toggleFavorite(api, item)}><Icon name={flags.fav ? 'check' : 'plus'} size={18} /></button>
            {!isBox && (
              <button className={`btn round ${flags.played ? 'on' : ''}`} data-act="watched" aria-pressed={flags.played}
                aria-label={flags.played ? 'Mark as unwatched' : 'Mark as watched'} title={flags.played ? 'Mark as unwatched' : 'Mark as watched'}
                onClick={() => togglePlayed(api, item)}><Icon name="eye" size={18} /></button>
            )}
            {trailer && (
              <button className="btn round" data-act="trailer" aria-label="Watch trailer" title="Watch trailer" onClick={() => window.open(trailer, '_blank')}>
                <Icon name="external" size={18} />
              </button>
            )}
            <button className="btn" onClick={() => nav(-1)}>← Back</button>
          </div>
        </div>
      </header>

      <div className="rows details-body">
        {isBox ? (
          <Browse api={api} title={`In this ${w.collections.toLowerCase().replace(/s$/, '')}`} base={boxBase} hideFilter empty="Nothing in this collection yet." />
        ) : (
          <>
            {theme.detailTabs && (
              <div className="tabs" role="tablist">
                {tabs.map(t => <button key={t.id} role="tab" aria-selected={active === t.id} data-tab={t.id} className={active === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>)}
              </div>
            )}

            {isSeries && show('episodes') && (
              <section className="episodes" data-section="episodes">
                <div className="ep-head">
                  {!theme.detailTabs && <h3>{w.episodes}</h3>}
                  <select value={season} aria-label="Season" onChange={e => setSeason(Number(e.target.value))}>
                    {seasons.map(s => <option key={s} value={s}>{s === 0 ? 'Specials' : `Season ${s}`}</option>)}
                  </select>
                </div>
                {episodes.filter(e => (e.ParentIndexNumber ?? 0) === season).map(e => <EpisodeRow key={e.Id} ep={e} api={api} />)}
              </section>
            )}

            {show('suggested') && <Row title={w.moreLikeThis} items={similar} api={api} />}

            {extras.length > 0 && show('extras') && (
              <section className="extras" data-section="extras">
                {!theme.detailTabs && <h3>{w.extras}</h3>}
                <div className="extras-list">
                  {extras.map(x => (
                    <button key={x.Id} className="extra" onClick={() => nav(`/play/${x.Id}`)}>
                      <span className="extra-thumb">{x.ImageTags?.Primary ? <img src={api.image(x.Id, x.ImageTags.Primary, 320)} alt="" loading="lazy" /> : null}<Icon name="play" size={20} /></span>
                      <span className="extra-name">{x.Name}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {show('details') && (
              <section className="about" data-section="details">
                {!theme.detailTabs && <h3>{w.details}</h3>}
                {cast.length > 0 && (
                  <>
                    <h4>{w.cast}</h4>
                    <div className="cast">
                      {cast.slice(0, 16).map(p => (
                        <Link key={`${p.Id}-${p.Role}`} to={`/person/${p.Id}`} className="cast-member" data-person={p.Id}>
                          {api.personImage(p) ? <img src={api.personImage(p)} alt="" loading="lazy" /> : <span className="ph">{p.Name.slice(0, 1)}</span>}
                          <b>{p.Name}</b>{p.Role && <small>{p.Role}</small>}
                        </Link>
                      ))}
                    </div>
                  </>
                )}
                <dl className="facts">
                  {crew.length > 0 && <><dt>Crew</dt><dd>{crew.map((p, i) => <span key={`${p.Id}-${p.Type}`}>{i > 0 && ', '}<Link to={`/person/${p.Id}`}>{p.Name}</Link> <small>({p.Type})</small></span>)}</dd></>}
                  {item.Genres?.length ? <><dt>Genres</dt><dd>{item.Genres.map((g, i) => <span key={g}>{i > 0 && ', '}<Link to={`/genre/${encodeURIComponent(g)}`}>{g}</Link></span>)}</dd></> : null}
                  {item.Studios?.length ? <><dt>Studio</dt><dd>{item.Studios.map(s => s.Name).join(', ')}</dd></> : null}
                  {audioLangs.length > 0 && <><dt>Audio</dt><dd>{audioLangs.join(', ')}</dd></>}
                  {subLangs.length > 0 && <><dt>Subtitles</dt><dd>{subLangs.join(', ')}</dd></>}
                  {item.ProductionYear ? <><dt>Released</dt><dd>{item.ProductionYear}</dd></> : null}
                  {item.OfficialRating ? <><dt>Rated</dt><dd>{item.OfficialRating}</dd></> : null}
                </dl>
              </section>
            )}
          </>
        )}
      </div>
    </>
  )
}
