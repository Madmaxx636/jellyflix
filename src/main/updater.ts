import { app, BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { autoUpdater } from 'electron-updater'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { isNewer, type UpdateInfo, type UpdateState } from '../shared/updates'

const REPO = 'Madmaxx636/jellyflix'
const FIRST_CHECK_MS = 15_000
const CHECK_EVERY_MS = 6 * 60 * 60_000

const settingsFile = () => join(app.getPath('userData'), 'updates.json')
const readAuto = (): boolean => {
  try { return JSON.parse(readFileSync(settingsFile(), 'utf8')).auto !== false } catch { return true }
}

/**
 * Keeps the app up to date from this project's GitHub releases.
 *
 * Installs that can replace themselves (the Windows installer, the Linux AppImage) download a new version in the
 * background and offer a restart. Every other install (macOS, which is not signed, the portable exe, deb, rpm, pacman, tar.gz) is told
 * that a newer version exists and where to get it. Development builds do nothing, unless JELLYFLIX_UPDATE_FEED names a test
 * server (that is only honoured when the app is not packaged).
 */
export function startUpdates(isAppUrl: (url: string) => boolean, quiet: boolean): void {
  const testFeed = app.isPackaged ? undefined : process.env['JELLYFLIX_UPDATE_FEED']
  const replacesItself = testFeed !== undefined ||
    (app.isPackaged && ((process.platform === 'win32' && !process.env['PORTABLE_EXECUTABLE_DIR']) || (process.platform === 'linux' && !!process.env['APPIMAGE'])))
  const active = testFeed !== undefined || (app.isPackaged && !quiet)

  let auto = readAuto()
  let state: UpdateState = active ? { kind: 'idle' } : { kind: 'off', reason: app.isPackaged ? 'Updates are off in this run.' : 'This is a development build.' }
  let timer: NodeJS.Timeout | undefined

  const info = (): UpdateInfo => ({ state, auto, current: app.getVersion() })
  const set = (next: UpdateState) => {
    state = next
    for (const win of BrowserWindow.getAllWindows()) win.webContents.send('updates:changed', info())
  }

  if (replacesItself && active) {
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.logger = null
    if (testFeed !== undefined) {
      // A development build has no packaged update settings: write them where the updater can read them.
      const config = join(app.getPath('userData'), 'dev-app-update.yml')
      writeFileSync(config, `provider: generic\nurl: ${testFeed}\nupdaterCacheDirName: jellyflix-updater\n`)
      autoUpdater.forceDevUpdateConfig = true
      autoUpdater.updateConfigPath = config
      autoUpdater.setFeedURL({ provider: 'generic', url: testFeed })
    }
    autoUpdater.on('checking-for-update', () => set({ kind: 'checking' }))
    autoUpdater.on('update-available', i => set({ kind: 'downloading', version: i.version, percent: 0 }))
    autoUpdater.on('download-progress', p => { if (state.kind === 'downloading') set({ ...state, percent: Math.round(p.percent) }) })
    autoUpdater.on('update-not-available', () => set({ kind: 'idle', checkedAt: Date.now() }))
    autoUpdater.on('update-downloaded', i => set({ kind: 'ready', version: i.version }))
    autoUpdater.on('error', e => set({ kind: 'error', message: e.message.split('\n')[0].slice(0, 200) }))
  }

  /** For installs that can't replace themselves: ask GitHub what the newest release is. */
  async function lookForRelease(): Promise<void> {
    set({ kind: 'checking' })
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(10_000) })
      if (!res.ok) throw new Error(`GitHub answered ${res.status}`)
      const release = (await res.json()) as { tag_name?: string; html_url?: string }
      if (release.tag_name && release.html_url?.startsWith('https://github.com/') && isNewer(release.tag_name, app.getVersion())) {
        set({ kind: 'available', version: release.tag_name.replace(/^v/, ''), url: release.html_url })
      } else set({ kind: 'idle', checkedAt: Date.now() })
    } catch (e) {
      set({ kind: 'error', message: (e as Error).message.slice(0, 200) })
    }
  }

  async function check(): Promise<void> {
    if (!active || state.kind === 'checking' || state.kind === 'downloading' || state.kind === 'ready') return
    if (replacesItself) await autoUpdater.checkForUpdates().catch(() => { /* reported through the error event */ })
    else await lookForRelease()
  }

  const schedule = () => {
    clearInterval(timer)
    if (active && auto) timer = setInterval(() => void check(), CHECK_EVERY_MS)
  }

  // Only the app's own page may ask.
  const trusted = (e: IpcMainInvokeEvent) => {
    if (!e.senderFrame || !isAppUrl(e.senderFrame.url)) throw new Error('not allowed')
  }
  ipcMain.handle('updates:info', e => { trusted(e); return info() })
  ipcMain.handle('updates:check', async e => { trusted(e); await check(); return info() })
  ipcMain.handle('updates:install', e => { trusted(e); if (replacesItself && state.kind === 'ready') autoUpdater.quitAndInstall(true, true) })
  ipcMain.handle('updates:auto', (e, on: unknown) => {
    trusted(e)
    auto = on === true
    try { writeFileSync(settingsFile(), JSON.stringify({ auto })) } catch { /* the choice just won't be remembered */ }
    schedule()
    set(state)
    return info()
  })

  if (active && auto) setTimeout(() => void check(), testFeed !== undefined ? 1000 : FIRST_CHECK_MS)
  schedule()
}
