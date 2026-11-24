import { useEffect, useRef } from 'react'
import { stepScale } from '../../../shared/zoom'

const WHEEL_STEP = 120 // pixels of pinching that make one step

/**
 * Applies the interface size, and lets the keyboard (Ctrl or Cmd with + - 0) and a trackpad pinch (which arrives as a
 * wheel with Ctrl held) change it. Outside the desktop app the page is scaled with CSS instead.
 */
export function useAppScale(scale: number, setScale: (scale: number) => void) {
  const latest = useRef(scale)
  useEffect(() => { latest.current = scale }, [scale])

  useEffect(() => {
    const view = window.jellyflix?.view
    if (view) view.setScale(scale)
    else document.documentElement.style.setProperty('zoom', String(scale))
  }, [scale])

  useEffect(() => window.jellyflix?.view.onZoomKey(key => setScale(stepScale(latest.current, key))), [setScale])

  useEffect(() => {
    let pinch = 0
    let timer = 0
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      pinch += e.deltaY
      window.clearTimeout(timer)
      timer = window.setTimeout(() => { pinch = 0 }, 300)
      if (Math.abs(pinch) < WHEEL_STEP) return
      setScale(stepScale(latest.current, pinch < 0 ? 'in' : 'out'))
      pinch = 0
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => { window.removeEventListener('wheel', onWheel); window.clearTimeout(timer) }
  }, [setScale])
}
