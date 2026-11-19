import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Hls from 'hls.js'
import { Api } from '../api/jellyfin'

export default function Player({ api }: { api: Api }) {
  const { id } = useParams()
  const nav = useNavigate()
  const video = useRef<HTMLVideoElement>(null)
  const [err, setErr] = useState('')
  const [title, setTitle] = useState('')
  const [idle, setIdle] = useState(false)

  useEffect(() => {
    if (!id || !video.current) return
    const el = video.current
    let hls: Hls | null = null
    let timer: number | undefined
    let ctx: { playSessionId: string; mediaSourceId: string } | null = null
    const body = () => ({
      ItemId: id, MediaSourceId: ctx?.mediaSourceId, PlaySessionId: ctx?.playSessionId,
      PositionTicks: Math.floor(el.currentTime * 10_000_000), IsPaused: el.paused
    })
    let cancelled = false

    ;(async () => {
      try {
        const [item, stream] = await Promise.all([api.item(id), api.streamUrl(id)])
        if (cancelled) return
        ctx = stream
        setTitle(item.Type === 'Episode' ? `${item.SeriesName} — S${item.ParentIndexNumber}E${item.IndexNumber} ${item.Name}` : item.Name)
        const start = (item.UserData?.PlaybackPositionTicks ?? 0) / 10_000_000
        const begin = () => { if (start > 5) el.currentTime = start; el.play().catch(() => {}) }

        if (Hls.isSupported()) {
          hls = new Hls({ startPosition: start > 5 ? start : -1 })
          hls.loadSource(stream.url)
          hls.attachMedia(el)
          hls.on(Hls.Events.MANIFEST_PARSED, () => el.play().catch(() => {}))
          hls.on(Hls.Events.ERROR, (_e, d) => { if (d.fatal) setErr(`Playback failed (${d.details})`) })
        } else {
          el.src = stream.url
          el.addEventListener('loadedmetadata', begin, { once: true })
        }
        api.report('Playing', body())
        timer = window.setInterval(() => api.report('Progress', body()), 10_000)
      } catch (e) { setErr((e as Error).message) }
    })()

    return () => {
      cancelled = true
      clearInterval(timer)
      if (ctx) api.report('Stopped', body())
      hls?.destroy()
    }
  }, [id, api])

  // Hide the overlay while the mouse is still; keyboard: Esc back, F fullscreen, Space pause.
  useEffect(() => {
    let t: number
    const wake = () => { setIdle(false); clearTimeout(t); t = window.setTimeout(() => setIdle(true), 3000) }
    const key = (e: KeyboardEvent) => {
      wake()
      if (e.key === 'Escape') document.fullscreenElement ? document.exitFullscreen() : nav(-1)
      else if (e.key === 'f') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()
      else if (e.key === ' ') { e.preventDefault(); const v = video.current; if (v) v.paused ? v.play() : v.pause() }
      else if (e.key === 'ArrowRight' && video.current) video.current.currentTime += 10
      else if (e.key === 'ArrowLeft' && video.current) video.current.currentTime -= 10
    }
    wake()
    window.addEventListener('mousemove', wake)
    window.addEventListener('keydown', key)
    return () => { clearTimeout(t); window.removeEventListener('mousemove', wake); window.removeEventListener('keydown', key) }
  }, [nav])

  return (
    <div className={`player ${idle ? 'idle' : ''}`}>
      <video ref={video} controls autoPlay />
      <div className="player-top">
        <button className="btn small" onClick={() => nav(-1)}>← Back</button>
        <span>{title}</span>
      </div>
      {err && <p className="error player-err">{err}</p>}
    </div>
  )
}
