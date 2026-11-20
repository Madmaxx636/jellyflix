import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Api, Item } from '../api/jellyfin'
import { useLoad } from '../hooks/useLoad'
import { usePageTitle } from '../hooks/usePageTitle'
import { langName } from '../settingsModel'
import { useTheme } from '../theme'
import { flagsOf, useFlagsVersion } from '../userdata'
import { ticksToMin } from '../util/time'
import { isWebUrl } from '../../../shared/url'
import Browse from '../components/Browse'
import EpisodeRow from '../components/EpisodeRow'
import { Select } from '../components/Fields'
import Icon from '../components/Icon'
import ListButton from '../components/ListButton'
import Row from '../components/Row'
import { ErrorBox, Loading } from '../components/Status'
import WatchedButton from '../components/WatchedButton'

type Tab = 'episodes' | 'suggested' | 'extras' | 'details'
const NONE: Item[] = []
const uniq = (list: string[]) => [...new Set(list.filter(Boolean))]

async function loadTitle(api: Api, id: string) {
  const item = await api.item(id)
  const episodes = item.Type === 'Series' ? await api.episodes(item.Id).catch(() => NONE) : NONE
  return { item, episodes }
}

/** Similar titles and extras are nice to have: they arrive after the page itself and never block it. */
async function loadMore(api: Api, id: string) {
  const [similar, extras] = await Promise.all([api.similar(id).catch(() => NONE), api.extras(id)])
  return { similar, extras }
}

export default function Details({ api }: { api: Api }) {
  const { id = '' } = useParams()
  const main = useLoad(api, id, a => loadTitle(a, id), { remember: true })
  const more = useLoad(api, `more|${id}`, a => loadMore(a, id), { remember: true })
  usePageTitle(main.data?.item.Name)

  if (main.error) return <div className="page"><ErrorBox error={main.error} what="this title" onRetry={main.reload} /></div>
  if (!main.data) return <div className="page"><Loading /></div>
  return <TitlePage key={id} api={api} item={main.data.item} episodes={main.data.episodes} similar={more.data?.similar ?? NONE} extras={more.data?.extras ?? NONE} />
}

function Panel({ id, tabbed, className, children }: { id: Tab; tabbed: boolean; className?: string; children: ReactNode }) {
  return (
    <section className={className} data-section={id} {...(tabbed ? { id: `panel-${id}`, role: 'tabpanel', 'aria-labelledby': `tab-${id}` } : {})}>
      {children}
    </section>
  )
}

function TitlePage({ api, item, episodes, similar, extras }: { api: Api; item: Item; episodes: Item[]; similar: Item[]; extras: Item[] }) {
  const nav = useNavigate()
  const { theme } = useTheme()
  const w = theme.words
  useFlagsVersion() // marking an episode watched moves "what to play next" along
  const isSeries = item.Type === 'Series'
  const isBox = item.Type === 'BoxSet'
  const nextEpisode = episodes.find(e => !flagsOf(e).played) ?? episodes[0]
  // Open on the season you are up to, and stay on whichever season you pick after that.
  const [season, setSeason] = useState(() => (nextEpisode ?? episodes[0])?.ParentIndexNumber ?? 1)
  const [picked, setPicked] = useState<Tab | null>(null)
  const boxBase = useMemo(() => ({ parentId: item.Id, types: ['Movie', 'Series'] }), [item.Id])

  const tabs: { id: Tab; label: string }[] = []
  if (isSeries) tabs.push({ id: 'episodes', label: w.episodes })
  if (similar.length) tabs.push({ id: 'suggested', label: w.moreLikeThis })
  if (extras.length) tabs.push({ id: 'extras', label: w.extras })
  tabs.push({ id: 'details', label: w.details })
  const active = tabs.some(t => t.id === picked) ? picked : tabs[0].id
  const show = (t: Tab) => !theme.detailTabs || active === t
  const tabbed = theme.detailTabs

  // Arrow keys move between tabs, as they do in other tab lists.
  const onTabKeys = (e: KeyboardEvent) => {
    const at = tabs.findIndex(t => t.id === active)
    const to = e.key === 'ArrowRight' ? at + 1 : e.key === 'ArrowLeft' ? at - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1
    if (to < 0) return
    e.preventDefault()
    const next = tabs[(to + tabs.length) % tabs.length]
    setPicked(next.id)
    document.getElementById(`tab-${next.id}`)?.focus()
  }

  const bg = api.backdrop(item)
  const seasons = [...new Set(episodes.map(e => e.ParentIndexNumber ?? 0))]
  const playTarget = isBox ? null : isSeries ? nextEpisode : item
  const resumeSec = (playTarget?.UserData?.PlaybackPositionTicks ?? 0) / 1e7
  const resuming = resumeSec > 5 // the player starts from a saved spot past 5 seconds
  const resumeLabel = resumeSec >= 60 ? `${w.resume} (${Math.round(resumeSec / 60)} min in)` : w.resume
  const trailer = item.RemoteTrailers?.map(t => t.Url).find(isWebUrl)
  const people = item.People ?? []
  const cast = people.filter(p => p.Type === 'Actor' || p.Type === 'GuestStar')
  const crew = people.filter(p => p.Type === 'Director' || p.Type === 'Writer' || p.Type === 'Producer')
  const streams = item.MediaSources?.[0]?.MediaStreams ?? []
  const audioLangs = uniq(streams.filter(s => s.Type === 'Audio').map(s => langName(s.Language)))
  const subLangs = uniq(streams.filter(s => s.Type === 'Subtitle').map(s => langName(s.Language)))
  const genreLink = (g: string) => <Link to={`/genre/${encodeURIComponent(g)}`}>{g}</Link>

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
            {item.Genres?.map((g, i) => <span key={g}>{i > 0 && ' · '}{genreLink(g)}</span>)}
          </p>
          <div className="actions">
            {playTarget && (
              <button className="btn primary" data-act="play" onClick={() => nav(`/play/${encodeURIComponent(playTarget.Id)}`)}>
                <Icon name="play" size={18} />{resuming ? resumeLabel : w.play}
              </button>
            )}
            {playTarget && resuming && <button className="btn" data-act="restart" onClick={() => nav(`/play/${encodeURIComponent(playTarget.Id)}?t=0`)}>{w.playFromStart}</button>}
            <ListButton api={api} item={item} />
            {!isBox && <WatchedButton api={api} item={item} />}
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
            {tabbed && (
              <div className="tabs" role="tablist" aria-label={`About ${item.Name}`}>
                {tabs.map(t => (
                  <button key={t.id} id={`tab-${t.id}`} role="tab" aria-selected={active === t.id} aria-controls={`panel-${t.id}`} tabIndex={active === t.id ? 0 : -1}
                    data-tab={t.id} className={active === t.id ? 'on' : ''} onClick={() => setPicked(t.id)} onKeyDown={onTabKeys}>{t.label}</button>
                ))}
              </div>
            )}

            {isSeries && show('episodes') && (
              <Panel id="episodes" tabbed={tabbed} className="episodes">
                <div className="ep-head">
                  {!tabbed && <h3>{w.episodes}</h3>}
                  <Select<number> id="season" label="Season" value={season} onChange={setSeason}
                    options={seasons.map(s => ({ value: s, label: s === 0 ? 'Specials' : `Season ${s}` }))} />
                </div>
                {episodes.filter(e => (e.ParentIndexNumber ?? 0) === season).map(e => <EpisodeRow key={e.Id} ep={e} api={api} />)}
              </Panel>
            )}

            {similar.length > 0 && show('suggested') && <Panel id="suggested" tabbed={tabbed}><Row title={w.moreLikeThis} items={similar} api={api} /></Panel>}

            {extras.length > 0 && show('extras') && (
              <Panel id="extras" tabbed={tabbed} className="extras">
                {!tabbed && <h3>{w.extras}</h3>}
                <div className="extras-list">
                  {extras.map(x => (
                    <button key={x.Id} className="extra" onClick={() => nav(`/play/${encodeURIComponent(x.Id)}`)}>
                      <span className="extra-thumb">{x.ImageTags?.Primary ? <img src={api.image(x.Id, x.ImageTags.Primary, 320)} alt="" loading="lazy" /> : null}<Icon name="play" size={20} /></span>
                      <span className="extra-name">{x.Name}</span>
                    </button>
                  ))}
                </div>
              </Panel>
            )}

            {show('details') && (
              <Panel id="details" tabbed={tabbed} className="about">
                {!tabbed && <h3>{w.details}</h3>}
                {cast.length > 0 && (
                  <>
                    <h4>{w.cast}</h4>
                    <div className="cast">
                      {cast.slice(0, 16).map(p => (
                        <Link key={`${p.Id}-${p.Role}`} to={`/person/${encodeURIComponent(p.Id)}`} className="cast-member" data-person={p.Id}>
                          {api.personImage(p) ? <img src={api.personImage(p)} alt="" loading="lazy" /> : <span className="ph" aria-hidden="true">{p.Name.slice(0, 1)}</span>}
                          <b>{p.Name}</b>{p.Role && <small>{p.Role}</small>}
                        </Link>
                      ))}
                    </div>
                  </>
                )}
                <dl className="facts">
                  {crew.length > 0 && <><dt>Crew</dt><dd>{crew.map((p, i) => <span key={`${p.Id}-${p.Type}`}>{i > 0 && ', '}<Link to={`/person/${encodeURIComponent(p.Id)}`}>{p.Name}</Link> <small>({p.Type})</small></span>)}</dd></>}
                  {item.Genres?.length ? <><dt>Genres</dt><dd>{item.Genres.map((g, i) => <span key={g}>{i > 0 && ', '}{genreLink(g)}</span>)}</dd></> : null}
                  {item.Studios?.length ? <><dt>Studio</dt><dd>{item.Studios.map(s => s.Name).join(', ')}</dd></> : null}
                  {audioLangs.length > 0 && <><dt>Audio</dt><dd>{audioLangs.join(', ')}</dd></>}
                  {subLangs.length > 0 && <><dt>Subtitles</dt><dd>{subLangs.join(', ')}</dd></>}
                  {item.ProductionYear ? <><dt>Released</dt><dd>{item.ProductionYear}</dd></> : null}
                  {item.OfficialRating ? <><dt>Rated</dt><dd>{item.OfficialRating}</dd></> : null}
                </dl>
              </Panel>
            )}
          </>
        )}
      </div>
    </>
  )
}
