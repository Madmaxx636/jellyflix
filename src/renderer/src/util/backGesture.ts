// Swipe-to-go-back, as plain decisions (no page code in here, so they are easy to test).

export const EDGE_PX = 24 // a swipe has to start this close to a side of the window
export const SWIPE_PX = 90 // and travel this far across
export const WHEEL_PX = 220 // a trackpad's two-finger swipe: this much sideways scrolling in one go

/** Which side a touch at [x] starts a back swipe from, if any. */
export function edgeSide(x: number, width: number): 'left' | 'right' | null {
  if (x <= EDGE_PX) return 'left'
  if (x >= width - EDGE_PX) return 'right'
  return null
}

/** How far a finger has moved from [side]'s edge toward the middle, or null once the move is more up-and-down than across. */
export function swipeProgress(side: 'left' | 'right', start: { x: number; y: number }, now: { x: number; y: number }): number | null {
  const across = side === 'left' ? now.x - start.x : start.x - now.x
  const down = Math.abs(now.y - start.y)
  if (down > 24 && down > Math.abs(across) * 0.8) return null
  return Math.max(0, across)
}

/**
 * Adds one wheel event to a trackpad swipe. Two fingers swiped to the right arrive as a negative `deltaX`; that, with enough
 * travel and clearly more sideways than up-and-down, is "back". After it fires, the rest of the swipe's momentum is ignored
 * until the events stop for a moment.
 */
export interface WheelSwipe { total: number; at: number; fired: boolean }
export const QUIET_MS = 250

export function wheelSwipe(state: WheelSwipe, e: { deltaX: number; deltaY: number; time: number }): { state: WheelSwipe; back: boolean } {
  const quiet = e.time - state.at > QUIET_MS
  const base: WheelSwipe = quiet ? { total: 0, at: e.time, fired: false } : { ...state, at: e.time }
  if (base.fired) return { state: base, back: false }
  if (Math.abs(e.deltaX) < Math.abs(e.deltaY) * 1.5) return { state: { ...base, total: 0 }, back: false }
  const total = base.total + e.deltaX
  if (total <= -WHEEL_PX) return { state: { total: 0, at: e.time, fired: true }, back: true }
  return { state: { ...base, total }, back: false }
}

/** True when something under the pointer can still scroll sideways in the direction of [deltaX] (a row of posters). */
export function canScrollSideways(from: Element | null, deltaX: number): boolean {
  for (let el: Element | null = from; el; el = el.parentElement) {
    const style = getComputedStyle(el)
    if (!/(auto|scroll)/.test(style.overflowX) || el.scrollWidth <= el.clientWidth) continue
    if (deltaX < 0 ? el.scrollLeft > 0 : el.scrollLeft + el.clientWidth < el.scrollWidth - 1) return true
  }
  return false
}
