import { app, BrowserWindow, dialog, session } from 'electron'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { DEFAULT_WINDOW, MIN_WINDOW } from './geometry'
import { addEditingContextMenu, allowServerResponses, guardNavigation, restrictPermissions } from './security'
import { handleCertificates } from './certificates'
import { startUpdates } from './updater'
import { restoreWindowState, trackWindowState } from './windowState'
import { zoomKeyOf } from '../shared/zoom'

// Test hook: with JELLYFLIX_HIDDEN=1 the app renders offscreen and never shows a window, so UI
// tests can drive it over --remote-debugging-port without putting anything on the user's desktop.
// (A merely hidden native window stops producing frames, so screenshots would hang.)
const HIDDEN = process.env['JELLYFLIX_HIDDEN'] === '1'
if (HIDDEN) app.commandLine.appendSwitch('mute-audio') // a hidden test run makes no sound either
const DEV_URL = process.env['ELECTRON_RENDERER_URL']
const INDEX_FILE = join(__dirname, '../renderer/index.html')
const ICON = join(__dirname, '../../build/icon.png')

const APP_URL = new URL(DEV_URL ?? pathToFileURL(INDEX_FILE).toString())
/** The app's own page, whatever follows the # (that is the app moving between its screens). */
const isAppUrl = (url: string) => {
  try {
    const u = new URL(url)
    return u.origin === APP_URL.origin && u.pathname === APP_URL.pathname
  } catch { return false }
}

const MAX_RESTARTS = 3
const RESTART_WINDOW_MS = 60_000

/** If the page's process dies, load it again. If it keeps dying, stop and say so instead of looping. */
function recoverFromCrashes(win: BrowserWindow): void {
  const restarts: number[] = []
  win.webContents.on('render-process-gone', (_event, details) => {
    if (details.reason === 'clean-exit') return
    const now = Date.now()
    while (restarts.length && now - restarts[0] > RESTART_WINDOW_MS) restarts.shift()
    restarts.push(now)
    if (restarts.length <= MAX_RESTARTS) win.webContents.reload()
    else dialog.showErrorBox('Jellyflix stopped working', `The window keeps crashing (${details.reason}). Close the app and open it again.`)
  })
}

function createWindow(): void {
  const placed = HIDDEN ? DEFAULT_WINDOW : restoreWindowState()
  const win = new BrowserWindow({
    width: placed.width,
    height: placed.height,
    ...(placed.x !== undefined && placed.y !== undefined ? { x: placed.x, y: placed.y } : {}),
    minWidth: MIN_WINDOW.width,
    minHeight: MIN_WINDOW.height,
    backgroundColor: '#141414',
    autoHideMenuBar: true,
    title: 'Jellyflix',
    ...(existsSync(ICON) ? { icon: ICON } : {}),
    show: !HIDDEN,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: !HIDDEN,
      offscreen: HIDDEN
    }
  })
  if (placed.maximized) win.maximize()
  if (!HIDDEN) trackWindowState(win)

  guardNavigation(win.webContents, isAppUrl)
  addEditingContextMenu(win.webContents)
  // Ctrl or Cmd with + - 0 changes the app's own size setting (see Settings > Interface size) instead of the browser's zoom.
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return
    const key = zoomKeyOf({ key: input.key, control: input.control, meta: input.meta, alt: input.alt })
    if (!key) return
    event.preventDefault()
    win.webContents.send('view:zoom', key)
  })
  recoverFromCrashes(win)

  if (DEV_URL) void win.loadURL(DEV_URL)
  else void win.loadFile(INDEX_FILE)
}

// One window per profile folder: starting the app again brings the open one forward. (The test rig gives every run its
// own profile folder, and runs hidden, so it never meets this.)
if (!HIDDEN && !app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (!win) return
    if (win.isMinimized()) win.restore()
    win.focus()
  })

  void app.whenReady().then(() => {
    restrictPermissions(session.defaultSession)
    allowServerResponses(session.defaultSession)
    createWindow()
    startUpdates(isAppUrl, HIDDEN)
    handleCertificates(isAppUrl, () => BrowserWindow.getAllWindows()[0])
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
