import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { Api, Item, MediaStream } from '../../api/jellyfin'
import type { PlayerLayout, PlayerWords } from '../../theme'
import { ticksToMin } from '../../util/time'
import { Select } from '../Fields'
import { QUALITIES, SPEEDS, trackLabel, type Menu } from './constants'

const EDGE = 16 // how close a pop-up may come to the side of the window

/**
 * A pop-up panel over the player. It sits above the button that opened it (as far as the window allows) and takes focus
 * when it opens, so a keyboard user lands inside it.
 */
function Panel({ className, label, anchor, children }: { className: string; label: string; anchor: number | null; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = root.current
    const frame = el?.parentElement
    if (!el || !frame || anchor == null) return
    el.style.left = `${Math.min(Math.max(EDGE, anchor - el.offsetWidth / 2), Math.max(EDGE, frame.clientWidth - el.offsetWidth - EDGE))}px`
  }, [anchor])
  useEffect(() => { root.current?.querySelector<HTMLElement>('button[aria-pressed="true"], button')?.focus({ preventScroll: true }) }, [])
  return <div ref={root} className={`pc-menu ${className}`} role="group" aria-label={label}>{children}</div>
}

/** The episodes of one season, with a menu to move to another season. */
function EpisodesPanel({ api, episodes, currentId, label, pictures, anchor, onEpisode }: {
  api: Api
  episodes: Item[]
  currentId: string
  label: string
  pictures: PlayerLayout['episodePictures']
  anchor: number | null
  onEpisode: (id: string) => void
}) {
  const seasons = [...new Set(episodes.map(e => e.ParentIndexNumber ?? 0))]
  const playing = episodes.find(e => e.Id === currentId)
  const [season, setSeason] = useState(playing?.ParentIndexNumber ?? seasons[0] ?? 1)
  return (
    <Panel className="eps" label={label} anchor={anchor}>
      <div className="pc-eps-head">
        <h4>{playing?.SeriesName ?? label}</h4>
        <Select<number> id="pc-season" label="Season" value={season} onChange={setSeason} options={seasons.map(s => ({ value: s, label: s === 0 ? 'Specials' : `Season ${s}` }))} />
      </div>
      <div className="pc-eps-list">
        {episodes.filter(e => (e.ParentIndexNumber ?? 0) === season).map(e => {
          const now = e.Id === currentId
          const picture = e.ImageTags?.Primary && (pictures === 'all' || now) ? api.image(e.Id, e.ImageTags.Primary, 320) : ''
          return (
            <button key={e.Id} data-ep={e.Id} aria-pressed={now} className={now ? 'on' : ''} onClick={() => onEpisode(e.Id)}>
              <b>{e.IndexNumber}</b>
              {picture && <img className="pc-ep-pic" src={picture} alt="" loading="lazy" />}
              <span className="pc-ep-text">
                <span className="t">{e.Name}</span>
                {now && pictures === 'current' && e.Overview && <small>{e.Overview}</small>}
              </span>
              <small className="pc-ep-time">{e.RunTimeTicks ? `${ticksToMin(e.RunTimeTicks)} min` : ''}</small>
            </button>
          )
        })}
      </div>
    </Panel>
  )
}

/** The audio and subtitles, speed, settings (quality and speed) and episode pop-ups. Only the one that is open is drawn. */
export default function PlayerMenus({ menu, anchor, say, layout, api, audioStreams, subStreams, audio, sub, quality, speed, episodes, currentId, episodesLabel, onAudio, onSub, onQuality, onSpeed, onEpisode }: {
  menu: Menu
  anchor: number | null
  say: PlayerWords
  layout: PlayerLayout
  api: Api
  audioStreams: MediaStream[]
  subStreams: MediaStream[]
  audio: number | null
  sub: number | null
  quality: string
  speed: number
  episodes: Item[]
  currentId: string
  episodesLabel: string
  onAudio: (index: number) => void
  onSub: (index: number | null) => void
  onQuality: (id: string) => void
  onSpeed: (speed: number) => void
  onEpisode: (id: string) => void
}) {
  const speeds = SPEEDS.map(s => <button key={s} data-speed={s} aria-pressed={speed === s} className={speed === s ? 'on' : ''} onClick={() => onSpeed(s)}>{s === 1 ? 'Normal' : `${s}×`}</button>)

  if (menu === 'tracks') {
    return (
      <Panel className="tracks" label={say.audioSubtitles} anchor={anchor}>
        <div className="col">
          <h4>Audio</h4>
          {audioStreams.map(s => <button key={s.Index} data-audio={s.Index} aria-pressed={audio === s.Index} className={audio === s.Index ? 'on' : ''} onClick={() => onAudio(s.Index)}>{trackLabel(s)}</button>)}
        </div>
        <div className="col">
          <h4>Subtitles</h4>
          <button data-sub="off" aria-pressed={sub == null} className={sub == null ? 'on' : ''} onClick={() => onSub(null)}>Off</button>
          {subStreams.map(s => <button key={s.Index} data-sub={s.Index} aria-pressed={sub === s.Index} className={sub === s.Index ? 'on' : ''} onClick={() => onSub(s.Index)}>{trackLabel(s)}</button>)}
        </div>
      </Panel>
    )
  }
  if (menu === 'settings') {
    return (
      <Panel className="tracks settings" label={say.settings} anchor={anchor}>
        <div className="col">
          <h4>Quality</h4>
          {QUALITIES.map(q => <button key={q.id} data-quality={q.id} aria-pressed={quality === q.id} className={quality === q.id ? 'on' : ''} onClick={() => onQuality(q.id)}>{q.label}</button>)}
        </div>
        <div className="col">
          <h4>{say.speed}</h4>
          {speeds}
        </div>
      </Panel>
    )
  }
  if (menu === 'speed') {
    return (
      <Panel className="small" label={say.speed} anchor={anchor}>
        <h4>{say.speed}</h4>
        {speeds}
      </Panel>
    )
  }
  if (menu === 'episodes') {
    return <EpisodesPanel api={api} episodes={episodes} currentId={currentId} label={episodesLabel} pictures={layout.episodePictures} anchor={anchor} onEpisode={onEpisode} />
  }
  return null
}
