import type { Session } from './types'

const SESSION_KEY = 'jellyflix.session'
const DEVICE_KEY = 'jellyflix.deviceId'
const LAST_SERVER_KEY = 'jellyflix.lastServer'

// Injected from package.json at build time (see electron.vite.config.ts and vitest.config.ts).
declare const __APP_VERSION__: string
export const APP_VERSION = __APP_VERSION__

let fallbackId = ''

/** A random id for this installation, created once. Jellyfin lists it as the device. */
export function deviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, id) }
    return id
  } catch {
    // Storage is unavailable: this run gets an id of its own instead of failing every request.
    fallbackId ||= crypto.randomUUID()
    return fallbackId
  }
}

export function loadSession(): Session | null {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') } catch { return null }
}

export function saveSession(s: Session | null) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s))
    else localStorage.removeItem(SESSION_KEY)
  } catch { /* storage unavailable: the session just won't survive a restart */ }
}

/** The server last signed in to. Kept after signing out so the sign-in screen can offer that server's profiles. */
export function lastServer(): string {
  try { return localStorage.getItem(LAST_SERVER_KEY) ?? '' } catch { return '' }
}

export function rememberServer(server: string) {
  try { localStorage.setItem(LAST_SERVER_KEY, server) } catch { /* storage unavailable */ }
}
