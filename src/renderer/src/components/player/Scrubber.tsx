import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { Segment } from '../../api/jellyfin'
import { clock } from '../../util/time'

const ARROW_STEP = 5
const PAGE_STEP = 60

/** The seek bar: click or drag to jump, or focus it and use the arrow keys (5 s), Page Up / Page Down (1 min), Home and End. */
export default function Scrubber({ time, duration, buffered, segments, onSeek }: {
  time: number
  duration: number
  buffered: number
  segments: Segment[]
  onSeek: (seconds: number) => void
}) {
  const track = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)

  const at = (clientX: number) => {
    const box = track.current?.getBoundingClientRect()
    if (!box || !box.width) return 0
    return Math.min(1, Math.max(0, (clientX - box.left) / box.width)) * duration
  }
  const pct = (seconds: number) => (duration > 0 ? `${Math.min(100, (seconds / duration) * 100)}%` : '0%')

  const onKeyDown = (e: KeyboardEvent) => {
    const jump: Record<string, number> = { ArrowRight: ARROW_STEP, ArrowLeft: -ARROW_STEP, PageUp: PAGE_STEP, PageDown: -PAGE_STEP }
    let to: number | undefined
    if (e.key in jump) to = time + jump[e.key]
    else if (e.key === 'Home') to = 0
    else if (e.key === 'End') to = duration
    if (to === undefined) return
    e.preventDefault()
    e.stopPropagation() // the player's own arrow-key shortcuts must not seek a second time
    onSeek(Math.min(duration, Math.max(0, to)))
  }

  return (
    <div ref={track} className="pc-scrub" role="slider" tabIndex={0} aria-label="Seek" aria-valuemin={0} aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(time)} aria-valuetext={`${clock(time)} of ${clock(duration)}`}
      onKeyDown={onKeyDown}
      onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); onSeek(at(e.clientX)) }}
      onPointerMove={(e: PointerEvent) => { setHover(at(e.clientX)); if (e.buttons === 1) onSeek(at(e.clientX)) }}
      onPointerLeave={() => setHover(null)}>
      <div className="buf" style={{ width: pct(buffered) }} />
      <div className="pos" style={{ width: pct(time) }} />
      {segments.filter(s => s.type === 'Intro' || s.type === 'Outro').map(s => <i key={`${s.type}${s.start}`} className="mark" style={{ left: pct(s.start), width: pct(s.end - s.start) }} />)}
      <div className="knob" style={{ left: pct(time) }} />
      {hover != null && <div className="tip" style={{ left: pct(hover) }}>{clock(hover)}</div>}
    </div>
  )
}
