import { app, BrowserWindow, session, shell } from 'electron'
import { join } from 'path'

// Test hook: with JELLYFLIX_HIDDEN=1 the app renders offscreen and never shows a window, so UI
// tests can drive it over --remote-debugging-port without putting anything on the user's desktop.
// (A merely hidden native window stops producing frames, so screenshots would hang.)
const HIDDEN = process.env['JELLYFLIX_HIDDEN'] === '1'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1400,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#141414',
    autoHideMenuBar: true,
    title: 'Jellyflix',
    show: !HIDDEN,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      backgroundThrottling: !HIDDEN,
      offscreen: HIDDEN
    }
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  else win.loadFile(join(__dirname, '../renderer/index.html'))
}

app.whenReady().then(() => {
  // The renderer talks straight to the user's Jellyfin server, which is a different
  // origin from the app. Relax CORS for those responses only (not for navigation).
  session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
    const headers = { ...details.responseHeaders }
    for (const k of Object.keys(headers)) {
      if (k.toLowerCase().startsWith('access-control-')) delete headers[k]
    }
    headers['Access-Control-Allow-Origin'] = ['*']
    headers['Access-Control-Allow-Headers'] = ['*']
    headers['Access-Control-Allow-Methods'] = ['GET, POST, DELETE, OPTIONS']
    cb({ responseHeaders: headers })
  })
  createWindow()
  app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow())
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
