import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { canScrollSideways, edgeSide, SWIPE_PX, swipeProgress, wheelSwipe, type WheelSwipe } from '../util/backGesture'
import Icon from './Icon'

/** Going back needs an earlier page. (The router's own entry count restarts at 0 after a reload, so the browser's count is used.) */
const canGoBack = () => window.history.length > 1

/**
 * Back by swiping: from either edge of a touch screen toward the middle (a round arrow follows the finger), or sideways with
 * two fingers on a trackpad. Both do what the Back button does, and nothing on the first page.
 */
export default function BackGestures() {
  const nav = useNavigate()
  const swipe = useRef<WheelSwipe>({ total: 0, at: 0, fired: false }) // kept across renders: one swipe spans many wheel events
  const [hint, setHint] = useState<{ side: 'left' | 'right'; progress: number } | null>(null)

  useEffect(() => {
    let side: 'left' | 'right' | null = null
    let start = { x: 0, y: 0 }
    let reached = 0 // how far the finger got; the browser may take a sideways drag over (touchcancel), so this is kept as it goes
    const touchPoint = (e: TouchEvent) => ({ x: e.touches[0]?.clientX ?? 0, y: e.touches[0]?.clientY ?? 0 })
    const onStart = (e: TouchEvent) => {
      side = e.touches.length === 1 && canGoBack() ? edgeSide(touchPoint(e).x, window.innerWidth) : null
      start = touchPoint(e)
      reached = 0
    }
    const onMove = (e: TouchEvent) => {
      if (!side) return
      const progress = e.touches.length === 1 ? swipeProgress(side, start, touchPoint(e)) : null
      if (progress === null) { side = null; setHint(null); return }
      reached = progress
      setHint(progress > 8 ? { side, progress: Math.min(1, progress / SWIPE_PX) } : null)
    }
    const finish = () => {
      const done = side
      side = null
      setHint(null)
      if (done && reached >= SWIPE_PX) nav(-1)
    }
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', finish, { passive: true })
    window.addEventListener('touchcancel', finish, { passive: true })

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || !canGoBack()) return
      if (e.deltaX < 0 && canScrollSideways(e.target as Element | null, e.deltaX)) { swipe.current = { ...swipe.current, total: 0, at: e.timeStamp }; return }
      const r = wheelSwipe(swipe.current, { deltaX: e.deltaX, deltaY: e.deltaY, time: e.timeStamp })
      swipe.current = r.state
      if (r.back) nav(-1)
    }
    window.addEventListener('wheel', onWheel, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', finish)
      window.removeEventListener('touchcancel', finish)
      window.removeEventListener('wheel', onWheel)
    }
  }, [nav])

  if (!hint) return null
  const reach = 64 * hint.progress - 44 // slides in from off-screen
  return (
    <div className={`back-swipe ${hint.side}`} style={{ [hint.side]: `${reach}px`, opacity: hint.progress }} aria-hidden="true">
      <Icon name="left" size={22} />
    </div>
  )
}
