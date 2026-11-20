import { Menu, shell, type MenuItemConstructorOptions, type Session, type WebContents } from 'electron'
import { isWebUrl } from '../shared/url'

/**
 * The only thing the app asks the system for is full screen (the player). Camera, microphone, location, notifications and
 * the rest are refused, whatever a page asks: the pages here only ever show a media library.
 */
const ALLOWED_PERMISSIONS = new Set(['fullscreen'])

export function restrictPermissions(ses: Session): void {
  ses.setPermissionRequestHandler((_contents, permission, callback) => callback(ALLOWED_PERMISSIONS.has(permission)))
  ses.setPermissionCheckHandler((_contents, permission) => ALLOWED_PERMISSIONS.has(permission))
}

/**
 * The app talks straight to the user's Jellyfin server, which is a different origin from the app, so its answers are
 * given the CORS headers the page needs. Only answers from web servers are touched: never the app's own files.
 */
export function allowServerResponses(ses: Session): void {
  ses.webRequest.onHeadersReceived({ urls: ['http://*/*', 'https://*/*'] }, (details, callback) => {
    const headers = { ...details.responseHeaders }
    for (const name of Object.keys(headers)) {
      if (name.toLowerCase().startsWith('access-control-')) delete headers[name]
    }
    headers['Access-Control-Allow-Origin'] = ['*']
    // "*" never covers Authorization, so the headers the client sends are listed by name.
    headers['Access-Control-Allow-Headers'] = ['Authorization, Content-Type, X-Emby-Authorization, X-Emby-Token']
    headers['Access-Control-Allow-Methods'] = ['GET, POST, DELETE, OPTIONS']
    headers['Access-Control-Max-Age'] = ['600']
    callback({ responseHeaders: headers })
  })
}

/** Web addresses go to the system browser; the window itself never leaves the app. */
export function guardNavigation(contents: WebContents, isAppUrl: (url: string) => boolean): void {
  const openOutside = (url: string) => { if (isWebUrl(url)) void shell.openExternal(url) }
  contents.on('will-navigate', (event, url) => {
    if (isAppUrl(url)) return
    event.preventDefault()
    openOutside(url)
  })
  contents.on('will-attach-webview', event => event.preventDefault())
  // Trailer links come from the server's metadata, so only ever hand web addresses to the system (never file:, smb: or
  // other schemes a hostile server might put there).
  contents.setWindowOpenHandler(({ url }) => { openOutside(url); return { action: 'deny' } })
}

/** Electron has no right-click menu of its own: give text fields cut, copy and paste, and selected text copy. */
export function addEditingContextMenu(contents: WebContents): void {
  contents.on('context-menu', (_event, params) => {
    const items: MenuItemConstructorOptions[] = []
    if (params.isEditable) {
      items.push(
        { role: 'cut', enabled: params.editFlags.canCut },
        { role: 'copy', enabled: params.editFlags.canCopy },
        { role: 'paste', enabled: params.editFlags.canPaste },
        { type: 'separator' },
        { role: 'selectAll' }
      )
    } else if (params.selectionText.trim()) {
      items.push({ role: 'copy' })
    }
    if (items.length) Menu.buildFromTemplate(items).popup()
  })
}
