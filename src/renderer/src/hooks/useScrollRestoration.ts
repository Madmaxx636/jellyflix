import { useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

const positions = new Map<string, number>()
const GIVE_UP_AFTER_MS = 3000

/**
 * Going to a new page starts at the top. Going Back returns to where you were: the page may still be loading, so keep trying
 * until it is tall enough, and stop if you start scrolling yourself. Changing a sort, a filter or a search term (which swaps
 * the address without leaving the page) doesn't move you.
 */
export function useScrollRestoration() {
  const { key, pathname } = useLocation()
  const navigation = useNavigationType()
  const previous = useRef({ key, pathname })

  // Note where the current page is scrolled to.
  useEffect(() => {
    const note = () => positions.set(key, window.scrollY)
    window.addEventListener('scroll', note, { passive: true })
    return () => window.removeEventListener('scroll', note)
  }, [key])

  useEffect(() => {
    const before = previous.current
    previous.current = { key, pathname }
    if (navigation === 'REPLACE' && before.pathname === pathname) {
      positions.set(key, positions.get(before.key) ?? window.scrollY) // same page under a new address: carry the place over
      return
    }
    const target = navigation === 'POP' ? positions.get(key) : undefined
    if (!target) { window.scrollTo(0, 0); return }
    let frame = 0
    let stopped = false
    const startedAt = performance.now()
    const stop = () => { stopped = true }
    window.addEventListener('wheel', stop, { once: true, passive: true })
    window.addEventListener('keydown', stop, { once: true })
    const step = () => {
      if (stopped) return
      window.scrollTo(0, target)
      if (Math.abs(window.scrollY - target) >= 2 && performance.now() - startedAt < GIVE_UP_AFTER_MS) frame = requestAnimationFrame(step)
    }
    step()
    return () => {
      stopped = true
      cancelAnimationFrame(frame)
      window.removeEventListener('wheel', stop)
      window.removeEventListener('keydown', stop)
    }
  }, [key, pathname, navigation])
}
