// Finding the server from whatever was typed, signing in, and the profiles shown on the sign-in screen.
import { HttpError, req } from './http'
import type { PublicInfo, PublicUser, Session } from './types'

interface Hit { server: string; info: PublicInfo }
export interface Found { server: string; info: PublicInfo | null; tried: string[] }

/**
 * Turns whatever was typed into the addresses worth trying, best guess first. Handles a missing
 * scheme or port, and a pasted web-UI link (…/web/index.html#!/home.html).
 */
export function addressCandidates(input: string): string[] {
  const raw = input.trim()
  if (!raw) return []
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw)
  let u: URL
  try { u = new URL(hasScheme ? raw : `http://${raw}`) } catch { return [] }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return []
  const base = u.pathname.replace(/\/web(\/.*)?$/i, '').replace(/\/+$/, '') // keep only Jellyfin's own base path
  if (hasScheme) return [`${u.protocol}//${u.host}${base}`]
  if (u.port) {
    const http = `http://${u.host}${base}`, https = `https://${u.host}${base}`
    return u.port === '443' || u.port === '8920' ? [https, http] : [http, https]
  }
  const host = u.hostname
  return [`https://${host}${base}`, `http://${host}:8096${base}`, `http://${host}${base}`, `https://${host}:8920${base}`]
}

/** Asks an address for Jellyfin's public info. fetch follows redirects (http→https, a canonical host), so res.url is where the server really lives. */
async function probe(base: string): Promise<Hit | null> {
  try {
    const res = await fetch(base + '/System/Info/Public', { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const info = (await res.json()) as PublicInfo
    if (!info || !(info.ServerName || info.Version || info.ProductName)) return null // some other web server
    return { server: res.url ? res.url.replace(/\/System\/Info\/Public(\?.*)?$/i, '') : base, info }
  } catch { return null }
}

/**
 * Tries the best guess first. The next address is only tried once the previous one has failed, or if it
 * hasn't answered within half a second, so a server that answers straight away is never poked at on other
 * ports. Earlier addresses win over later ones.
 */
export async function findServer(input: string): Promise<Found> {
  const tried = addressCandidates(input)
  if (!tried.length) throw new Error(`“${input.trim()}” doesn't look like a server address. Try something like 192.168.1.10:8096 or https://jellyfin.example.com`)
  const hit = await new Promise<Hit | null>(resolve => {
    const results: (Hit | null | undefined)[] = tried.map(() => undefined)
    const started = tried.map(() => false)
    const settle = () => {
      for (const r of results) {
        if (r === undefined) return // a better-ranked address hasn't finished (or started) yet
        if (r) return resolve(r)
      }
      resolve(null)
    }
    const start = (i: number) => {
      if (i >= tried.length || started[i]) return
      started[i] = true
      const slow = setTimeout(() => start(i + 1), 500)
      probe(tried[i]).then(r => { clearTimeout(slow); results[i] = r; settle(); if (!r) start(i + 1) })
    }
    start(0)
  })
  return { server: hit?.server ?? tried[0], info: hit?.info ?? null, tried }
}

/** What to tell the user when signing in failed, in plain words. */
export function explainSignInFailure(e: unknown, f: Found): string {
  const where = `${f.server}${f.info?.Version ? `, Jellyfin ${f.info.Version}` : ''}`
  if (e instanceof HttpError) {
    const said = e.detail ? ` The server said: “${e.detail}”.` : ''
    if (e.status === 401) return `Wrong username or password.${e.detail && !/password|credential|invalid/i.test(e.detail) ? said : ''}`
    if (/plain http request was sent to https port/i.test(e.detail))
      return `That port speaks HTTPS, not plain HTTP. Try ${f.server.replace(/^http:/i, 'https:')}.`
    if (/request\.(App|AppVersion|DeviceId|DeviceName)/i.test(e.detail))
      return `The server couldn't read this app's identification (the Authorization header).${said} If Jellyfin sits behind a proxy, make sure the proxy passes that header through. (${where})`
    if (!f.info) return `That address answered, but not like Jellyfin does (${e.status} ${e.statusText}).${said} Check the address, and any proxy or sub-path in front of Jellyfin. (${f.server})`
    if (e.status === 400) return `The server refused the sign-in request (400 Bad Request).${said} (${where})`
    if (e.status === 403) return `Access denied (403).${said} The server, or a proxy in front of it, blocked the sign-in. (${where})`
    if (e.status === 404) return `Jellyfin didn't find the sign-in address (404). If it lives under a sub-path such as example.com/jellyfin, include that in the address. (${where})`
    return `Sign-in failed (${e.status} ${e.statusText}).${said} (${where})`
  }
  return `Couldn't find a Jellyfin server. Tried ${f.tried.join(', ')}. Check the address, that the server is running, and that this computer can reach it. HTTPS with a self-signed certificate isn't supported yet.`
}

export async function login(serverInput: string, user: string, pw: string): Promise<Session> {
  const found = await findServer(serverInput)
  try {
    const r = await req<{ AccessToken: string; User: { Id: string; Name: string; PrimaryImageTag?: string } }>(
      { server: found.server }, '/Users/AuthenticateByName',
      { method: 'POST', body: JSON.stringify({ Username: user, Pw: pw }) }
    )
    return { server: found.server, token: r.AccessToken, userId: r.User.Id, userName: r.User.Name, avatarTag: r.User.PrimaryImageTag }
  } catch (e) {
    throw new Error(explainSignInFailure(e, found), { cause: e })
  }
}

/** Profiles that can be picked on the sign-in screen (users the admin hasn't hidden). Needs no sign-in. */
export async function publicUsers(server: string): Promise<PublicUser[]> {
  try {
    const res = await fetch(server + '/Users/Public', { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return []
    const list = await res.json()
    return Array.isArray(list) ? list.filter((u: PublicUser) => u && u.Id && u.Name) : []
  } catch { return [] }
}

export const publicUserImage = (server: string, u: PublicUser) =>
  u.PrimaryImageTag ? `${server}/Users/${u.Id}/Images/Primary?maxWidth=160&tag=${encodeURIComponent(u.PrimaryImageTag)}` : ''
