import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { Api, Item, Playback, PlaybackOptions, Segment } from '../api/jellyfin'
import { useLoad } from '../hooks/useLoad'
import { usePageTitle } from '../hooks/usePageTitle'
import { useSettings } from '../settings'
import { pickAudio, pickSubtitle } from '../settingsModel'
import { useTheme } from '../theme'
import Icon from '../components/Icon'
import Chrome from '../components/player/Chrome'
import { QUALITIES, SKIPPABLE, trackLabel, type Menu, type OpenMenu } from '../components/player/constants'
import NextEpisodeCard from '../components/player/NextEpisodeCard'
import PlayerMenus from '../components/player/PlayerMenus'
import { useStream } from '../components/player/useStream'
import { useMediaSession } from '../components/player/useMediaSession'
import { usePlaybackReport } from '../components/player/usePlaybackReport'
import { useVideoControls } from '../components/player/useVideoControls'

const NO_SEGMENTS: Segment[] = []
const NO_EPISODES: Item[] = []
const VOLUME_KEY = 'jellyflix.volume'
const IDLE_AFTER_MS = 3000
const PAUSE_PANEL_AFTER_MS = 3000
const SLOW_AFTER_MS = 6000
const SKIP_SECONDS = 10
const DOUBLE_TAP_MS = 300

function storedVolume(): number {
  try {
    const v = parseFloat(localStorage.getItem(VOLUME_KEY) ?? '')
    return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1
  } catch { return 1 }
}

/**
 * The player page. This outer part stays in place while you move from one episode to the next, so full screen survives
 * the change; the part inside starts afresh for every title.
 */
export default function Player({ api }: { api: Api }) {
  const { id = '' } = useParams()
  const frame = useRef<HTMLElement>(null)
  const loaded = useLoad(api, id, async a => {
    const [item, plan] = await Promise.all([a.item(id), a.playback(id)])
    return { item, plan }
  })
  return (
    <main ref={frame} className="player-frame">
      {loaded.data
        ? <Playing key={id} api={api} id={id} frame={frame} item={loaded.data.item} first={loaded.data.plan} onRetry={loaded.reload} />
        : <Waiting error={loaded.error} onRetry={loaded.reload} />}
    </main>
  )
}

/** What shows while the title is being prepared, or when it couldn't be. */
function Waiting({ error, onRetry }: { error?: Error; onRetry: () => void }) {
  const nav = useNavigate()
  const { theme } = useTheme()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') nav(-1) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nav])
  return (
    <div className="player" data-look={theme.id}>
      <div className="pc-top">
        <button className="pc-btn" data-act="back" onClick={() => nav(-1)} aria-label={theme.words.player.back}><Icon name="left" size={22} /></button>
      </div>
      {error
        ? <div className="pc-err" role="alert"><p>{error.message}</p><button className="btn" onClick={onRetry}>Try again</button></div>
        : <div className="pc-loading" role="status">Loading…</div>}
    </div>
  )
}

function Playing({ api, id, frame, item, first, onRetry }: {
  api: Api
  id: string
  frame: RefObject<HTMLElement | null>
  item: Item
  first: Playback
  onRetry: () => void
}) {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const { settings } = useSettings()
  const { theme } = useTheme()
  const words = theme.words
  const say = words.player
  const layout = theme.player
  const video = useRef<HTMLVideoElement>(null)
  const idleTimer = useRef(0)
  const pauseTimer = useRef(0)
  const skipped = useRef(new Set<number>())
  const refocus = useRef<Menu>(null)

  const [initialTime] = useState(() => {
    const asked = params.get('t')
    const resume = (item.UserData?.PlaybackPositionTicks ?? 0) / 1e7
    return asked != null ? Number(asked) || 0 : resume > 5 ? resume : 0
  })
  const position = useRef(initialTime) // the last known position: what is reported to the server
  const streams = first.source.MediaStreams ?? []
  const audioStreams = streams.filter(s => s.Type === 'Audio')
  const subStreams = streams.filter(s => s.Type === 'Subtitle')

  const [startAudio] = useState(() => pickAudio(streams, settings.audioLang, first.source.DefaultAudioStreamIndex))
  const [audio, setAudio] = useState(startAudio)
  const [sub, setSub] = useState(() => pickSubtitle(streams, settings.subtitleMode, settings.subtitleLang, streams.find(s => s.Index === startAudio)?.Language))
  const [quality, setQuality] = useState<string>(settings.quality)
  const [speed, setSpeed] = useState(settings.speed)
  const [time, setTime] = useState(initialTime)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [pausedAWhile, setPausedAWhile] = useState(false)
  const [waiting, setWaiting] = useState(true)
  const [ended, setEnded] = useState(false)
  const [volume, setVolume] = useState(storedVolume)
  const [muted, setMuted] = useState(false)
  const [menu, setMenu] = useState<Menu>(null)
  const [anchor, setAnchor] = useState<number | null>(null) // where the open pop-up points: the middle of the button it came from
  const [idle, setIdle] = useState(false)
  const [nextDismissed, setNextDismissed] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [failure, setFailure] = useState('')
  const [plan, setPlan] = useState(first) // how it is being played now: a new one when the audio, a burned-in subtitle or the quality changes
  const [direct, setDirect] = useState(true) // false once playing the file as it is has failed
  const [slow, setSlow] = useState(false) // waiting for a while for more video
  const slowTimer = useRef(0)
  const [flash, setFlash] = useState<{ id: number; label: string; side: 'left' | 'right' } | null>(null)
  const tap = useRef({ at: 0, timer: 0, lastTouch: 0, count: 0 })

  const segments = useLoad(api, `segments|${id}`, a => a.segments(id)).data ?? NO_SEGMENTS
  const episodes = useLoad(api, `episodes|${item.SeriesId ?? ''}`, a =>
    (item.Type === 'Episode' && item.SeriesId ? a.episodes(item.SeriesId) : Promise.resolve(NO_EPISODES))).data ?? NO_EPISODES

  const subStream = sub != null ? streams.find(s => s.Index === sub) : undefined
  // Picture-based subtitles (PGS, VobSub) can't be shown by the video element, so the server burns them in.
  const burn = subStream && !subStream.IsTextSubtitleStream ? subStream.Index : null
  const bitrate = QUALITIES.find(q => q.id === quality)?.bps ?? 0
  const wanted: PlaybackOptions = { audio: audio ?? undefined, subtitle: burn ?? undefined, bitrate: bitrate || undefined, direct }
  const defaultAudio = first.source.DefaultAudioStreamIndex
  useEffect(() => {
    const had = plan.asked
    if ((wanted.audio ?? defaultAudio) === (had.audio ?? defaultAudio) && wanted.subtitle === had.subtitle && wanted.bitrate === had.bitrate && wanted.direct === (had.direct !== false)) return
    const ctl = new AbortController()
    api.with(ctl.signal).playback(id, wanted).then(setPlan, e => { if (!ctl.signal.aborted) setFailure((e as Error).message) })
    return () => ctl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `wanted` is made from the four values listed
  }, [api, id, audio, burn, bitrate, direct, plan.asked, defaultAudio])
  useStream({
    video, url: plan.url, kind: plan.kind, initialTime, speed, onFatal: setFailure,
    onFileFailed: () => { if (direct) setDirect(false); else setFailure("This video couldn't be played.") }
  })
  usePlaybackReport(api, id, plan, video, position)

  const preview = useMemo(() => {
    const sets = Object.entries(item.Trickplay?.[plan.source.Id] ?? {})
    if (!sets.length) return undefined
    const [width, info] = sets.reduce((best, cur) => (Math.abs(Number(cur[0]) - 320) < Math.abs(Number(best[0]) - 320) ? cur : best))
    return { info, tile: (index: number) => api.trickplayUrl(id, plan.source.Id, Number(width), index) }
  }, [item.Trickplay, plan.source.Id, api, id])
  const heading = item.Type === 'Episode'
    ? { name: item.SeriesName ?? item.Name, detail: say.episodeLine(item.ParentIndexNumber, item.IndexNumber, item.Name) }
    : { name: item.Name, detail: '' }
  const title = heading.detail ? `${heading.name} — ${heading.detail}` : heading.name
  usePageTitle(title)

  const nextEp = useMemo(() => {
    const at = episodes.findIndex(e => e.Id === id)
    return at >= 0 ? episodes[at + 1] ?? null : null
  }, [episodes, id])
  const nextId = nextEp?.Id
  const playNext = useCallback(() => { if (nextId) nav(`/play/${encodeURIComponent(nextId)}`) }, [nav, nextId])
  useMediaSession({ title: item.Name, subtitle: item.SeriesName ?? '', artwork: api.poster(item, 320), video, onNext: nextId ? playNext : null })

  // ---- what the video element is doing ----
  useEffect(() => {
    const el = video.current
    if (!el) return
    const tick = () => {
      if (el.readyState === 0) return // a stream swap resets the element; don't lose the position
      position.current = el.currentTime
      setTime(el.currentTime)
      if (Number.isFinite(el.duration)) setDuration(el.duration)
      if (el.buffered.length) setBuffered(el.buffered.end(el.buffered.length - 1))
    }
    const handlers: [string, () => void][] = [
      ['timeupdate', tick], ['progress', tick], ['durationchange', tick],
      ['play', () => { clearTimeout(pauseTimer.current); setPausedAWhile(false); setPlaying(true); setEnded(false) }],
      ['pause', () => {
        setPlaying(false)
        clearTimeout(pauseTimer.current)
        pauseTimer.current = window.setTimeout(() => setPausedAWhile(true), PAUSE_PANEL_AFTER_MS)
      }],
      ['ended', () => { setEnded(true); setPlaying(false) }],
      ['waiting', () => { setWaiting(true); clearTimeout(slowTimer.current); slowTimer.current = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS) }],
      ['playing', () => { setWaiting(false); setSlow(false); clearTimeout(slowTimer.current) }],
      ['canplay', () => { setWaiting(false); setSlow(false); clearTimeout(slowTimer.current) }],
      ['seeked', () => { setWaiting(false); setSlow(false); clearTimeout(slowTimer.current) }]
    ]
    handlers.forEach(([name, handler]) => el.addEventListener(name, handler))
    return () => {
      handlers.forEach(([name, handler]) => el.removeEventListener(name, handler))
      clearTimeout(pauseTimer.current)
      clearTimeout(slowTimer.current)
    }
  }, [video])
  useEffect(() => {
    const on = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])
  useEffect(() => { if (video.current) video.current.playbackRate = speed }, [speed, video])
  useEffect(() => {
    if (video.current) { video.current.volume = volume; video.current.muted = muted }
    try { localStorage.setItem(VOLUME_KEY, String(volume)) } catch { /* storage unavailable */ }
  }, [volume, muted, video])

  // ---- helpers ----
  const total = duration || (plan.source.RunTimeTicks ?? 0) / 1e7
  const { seek, bump, toggle } = useVideoControls(video)
  const toggleFullscreen = () => { if (document.fullscreenElement) void document.exitFullscreen(); else void frame.current?.requestFullscreen() }
  const armIdle = useCallback(() => {
    clearTimeout(idleTimer.current)
    idleTimer.current = window.setTimeout(() => setIdle(true), IDLE_AFTER_MS)
  }, [])
  const wake = useCallback(() => { setIdle(false); armIdle() }, [armIdle])
  useEffect(() => { armIdle(); return () => clearTimeout(idleTimer.current) }, [armIdle])

  const pick = (m: Menu) => setMenu(cur => (cur === m ? null : m))
  const openMenu = (m: OpenMenu, from: HTMLElement) => {
    const box = from.getBoundingClientRect()
    setAnchor(box.left + box.width / 2 - (frame.current?.getBoundingClientRect().left ?? 0))
    pick(m)
  }
  // Closing a menu you reached with the keyboard hands focus back to the button that opened it.
  const closeMenu = () => {
    if (document.activeElement?.closest('.pc-menu')) refocus.current = menu
    setMenu(null)
  }
  useEffect(() => {
    if (menu !== null || !refocus.current) return
    frame.current?.querySelector<HTMLElement>(`.pc-bar [data-act="${refocus.current}"]`)?.focus()
    refocus.current = null
  }, [menu, frame])

  // ---- skipping and what comes next ----
  const skippable = segments.find(s => SKIPPABLE[s.type] && time >= s.start - 0.05 && time < s.end - 0.3)
  const outro = segments.find(s => s.type === 'Outro')
  const nearEnd = total > 0 && total - time < 20
  const showNext = !!nextEp && !nextDismissed && ((!!outro && time >= outro.start) || ended || (!outro && nearEnd))
  const showEnd = ended && !nextEp

  useEffect(() => {
    if (settings.skipIntro !== 'auto' || !skippable || skipped.current.has(skippable.start)) return
    skipped.current.add(skippable.start)
    seek(skippable.end)
  }, [skippable, settings.skipIntro, seek])

  // ---- keyboard ----
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null
    const tag = target?.tagName
    const isRange = tag === 'INPUT' && (target as HTMLInputElement).type === 'range'
    if (tag === 'SELECT' || tag === 'TEXTAREA' || (tag === 'INPUT' && !isRange)) return
    wake()
    if (isRange && e.key.startsWith('Arrow')) return // a focused slider uses the arrows itself
    switch (e.key) {
      case ' ':
        if (tag === 'BUTTON' || tag === 'A') return // Space presses the focused button instead
        e.preventDefault(); toggle(); break
      case 'k': toggle(); break
      case 'ArrowRight': case 'l': bump(SKIP_SECONDS); break
      case 'ArrowLeft': case 'j': bump(-SKIP_SECONDS); break
      case 'ArrowUp': e.preventDefault(); setVolume(v => Math.min(1, +(v + 0.1).toFixed(2))); setMuted(false); break
      case 'ArrowDown': e.preventDefault(); setVolume(v => Math.max(0, +(v - 0.1).toFixed(2))); break
      case 'm': setMuted(m => !m); break
      case 'f': toggleFullscreen(); break
      case 'c': setSub(s => (s == null ? subStreams[0]?.Index ?? null : null)); break
      case 'n': playNext(); break
      case 'Escape':
        if (menu) closeMenu()
        else if (document.fullscreenElement) void document.exitFullscreen()
        else nav(-1)
        break
    }
  })
  useEffect(() => {
    const handler = (e: KeyboardEvent) => onKey(e)
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const choose = (apply: () => void) => { apply(); closeMenu() }

  // Touch: one tap on the picture shows or hides the controls; two taps skip back (left third), forward (right third) or
  // pause and play (middle).
  const onPictureTap = (e: ReactPointerEvent<HTMLVideoElement>) => {
    if (e.pointerType !== 'touch') return
    const now = performance.now()
    tap.current.lastTouch = now
    const box = e.currentTarget.getBoundingClientRect()
    const across = (e.clientX - box.left) / box.width
    if (now - tap.current.at < DOUBLE_TAP_MS) {
      clearTimeout(tap.current.timer)
      tap.current.at = 0
      const show = (by: number, side: 'left' | 'right') => {
        bump(by)
        setFlash({ id: ++tap.current.count, label: `${by > 0 ? '+' : '−'}${SKIP_SECONDS} s`, side })
        window.setTimeout(() => setFlash(cur => (cur && cur.id === tap.current.count ? null : cur)), 700)
      }
      if (across < 1 / 3) show(-SKIP_SECONDS, 'left')
      else if (across > 2 / 3) show(SKIP_SECONDS, 'right')
      else toggle()
      return
    }
    tap.current.at = now
    tap.current.timer = window.setTimeout(() => {
      tap.current.at = 0
      if (menu) closeMenu()
      else if (idle) wake()
      else setIdle(true)
    }, DOUBLE_TAP_MS)
  }

  return (
    <div className={`player ${playing ? 'is-playing' : 'is-paused'} ${idle && playing && !menu ? 'idle' : ''} ${menu ? 'menu-open' : ''}`}
      data-look={theme.id}
      onPointerMove={e => { if (e.pointerType !== 'touch') wake() }}
      onPointerDown={e => { if (!(e.pointerType === 'touch' && e.target === video.current)) wake() }}>
      {/* oxlint-disable-next-line jsx-a11y/media-has-caption -- subtitle tracks are chosen from the player's own menu and added below */}
      <video ref={video} crossOrigin="anonymous" playsInline aria-label={title} onPointerUp={onPictureTap}
        onClick={e => { if ((e.nativeEvent as PointerEvent).pointerType === 'touch') return; if (menu) closeMenu(); else toggle() }}
        onDoubleClick={() => { if (performance.now() - tap.current.lastTouch > 600) toggleFullscreen() }}>
        {subStream?.IsTextSubtitleStream && (
          <track key={sub} kind="subtitles" default src={api.subtitleUrl(id, plan.source.Id, subStream.Index)} srcLang={subStream.Language ?? ''} label={trackLabel(subStream)} />
        )}
      </video>

      {layout.pausePanel && pausedAWhile && !playing && !ended && !menu && (
        <div className="pc-paused" aria-hidden="true">
          <small>{say.nowWatching}</small>
          <h2>{heading.name}</h2>
          {heading.detail && <p className="ep">{heading.detail}</p>}
          {item.Overview && <p className="ov">{item.Overview}</p>}
        </div>
      )}

      <Chrome layout={layout} say={say} episodesLabel={words.episodes} heading={heading} segments={segments} preview={preview}
        state={{ playing, muted, volume, time, duration: total, buffered, fullscreen, menu }}
        available={{ next: !!nextEp, episodes: episodes.length > 0, tracks: audioStreams.length > 0 || subStreams.length > 0 }}
        on={{
          back: () => nav(-1), toggle, bump, seek, next: playNext, menu: openMenu, fullscreen: toggleFullscreen,
          mute: () => setMuted(m => !m), setVolume: v => { setVolume(v); setMuted(false) }
        }} />

      {flash && <div key={flash.id} className={`pc-flash ${flash.side}`} aria-hidden="true">{flash.label}</div>}
      {waiting && !failure && (
        <div className="pc-buffering" role="status">
          <div className="pc-spinner" aria-label="Buffering" />
          {slow && <p>{plan.method === 'DirectPlay' ? 'Waiting for the server…' : 'Waiting for the server to convert the video…'}</p>}
        </div>
      )}
      {failure && (
        <div className="pc-err" role="alert">
          <p>{failure}</p>
          <button className="btn" onClick={onRetry}>Try again</button>
        </div>
      )}

      {skippable && settings.skipIntro === 'button' && (
        <button className="pc-skip" data-act="skip" onClick={() => seek(skippable.end)}>{SKIPPABLE[skippable.type]}</button>
      )}
      {showNext && nextEp && <NextEpisodeCard key={nextEp.Id} api={api} episode={nextEp} autoplay={settings.autoplayNext} say={say} onPlay={playNext} onDismiss={() => setNextDismissed(true)} />}
      {showEnd && (
        <div className="pc-end">
          <button className="btn primary" data-act="replay" onClick={() => { seek(0); video.current?.play().catch(() => { /* the viewer can press play */ }) }}><Icon name="play" size={18} />Replay</button>
          <button className="btn" onClick={() => nav(-1)}>Back</button>
        </div>
      )}

      <PlayerMenus menu={menu} anchor={anchor} say={say} layout={layout} api={api} audioStreams={audioStreams} subStreams={subStreams}
        audio={audio} sub={sub} quality={quality} speed={speed} episodes={episodes} currentId={id} episodesLabel={words.episodes}
        onAudio={i => choose(() => setAudio(i))} onSub={i => choose(() => setSub(i))} onQuality={q => choose(() => setQuality(q))}
        onSpeed={s => choose(() => setSpeed(s))} onEpisode={e => nav(`/play/${encodeURIComponent(e)}`)} />
    </div>
  )
}
