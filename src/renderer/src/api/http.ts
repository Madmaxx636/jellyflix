import { APP_VERSION, deviceId } from './session'

/**
 * Jellyfin's standard client identification, sent as the Authorization header. Servers from 12.0 on
 * have legacy authorization switched off by default: they ignore the older X-Emby-Authorization /
 * X-Emby-Token headers and the api_key parameter, can't read the client's name, and answer the
 * sign-in request with "400 Bad Request". Older servers read this header too.
 */
export function authHeader(token?: string): string {
  const q = (v: string) => `"${encodeURIComponent(v)}"`
  return `MediaBrowser Client=${q('Jellyflix')}, Device=${q('Desktop')}, DeviceId=${q(deviceId())}, Version=${q(APP_VERSION)}` +
    (token ? `, Token=${q(token)}` : '')
}

export class HttpError extends Error {
  constructor(readonly status: number, readonly statusText: string, readonly detail: string) {
    super(`${status} ${statusText}`.trim() + (detail ? `: ${detail}` : ''))
  }
}

/** A short, readable reason from an error response: Jellyfin's text or JSON, or a proxy's HTML page. */
export function reasonFrom(body: string): string {
  const t = body.trim()
  if (!t) return ''
  try {
    const j = JSON.parse(t)
    if (j && typeof j === 'object') {
      const parts: string[] = [j.detail, j.title, j.message, j.Message, j.error].filter((x): x is string => typeof x === 'string' && !!x)
      if (j.errors && typeof j.errors === 'object') parts.push(...Object.values(j.errors).flat().map(String))
      if (parts.length) return parts.join(' — ').slice(0, 240)
    }
  } catch { /* not JSON */ }
  if (/^\s*<(!doctype|html)/i.test(t)) {
    const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(t)?.[1]?.trim()
    if (title) return title.slice(0, 240)
  }
  return t.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240)
}

// A server that answers 401 to a request carrying our token is telling us the session is over: the token was revoked, the
// user was removed, the server was reset. The app registers one handler that signs out, so every page doesn't have to.
let onUnauthorized: (() => void) | null = null
export const setUnauthorizedHandler = (fn: (() => void) | null) => { onUnauthorized = fn }

const TIMEOUT_MS = 30_000

/** Where to send a request, and the token to send it with (none while signing in). */
export interface Target { server: string; token?: string }

export async function req<T>(s: Target, path: string, init: RequestInit = {}, signal?: AbortSignal): Promise<T> {
  const timeout = AbortSignal.timeout(TIMEOUT_MS)
  const res = await fetch(s.server + path, {
    ...init,
    signal: signal ? AbortSignal.any([timeout, signal]) : timeout,
    headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), Authorization: authHeader(s.token), ...init.headers }
  })
  if (!res.ok) {
    const failure = new HttpError(res.status, res.statusText, reasonFrom(await res.text().catch(() => '')))
    if (res.status === 401 && s.token) onUnauthorized?.()
    throw failure
  }
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}
