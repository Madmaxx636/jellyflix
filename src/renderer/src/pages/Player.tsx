import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Hls from 'hls.js'
import type { Api, Item, MediaStream, Prepared, Segment } from '../api/jellyfin'
import { langName, pickAudio, pickSubtitle, useSettings } from '../settings'
import { useTheme } from '../theme'
import Icon from '../components/Icon'

const QUALITIES = [
  { id: 'auto', label: 'Auto', bps: 0 },
  { id: '1080', label: '1080p', bps: 8_000_000 },
  { id: '720', label: '720p', bps: 4_000_000 },
  { id: '480', label: '480p', bps: 1_500_000 }
]
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2]
const SKIPPABLE: Record<string, string> = { Intro: 'Skip Intro', Recap: 'Skip Recap', Preview: 'Skip Preview', Commercial: 'Skip' }

const clock = (s: number) => {
  s = Math.max(0, Math.floor(s))
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60
  return `${h ? `${h}:${String(m).padStart(2, '0')}` : m}:${String(x).padStart(2, '0')}`
}
const trackLabel = (s: MediaStream) =>
  s.DisplayTitle || [langName(s.Language), s.Codec?.toUpperCase()].filter(Boolean).join(' · ') || `Track ${s.Index}`

type Menu = null | 'tracks' | 'speed' | 'quality' | 'episodes'

export default function Player({ api }: { api: Api }) {
  const { id = '' } = useParams()
  const [sp] = useSearchParams()
  const nav = useNavigate()
  const { settings } = useSettings()
  const { theme } = useTheme()
  const video = useRef<HTMLVideoElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const scrubber = useRef<HTMLDivElement>(null)
  const pos = useRef(0) // last known position: the resume point, and where a reloaded stream starts again
  const startAt = useRef(0)
  const skipped = useRef(new Set<number>())
  const idleTimer = useRef(0)

  const [item, setItem] = useState<Item | null>(null)
  const [prep, setPrep] = useState<Prepared | null>(null)
  const [segments, setSegments] = useState<Segment[]>([])
  const [episodes, setEpisodes] = useState<Item[]>([])
  const [audio, setAudio] = useState<number | null>(null)
  const [sub, setSub] = useState<number | null>(null)
  const [qual, setQual] = useState<string>(settings.quality)
  const [speed, setSpeed] = useState(settings.speed)
  const [t, setT] = useState(0)
  const [dur, setDur] = useState(0)
  const [buf, setBuf] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [ended, setEnded] = useState(false)
  const [vol, setVol] = useState(() => { const v = parseFloat(localStorage.getItem('jellyflix.volume') ?? ''); return Number.isFinite(v) ? v : 1 })
  const [muted, setMuted] = useState(false)
  const [menu, setMenu] = useState<Menu>(null)
  const [idle, setIdle] = useState(false)
  const [hoverT, setHoverT] = useState<number | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [nextDismissed, setNextDismissed] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [err, setErr] = useState('')

  // ---- load the title, how to play it, intro markers and the other episodes ----
  useEffect(() => {
    let live = true
    setItem(null); setPrep(null); setSegments([]); setEpisodes([]); setErr('')
    setCountdown(null); setNextDismissed(false); setEnded(false); setT(0); setDur(0); setBuf(0); setMenu(null)
    skipped.current.clear()
    ;(async () => {
      try {
        const [it, p] = await Promise.all([api.item(id), api.prepare(id)])
        if (!live) return
        const resume = (it.UserData?.PlaybackPositionTicks ?? 0) / 1e7
        const asked = sp.get('t')
        startAt.current = asked != null ? Number(asked) || 0 : resume > 5 ? resume : 0
        pos.current = startAt.current
        const streams = p.source.MediaStreams ?? []
        const a = pickAudio(streams, settings.audioLang, p.source.DefaultAudioStreamIndex)
        const aLang = streams.find(s => s.Index === a)?.Language
        setItem(it); setAudio(a)
        setSub(pickSubtitle(streams, settings.subtitleMode, settings.subtitleLang, aLang))
        setPrep(p)
        api.segments(id).then(s => { if (live) setSegments(s) })
        if (it.Type === 'Episode' && it.SeriesId) api.episodes(it.SeriesId).then(e => { if (live) setEpisodes(e) }).catch(() => {})
      } catch (e) { if (live) setErr((e as Error).message) }
    })()
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, api])

  const streams = prep?.source.MediaStreams ?? []
  const audioStreams = streams.filter(s => s.Type === 'Audio')
  const subStreams = streams.filter(s => s.Type === 'Subtitle')
  const subStream = sub != null ? streams.find(s => s.Index === sub) : undefined
  // Picture-based subtitles (PGS, VobSub) can't be shown by the video element, so the server burns them in.
  const burn = subStream && !subStream.IsTextSubtitleStream ? subStream.Index : null
  const bitrate = QUALITIES.find(q => q.id === qual)?.bps ?? 0

  // ---- the stream. Picking another audio track or quality loads a new one and carries on from the same spot ----
  useEffect(() => {
    const el = video.current
    if (!prep || !el) return
    const from = startAt.current
    const h = new Hls({ startPosition: from > 1 ? from : -1 })
    h.loadSource(api.hlsUrl(id, prep, { audio: audio ?? undefined, burnSubtitle: burn ?? undefined, bitrate }))
    h.attachMedia(el)
    h.on(Hls.Events.MANIFEST_PARSED, () => { el.playbackRate = speed; el.play().catch(() => {}) })
    h.on(Hls.Events.ERROR, (_e, d) => { if (d.fatal) setErr(`Playback failed (${d.details})`) })
    return () => { startAt.current = pos.current; h.destroy() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prep, audio, burn, bitrate])

  useEffect(() => { if (video.current) video.current.playbackRate = speed }, [speed])
  useEffect(() => {
    const el = video.current
    if (!el) return
    el.volume = vol; el.muted = muted
    try { localStorage.setItem('jellyflix.volume', String(vol)) } catch { /* storage unavailable */ }
  }, [vol, muted])

  // ---- what the video element is doing ----
  useEffect(() => {
    const el = video.current
    if (!el) return
    const tick = () => {
      if (el.readyState === 0) return // a stream swap resets the element; don't lose the position
      pos.current = el.currentTime
      setT(el.currentTime)
      if (Number.isFinite(el.duration)) setDur(el.duration)
      if (el.buffered.length) setBuf(el.buffered.end(el.buffered.length - 1))
    }
    const handlers: [string, () => void][] = [
      ['timeupdate', tick], ['progress', tick], ['durationchange', tick],
      ['play', () => { setPlaying(true); setEnded(false) }], ['pause', () => setPlaying(false)],
      ['ended', () => { setEnded(true); setPlaying(false) }]
    ]
    handlers.forEach(([n, f]) => el.addEventListener(n, f))
    return () => handlers.forEach(([n, f]) => el.removeEventListener(n, f))
  }, [])
  useEffect(() => {
    const on = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])

  // ---- tell Jellyfin where we are, so Continue Watching works ----
  useEffect(() => {
    if (!prep) return
    const body = () => ({
      ItemId: id, MediaSourceId: prep.source.Id, PlaySessionId: prep.playSessionId,
      PositionTicks: Math.floor(pos.current * 1e7), IsPaused: !!video.current?.paused, PlayMethod: 'Transcode'
    })
    api.report('Playing', body())
    const timer = window.setInterval(() => api.report('Progress', body()), 10_000)
    return () => { clearInterval(timer); api.report('Stopped', body()) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prep])

  // ---- helpers ----
  const duration = dur || (prep?.source.RunTimeTicks ?? 0) / 1e7
  const toggle = () => { const el = video.current; if (el) { if (el.paused) el.play().catch(() => {}); else el.pause() } }
  const seek = useCallback((s: number) => {
    const el = video.current
    if (el) el.currentTime = Math.max(0, Number.isFinite(el.duration) ? Math.min(s, el.duration) : s)
  }, [])
  const bump = (d: number) => seek((video.current?.currentTime ?? 0) + d)
  const toggleFullscreen = () => { if (document.fullscreenElement) document.exitFullscreen(); else frame.current?.requestFullscreen() }
  const wake = useCallback(() => {
    setIdle(false)
    clearTimeout(idleTimer.current)
    idleTimer.current = window.setTimeout(() => setIdle(true), 3000)
  }, [])
  useEffect(() => { wake(); return () => clearTimeout(idleTimer.current) }, [wake])

  // ---- skipping and what comes next ----
  const skippable = segments.find(s => SKIPPABLE[s.type] && t >= s.start - 0.05 && t < s.end - 0.3)
  const outro = segments.find(s => s.type === 'Outro')
  const nextEp = useMemo(() => {
    const i = episodes.findIndex(e => e.Id === id)
    return i >= 0 ? episodes[i + 1] ?? null : null
  }, [episodes, id])
  const nearEnd = duration > 0 && duration - t < 20
  const showNext = !!nextEp && !nextDismissed && ((!!outro && t >= outro.start) || ended || (!outro && nearEnd))
  const showEnd = ended && !nextEp

  useEffect(() => {
    if (settings.skipIntro !== 'auto' || !skippable || skipped.current.has(skippable.start)) return
    skipped.current.add(skippable.start)
    seek(skippable.end)
  }, [skippable, settings.skipIntro, seek])

  // One timer per "next episode": it counts down, then goes. Keeping the count and the jump in the same timer means a
  // stale count from the previous episode can never trigger a second jump when the episode changes.
  const nextId = nextEp?.Id
  useEffect(() => {
    if (!showNext || !settings.autoplayNext || !nextId) { setCountdown(null); return }
    let left = 5
    setCountdown(left)
    const timer = window.setInterval(() => {
      left -= 1
      setCountdown(left)
      if (left <= 0) { clearInterval(timer); nav(`/play/${nextId}`) }
    }, 1000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNext, settings.autoplayNext, nextId])

  // ---- keyboard ----
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'SELECT' || (tag === 'INPUT' && (e.target as HTMLInputElement).type !== 'range')) return
      wake()
      switch (e.key) {
        case ' ': case 'k': e.preventDefault(); toggle(); break
        case 'ArrowRight': case 'l': bump(10); break
        case 'ArrowLeft': case 'j': bump(-10); break
        case 'ArrowUp': e.preventDefault(); setVol(v => Math.min(1, +(v + 0.1).toFixed(2))); setMuted(false); break
        case 'ArrowDown': e.preventDefault(); setVol(v => Math.max(0, +(v - 0.1).toFixed(2))); break
        case 'm': setMuted(m => !m); break
        case 'f': toggleFullscreen(); break
        case 'c': setSub(s => (s == null ? subStreams[0]?.Index ?? null : null)); break
        case 'n': if (nextEp) nav(`/play/${nextEp.Id}`); break
        case 'Escape':
          if (menu) setMenu(null)
          else if (document.fullscreenElement) document.exitFullscreen()
          else nav(-1)
          break
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu, nextEp, subStreams.length, wake, nav])

  // ---- scrub bar ----
  const frac = (x: number) => { const r = scrubber.current!.getBoundingClientRect(); return Math.min(1, Math.max(0, (x - r.left) / r.width)) }
  const scrubDown = (e: ReactPointerEvent) => { e.currentTarget.setPointerCapture(e.pointerId); seek(frac(e.clientX) * duration) }
  const scrubMove = (e: ReactPointerEvent) => { setHoverT(frac(e.clientX) * duration); if (e.buttons === 1) seek(frac(e.clientX) * duration) }

  const title = item?.Type === 'Episode' ? `${item.SeriesName} — S${item.ParentIndexNumber}:E${item.IndexNumber} ${item.Name}` : item?.Name ?? ''
  const pct = (v: number) => (duration > 0 ? `${Math.min(100, (v / duration) * 100)}%` : '0%')
  const pick = (m: Menu) => setMenu(cur => (cur === m ? null : m))
  const words = theme.words

  return (
    <div ref={frame} className={`player ${playing ? 'is-playing' : 'is-paused'} ${idle && playing && !menu ? 'idle' : ''} ${menu ? 'menu-open' : ''}`}
      onMouseMove={wake} onDoubleClick={toggleFullscreen} data-look={theme.id}>
      <video ref={video} crossOrigin="anonymous" playsInline onClick={() => { if (menu) setMenu(null); else toggle() }}>
        {subStream?.IsTextSubtitleStream && prep && (
          <track key={sub} kind="subtitles" default src={api.subtitleUrl(id, prep.source.Id, subStream.Index)} srcLang={subStream.Language ?? ''} label={trackLabel(subStream)} />
        )}
      </video>

      <div className="pc-top">
        <button className="pc-btn" data-act="back" onClick={() => nav(-1)} aria-label="Back"><Icon name="left" size={22} /></button>
        <span className="pc-title">{title}</span>
      </div>

      {!prep && !err && <div className="pc-loading">Loading…</div>}
      {err && <div className="pc-err">{err}</div>}

      {skippable && settings.skipIntro === 'button' && (
        <button className="pc-skip" data-act="skip" onClick={() => seek(skippable.end)}>{SKIPPABLE[skippable.type]}</button>
      )}

      {showNext && nextEp && (
        <div className="pc-next" data-countdown={countdown ?? ''}>
          <button className="pc-next-x" aria-label="Dismiss" onClick={() => setNextDismissed(true)}><Icon name="x" size={16} /></button>
          <button className="pc-next-body" data-act="next" onClick={() => nav(`/play/${nextEp.Id}`)}>
            {nextEp.ImageTags?.Primary ? <img src={api.image(nextEp.Id, nextEp.ImageTags.Primary, 320)} alt="" /> : <span className="ph"><Icon name="play" size={22} /></span>}
            <span>
              <small>Next episode{countdown != null ? ` in ${countdown}` : ''}</small>
              <b>S{nextEp.ParentIndexNumber}:E{nextEp.IndexNumber} {nextEp.Name}</b>
            </span>
          </button>
        </div>
      )}
      {showEnd && (
        <div className="pc-end">
          <button className="btn primary" data-act="replay" onClick={() => { seek(0); video.current?.play().catch(() => {}) }}><Icon name="play" size={18} />Replay</button>
          <button className="btn" onClick={() => nav(-1)}>Back</button>
        </div>
      )}

      <div className="pc-center">
        <button className="pc-btn" aria-label="Back 10 seconds" onClick={() => bump(-10)}><Icon name="back10" size={44} /></button>
        <button className="pc-btn big" aria-label={playing ? 'Pause' : 'Play'} onClick={toggle}><Icon name={playing ? 'pause' : 'play'} size={46} /></button>
        <button className="pc-btn" aria-label="Forward 10 seconds" onClick={() => bump(10)}><Icon name="fwd10" size={44} /></button>
      </div>

      <div className="pc-bar">
        <div ref={scrubber} className="pc-scrub" onPointerDown={scrubDown} onPointerMove={scrubMove} onPointerLeave={() => setHoverT(null)} role="slider"
          aria-label="Seek" aria-valuemin={0} aria-valuemax={Math.round(duration)} aria-valuenow={Math.round(t)}>
          <div className="buf" style={{ width: pct(buf) }} />
          <div className="pos" style={{ width: pct(t) }} />
          {segments.filter(s => s.type === 'Intro' || s.type === 'Outro').map(s => <i key={`${s.type}${s.start}`} className="mark" style={{ left: pct(s.start), width: pct(s.end - s.start) }} />)}
          <div className="knob" style={{ left: pct(t) }} />
          {hoverT != null && <div className="tip" style={{ left: pct(hoverT) }}>{clock(hoverT)}</div>}
        </div>
        <div className="pc-row">
          <div className="pc-left">
            <button className="pc-btn" data-act="play" aria-label={playing ? 'Pause' : 'Play'} onClick={toggle}><Icon name={playing ? 'pause' : 'play'} size={26} /></button>
            <button className="pc-btn" data-act="back10" aria-label="Back 10 seconds" onClick={() => bump(-10)}><Icon name="back10" size={26} /></button>
            <button className="pc-btn" data-act="fwd10" aria-label="Forward 10 seconds" onClick={() => bump(10)}><Icon name="fwd10" size={26} /></button>
            <button className="pc-btn" data-act="mute" aria-label={muted ? 'Unmute' : 'Mute'} onClick={() => setMuted(m => !m)}><Icon name={muted || vol === 0 ? 'mute' : 'volume'} size={24} /></button>
            <input className="pc-vol" type="range" min={0} max={1} step={0.05} value={muted ? 0 : vol} aria-label="Volume"
              onChange={e => { setVol(Number(e.target.value)); setMuted(false) }} />
            <span className="pc-time">{clock(t)} <span>/ {clock(duration)}</span></span>
          </div>
          <div className="pc-mid">{title}</div>
          <div className="pc-right">
            {nextEp && <button className="pc-btn" data-act="next" aria-label="Next episode" onClick={() => nav(`/play/${nextEp.Id}`)}><Icon name="next" size={24} /></button>}
            {episodes.length > 0 && <button className="pc-btn" data-act="episodes" aria-label={words.episodes} onClick={() => pick('episodes')}><Icon name="episodes" size={24} /></button>}
            {(audioStreams.length > 0 || subStreams.length > 0) && <button className="pc-btn" data-act="tracks" aria-label="Audio and subtitles" onClick={() => pick('tracks')}><Icon name="captions" size={24} /></button>}
            <button className="pc-btn" data-act="quality" aria-label="Quality" onClick={() => pick('quality')}><Icon name="quality" size={24} /></button>
            <button className="pc-btn" data-act="speed" aria-label="Speed" onClick={() => pick('speed')}><Icon name="speed" size={24} /></button>
            <button className="pc-btn" data-act="fullscreen" aria-label="Full screen" onClick={toggleFullscreen}><Icon name={fullscreen ? 'exit-fullscreen' : 'fullscreen'} size={24} /></button>
          </div>
        </div>
      </div>

      {menu === 'tracks' && (
        <div className="pc-menu tracks">
          <div className="col">
            <h4>Audio</h4>
            {audioStreams.map(s => <button key={s.Index} data-audio={s.Index} className={audio === s.Index ? 'on' : ''} onClick={() => { setAudio(s.Index); setMenu(null) }}>{trackLabel(s)}</button>)}
          </div>
          <div className="col">
            <h4>Subtitles</h4>
            <button data-sub="off" className={sub == null ? 'on' : ''} onClick={() => { setSub(null); setMenu(null) }}>Off</button>
            {subStreams.map(s => <button key={s.Index} data-sub={s.Index} className={sub === s.Index ? 'on' : ''} onClick={() => { setSub(s.Index); setMenu(null) }}>{trackLabel(s)}</button>)}
          </div>
        </div>
      )}
      {menu === 'quality' && (
        <div className="pc-menu small">
          <h4>Quality</h4>
          {QUALITIES.map(q => <button key={q.id} data-quality={q.id} className={qual === q.id ? 'on' : ''} onClick={() => { setQual(q.id); setMenu(null) }}>{q.label}</button>)}
        </div>
      )}
      {menu === 'speed' && (
        <div className="pc-menu small">
          <h4>Speed</h4>
          {SPEEDS.map(s => <button key={s} data-speed={s} className={speed === s ? 'on' : ''} onClick={() => { setSpeed(s); setMenu(null) }}>{s === 1 ? 'Normal' : `${s}×`}</button>)}
        </div>
      )}
      {menu === 'episodes' && (
        <div className="pc-menu eps">
          <h4>{words.episodes}</h4>
          {episodes.map(e => (
            <button key={e.Id} data-ep={e.Id} className={e.Id === id ? 'on' : ''} onClick={() => nav(`/play/${e.Id}`)}>
              <b>{e.ParentIndexNumber}:{e.IndexNumber}</b> {e.Name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
