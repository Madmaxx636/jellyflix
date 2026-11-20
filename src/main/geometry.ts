// Where the window goes when the app starts. Plain functions on plain numbers, so they can be tested without Electron.

export interface Rect { x: number; y: number; width: number; height: number }
export interface SavedWindow { width: number; height: number; x?: number; y?: number; maximized: boolean }

export const DEFAULT_WINDOW: SavedWindow = { width: 1400, height: 860, maximized: false }
export const MIN_WINDOW = { width: 900, height: 600 }

/** How much of a window must be on a screen for it to count as reachable (enough to grab its title bar and drag it). */
const MIN_VISIBLE = 120

const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** True when enough of the window is on one of the screens to be moved from there. */
export function isReachable(window: Rect, screens: Rect[]): boolean {
  return screens.some(s =>
    Math.min(window.x + window.width, s.x + s.width) - Math.max(window.x, s.x) >= MIN_VISIBLE &&
    Math.min(window.y + window.height, s.y + s.height) - Math.max(window.y, s.y) >= MIN_VISIBLE)
}

/** Reads a saved file's contents. Anything that isn't a sensible window gives null (the defaults are used instead). */
export function parseSavedWindow(raw: unknown): SavedWindow | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (!finite(r['width']) || !finite(r['height']) || r['width'] < MIN_WINDOW.width || r['height'] < MIN_WINDOW.height) return null
  if (r['width'] > 20_000 || r['height'] > 20_000) return null
  const saved: SavedWindow = { width: Math.round(r['width']), height: Math.round(r['height']), maximized: r['maximized'] === true }
  if (finite(r['x']) && finite(r['y'])) { saved.x = Math.round(r['x']); saved.y = Math.round(r['y']) }
  return saved
}

/** Where to open: the saved spot if enough of it is still on a connected screen, otherwise the saved size wherever the system puts it. */
export function placeWindow(saved: SavedWindow | null, screens: Rect[]): SavedWindow {
  if (!saved) return { ...DEFAULT_WINDOW }
  if (saved.x === undefined || saved.y === undefined) return saved
  const spot = { x: saved.x, y: saved.y, width: saved.width, height: saved.height }
  return isReachable(spot, screens) ? saved : { width: saved.width, height: saved.height, maximized: saved.maximized }
}
