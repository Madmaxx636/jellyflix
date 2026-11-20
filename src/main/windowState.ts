import { app, screen, type BrowserWindow } from 'electron'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseSavedWindow, placeWindow, type SavedWindow } from './geometry'

const SAVE_AFTER_MS = 400
const file = () => join(app.getPath('userData'), 'window-state.json')

/** Where the window was last time, if that spot is still on a screen that is connected. */
export function restoreWindowState(): SavedWindow {
  let saved: SavedWindow | null = null
  try { saved = parseSavedWindow(JSON.parse(readFileSync(file(), 'utf8'))) } catch { /* first run, or an unreadable file */ }
  return placeWindow(saved, screen.getAllDisplays().map(d => d.workArea))
}

/** Remembers the window's size, place and whether it was maximized, for the next start. */
export function trackWindowState(win: BrowserWindow): void {
  let timer: NodeJS.Timeout | undefined
  const save = () => {
    clearTimeout(timer)
    if (win.isDestroyed() || win.isMinimized() || win.isFullScreen()) return
    const { x, y, width, height } = win.getNormalBounds() // the size it has when not maximized, so un-maximizing goes back to it
    try { writeFileSync(file(), JSON.stringify({ x, y, width, height, maximized: win.isMaximized() })) } catch { /* the next start just uses the defaults */ }
  }
  const soon = () => { clearTimeout(timer); timer = setTimeout(save, SAVE_AFTER_MS) }
  win.on('resize', soon)
  win.on('move', soon)
  win.on('maximize', soon)
  win.on('unmaximize', soon)
  win.on('close', save)
}
