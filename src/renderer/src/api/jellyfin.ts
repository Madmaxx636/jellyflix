import { markFetched } from '../userdata'

export interface Session { server: string; token: string; userId: string; userName: string; avatarTag?: string }

export interface Person { Name: string; Id: string; Role?: string; Type?: string; PrimaryImageTag?: string }

export interface MediaStream {
  Index: number
  Type: string // Video | Audio | Subtitle
  Codec?: string
  Language?: string
  DisplayTitle?: string
  Title?: string
  IsDefault?: boolean
  IsForced?: boolean
  IsExternal?: boolean
  IsTextSubtitleStream?: boolean
  Channels?: number
}

export interface MediaSource {
  Id: string
  RunTimeTicks?: number
  Container?: string
  MediaStreams?: MediaStream[]
  DefaultAudioStreamIndex?: number
  DefaultSubtitleStreamIndex?: number
}

export interface Item {
  Id: string
  Name: string
  Type: string
  Overview?: string
  ProductionYear?: number
  OfficialRating?: string
  RunTimeTicks?: number
  CommunityRating?: number
  Genres?: string[]
  Studios?: { Name: string; Id?: string }[]
  Taglines?: string[]
  People?: Person[]
  RemoteTrailers?: { Url: string; Name?: string }[]
  MediaSources?: MediaSource[]
  DateCreated?: string
  PremiereDate?: string
  ChildCount?: number
  SeriesId?: string
  SeriesName?: string
  ParentIndexNumber?: number
  IndexNumber?: number
  ImageTags?: { Primary?: string; Thumb?: string }
  ParentBackdropItemId?: string
  ParentBackdropImageTags?: string[]
  BackdropImageTags?: string[]
  UserData?: { PlaybackPositionTicks?: number; PlayedPercentage?: number; Played?: boolean; IsFavorite?: boolean }
}

/** A library ("view"): Movies, Shows, Collections… */
export interface View { Id: string; Name: string; CollectionType?: string; Type?: string; ImageTags?: { Primary?: string } }

export interface Recommendation { RecommendationType: string; BaselineItemName?: string; CategoryId?: string; Items: Item[] }

/** A stretch of a video the player can skip (intro, recap, credits…), in seconds. */
export interface Segment { type: string; start: number; end: number }

export interface Prepared { playSessionId: string; source: MediaSource }

export interface PublicUser { Id: string; Name: string; PrimaryImageTag?: string }

export interface PublicInfo { ServerName?: string; Version?: string; ProductName?: string }

export interface Query {
  parentId?: string
  types?: string[]
  genres?: string[]
  filters?: ('IsFavorite' | 'IsUnplayed' | 'IsPlayed')[]
  sortBy?: string
  sortOrder?: 'Ascending' | 'Descending'
  start?: number
  limit?: number
  search?: string
  personId?: string
  recursive?: boolean
}
export interface Page { items: Item[]; total: number }

const KEY = 'jellyflix.session'
const DEVICE_KEY = 'jellyflix.deviceId'
export const APP_VERSION = '0.1.0'

function deviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(DEVICE_KEY, id) }
  return id
}

export const loadSession = (): Session | null => {
  try { return JSON.parse(localStorage.getItem(KEY) ?? 'null') } catch { return null }
}
export const saveSession = (s: Session | null) =>
  s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY)

/**
 * Jellyfin's standard client identification, sent as the Authorization header. Servers from 12.0 on
 * have legacy authorization switched off by default: they ignore the older X-Emby-Authorization /
 * X-Emby-Token headers and the api_key parameter, can't read the client's name, and answer the
 * sign-in request with "400 Bad Request". Older servers read this header too.
 */
const authHeader = (token?: string) => {
  const q = (v: string) => `"${encodeURIComponent(v)}"`
  return `MediaBrowser Client=${q('Jellyflix')}, Device=${q('Desktop')}, DeviceId=${q(deviceId())}, Version=${q(APP_VERSION)}` +
    (token ? `, Token=${q(token)}` : '')
}

// ---------- errors ----------

export class HttpError extends Error {
  constructor(readonly status: number, readonly statusText: string, readonly detail: string) {
    super(`${status} ${statusText}`.trim() + (detail ? `: ${detail}` : ''))
  }
}

/** A short, readable reason from an error response: Jellyfin's text or JSON, or a proxy's HTML page. */
function reasonFrom(body: string): string {
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

async function req<T>(s: { server: string; token?: string }, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(s.server + path, {
    signal: AbortSignal.timeout(30_000),
    ...init,
    headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), Authorization: authHeader(s.token), ...init.headers }
  })
  if (!res.ok) throw new HttpError(res.status, res.statusText, reasonFrom(await res.text().catch(() => '')))
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

// ---------- finding the server ----------

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

function explainSignInFailure(e: unknown, f: Found): string {
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
    throw new Error(explainSignInFailure(e, found))
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
  u.PrimaryImageTag ? `${server}/Users/${u.Id}/Images/Primary?maxWidth=160&tag=${u.PrimaryImageTag}` : ''

// ---------- library calls ----------

const FIELDS = 'Overview,Genres,ProductionYear,OfficialRating,CommunityRating,RunTimeTicks'
type ListOf<T> = { Items: T[]; TotalRecordCount?: number }
type List = ListOf<Item>

type Attempt = string | [string, RequestInit]

/**
 * Some routes moved: the current ones are /UserItems/Resume, /Items/Latest, /Items/{id}?userId=,
 * /UserViews and /UserFavoriteItems/{id}, while the older /Users/{id}/... spellings are deprecated.
 * Try the current one first and fall back when a server doesn't know it (404/405), remembering which
 * spelling worked for that server.
 */
const worked = new Map<string, number>()
async function firstThatExists<T>(s: Session, name: string, attempts: Attempt[]): Promise<T> {
  const key = `${s.server}|${name}`
  const order = [...new Set([worked.get(key) ?? 0, ...attempts.keys()])]
  let last: unknown
  for (const i of order) {
    const a = attempts[i]
    const [path, init] = typeof a === 'string' ? [a, undefined] : a
    try { const r = await req<T>(s, path, init); worked.set(key, i); return r } catch (e) {
      last = e
      if (!(e instanceof HttpError && (e.status === 404 || e.status === 405))) throw e
    }
  }
  throw last
}

function itemsQuery(s: Session, q: Query): string {
  const p = new URLSearchParams({ userId: s.userId, Fields: FIELDS, EnableTotalRecordCount: 'true' })
  if (q.recursive !== false) p.set('Recursive', 'true')
  if (q.parentId) p.set('ParentId', q.parentId)
  if (q.types?.length) p.set('IncludeItemTypes', q.types.join(','))
  if (q.genres?.length) p.set('Genres', q.genres.join('|'))
  if (q.filters?.length) p.set('Filters', q.filters.join(','))
  if (q.sortBy) { p.set('SortBy', q.sortBy); p.set('SortOrder', q.sortOrder ?? 'Ascending') }
  if (q.start) p.set('StartIndex', String(q.start))
  if (q.limit) p.set('Limit', String(q.limit))
  if (q.search) p.set('SearchTerm', q.search)
  if (q.personId) p.set('PersonIds', q.personId)
  return p.toString()
}

/** Stamp every title in a response with when it was asked for (see userdata.ts). */
function stamp(v: unknown, t0: number) {
  if (Array.isArray(v)) v.forEach(x => stamp(x, t0))
  else if (v && typeof v === 'object') {
    const o = v as { Items?: unknown; items?: unknown; Id?: unknown }
    const list = Array.isArray(o.Items) ? o.Items : Array.isArray(o.items) ? o.items : null
    if (list) markFetched(list as Item[], t0)
    else if (typeof o.Id === 'string') markFetched([v as Item], t0)
  }
}
const tracked = async <T,>(p: Promise<T>): Promise<T> => { const t0 = Date.now(); const r = await p; stamp(r, t0); return r }

export const api = (s: Session) => {
  const image = (id: string, tag: string | undefined, w: number, type = 'Primary') =>
    `${s.server}/Items/${id}/Images/${type}?maxWidth=${w}${tag ? `&tag=${tag}` : ''}`

  const flag = (kind: 'Favorite' | 'Played') => (id: string, on: boolean) => {
    const method = on ? 'POST' : 'DELETE'
    return firstThatExists<unknown>(s, `${kind}-${method}`, [
      [kind === 'Favorite' ? `/UserFavoriteItems/${id}?userId=${s.userId}` : `/UserPlayedItems/${id}?userId=${s.userId}`, { method }],
      [`/Users/${s.userId}/${kind === 'Favorite' ? 'FavoriteItems' : 'PlayedItems'}/${id}`, { method }]
    ])
  }

  const raw = {
    // ----- home rows -----
    resume: () => firstThatExists<List>(s, 'resume', [
      `/UserItems/Resume?userId=${s.userId}&Limit=20&MediaTypes=Video&Fields=${FIELDS}`,
      `/Users/${s.userId}/Items/Resume?Limit=20&MediaTypes=Video&Fields=${FIELDS}`
    ]).then(r => r.Items),
    nextUp: () => req<List>(s, `/Shows/NextUp?UserId=${s.userId}&Limit=20&Fields=${FIELDS}`).then(r => r.Items),
    latest: (type: 'Movie' | 'Series') => firstThatExists<Item[]>(s, 'latest', [
      `/Items/Latest?userId=${s.userId}&Limit=20&IncludeItemTypes=${type}&Fields=${FIELDS}`,
      `/Users/${s.userId}/Items/Latest?Limit=20&IncludeItemTypes=${type}&Fields=${FIELDS}`
    ]),
    recommendations: () =>
      req<Recommendation[]>(s, `/Movies/Recommendations?userId=${s.userId}&categoryLimit=3&itemLimit=14&Fields=${FIELDS}`).catch(() => [] as Recommendation[]),

    // ----- browsing -----
    items: async (q: Query): Promise<Page> => {
      const r = await req<List>(s, `/Items?${itemsQuery(s, q)}`)
      return { items: r.Items, total: r.TotalRecordCount ?? r.Items.length }
    },
    views: () => firstThatExists<ListOf<View>>(s, 'views', [`/UserViews?userId=${s.userId}`, `/Users/${s.userId}/Views`]).then(r => r.Items),
    genres: (opts: { parentId?: string; types?: string[] } = {}) => {
      const p = new URLSearchParams({ userId: s.userId, SortBy: 'SortName', SortOrder: 'Ascending', IncludeItemTypes: (opts.types ?? ['Movie', 'Series']).join(',') })
      if (opts.parentId) p.set('ParentId', opts.parentId)
      return req<ListOf<{ Name: string }>>(s, `/Genres?${p}`).then(r => r.Items.map(g => g.Name))
    },
    byGenre: (genre: string) =>
      req<List>(s, `/Items?${itemsQuery(s, { types: ['Movie', 'Series'], genres: [genre], sortBy: 'Random', limit: 20 })}`).then(r => r.Items),
    search: (q: string, types: string[] = ['Movie', 'Series']) =>
      req<List>(s, `/Items?${itemsQuery(s, { types, search: q, limit: 60 })}`).then(r => r.Items),
    searchPeople: (q: string) =>
      req<List>(s, `/Items?${itemsQuery(s, { types: ['Person'], search: q, limit: 24 })}`).then(r => r.Items).catch(() => [] as Item[]),

    // ----- one title -----
    item: (id: string) => firstThatExists<Item>(s, 'item', [`/Items/${id}?userId=${s.userId}`, `/Users/${s.userId}/Items/${id}`]),
    episodes: (seriesId: string) =>
      req<List>(s, `/Shows/${seriesId}/Episodes?UserId=${s.userId}&Fields=Overview,RunTimeTicks`).then(r => r.Items),
    similar: (id: string) => req<List>(s, `/Items/${id}/Similar?UserId=${s.userId}&Limit=12`).then(r => r.Items),
    /** Trailers and behind-the-scenes clips stored next to the title. */
    extras: async (id: string): Promise<Item[]> => {
      const [features, trailers] = await Promise.all([
        req<Item[]>(s, `/Items/${id}/SpecialFeatures?userId=${s.userId}`).catch(() => [] as Item[]),
        req<Item[]>(s, `/Items/${id}/LocalTrailers?userId=${s.userId}`).catch(() => [] as Item[])
      ])
      return [...trailers, ...features]
    },
    /** What to play for a show: the next unwatched episode, else the first. */
    nextEpisode: async (seriesId: string): Promise<Item | null> => {
      try {
        const r = await req<List>(s, `/Shows/NextUp?UserId=${s.userId}&SeriesId=${seriesId}&Limit=1&Fields=${FIELDS}`)
        if (r.Items[0]) return r.Items[0]
      } catch { /* fall through to the episode list */ }
      const eps = await req<List>(s, `/Shows/${seriesId}/Episodes?UserId=${s.userId}&Fields=Overview`).then(r => r.Items).catch(() => [] as Item[])
      return eps.find(e => !e.UserData?.Played) ?? eps[0] ?? null
    },

    // ----- My List and watched -----
    setFavorite: flag('Favorite'),
    setPlayed: flag('Played'),

    // ----- images -----
    image,
    poster: (it: Item, w = 400) => {
      // Episode stills are 16:9, so on tall cards use the show's own poster instead.
      if (it.Type === 'Episode' && it.SeriesId) return `${s.server}/Items/${it.SeriesId}/Images/Primary?maxWidth=${w}`
      return it.ImageTags?.Primary ? image(it.Id, it.ImageTags.Primary, w) : ''
    },
    /** Wide 16:9 art for landscape tiles: Thumb, else Backdrop, else Primary. */
    thumb: (it: Item, w = 600) => {
      if (it.ImageTags?.Thumb) return image(it.Id, it.ImageTags.Thumb, w, 'Thumb')
      if (it.BackdropImageTags?.[0]) return image(it.Id, it.BackdropImageTags[0], w, 'Backdrop')
      if (it.ParentBackdropItemId && it.ParentBackdropImageTags?.[0]) return image(it.ParentBackdropItemId, it.ParentBackdropImageTags[0], w, 'Backdrop')
      return it.ImageTags?.Primary ? image(it.Id, it.ImageTags.Primary, w) : ''
    },
    backdrop: (it: Item, w = 1920) => {
      if (it.BackdropImageTags?.[0]) return image(it.Id, it.BackdropImageTags[0], w, 'Backdrop')
      if (it.SeriesId) return `${s.server}/Items/${it.SeriesId}/Images/Backdrop?maxWidth=${w}`
      return ''
    },
    personImage: (p: Person, w = 240) => (p.PrimaryImageTag ? image(p.Id, p.PrimaryImageTag, w) : ''),
    avatar: () => (s.avatarTag ? `${s.server}/Users/${s.userId}/Images/Primary?maxWidth=96&tag=${s.avatarTag}` : ''),

    // ----- playback -----
    segments: async (id: string): Promise<Segment[]> => {
      try {
        const r = await req<ListOf<{ Type: string | number; StartTicks: number; EndTicks: number }>>(s, `/MediaSegments/${id}`)
        return r.Items.map(x => ({ type: String(x.Type), start: x.StartTicks / 1e7, end: x.EndTicks / 1e7 }))
      } catch { return [] }
    },
    prepare: async (id: string): Promise<Prepared> => {
      const info = await req<{ PlaySessionId: string; MediaSources: MediaSource[] }>(
        s, `/Items/${id}/PlaybackInfo?UserId=${s.userId}`, { method: 'POST', body: JSON.stringify({}) })
      return { playSessionId: info.PlaySessionId, source: info.MediaSources[0] }
    },
    /**
     * The HLS stream. The video element can't send headers, so the token goes in the URL as ApiKey (12.x
     * ignores the old api_key spelling). Choosing an audio track or a quality asks the server to re-encode.
     */
    hlsUrl: (id: string, prep: Prepared, o: { audio?: number; burnSubtitle?: number; bitrate?: number } = {}) => {
      const p = new URLSearchParams({
        MediaSourceId: prep.source.Id, PlaySessionId: prep.playSessionId, ApiKey: s.token, DeviceId: deviceId(),
        VideoCodec: 'h264', AudioCodec: 'aac,mp3', TranscodingMaxAudioChannels: '2', SegmentContainer: 'ts'
      })
      if (o.audio != null) p.set('AudioStreamIndex', String(o.audio))
      if (o.burnSubtitle != null) { p.set('SubtitleStreamIndex', String(o.burnSubtitle)); p.set('SubtitleMethod', 'Encode') }
      if (o.bitrate) { p.set('VideoBitRate', String(o.bitrate)); p.set('MaxStreamingBitrate', String(o.bitrate + 192_000)) }
      return `${s.server}/Videos/${id}/master.m3u8?${p}`
    },
    /** Text subtitles as WebVTT, which the video element can show on its own. */
    subtitleUrl: (id: string, mediaSourceId: string, index: number) =>
      `${s.server}/Videos/${id}/${mediaSourceId}/Subtitles/${index}/0/Stream.vtt?ApiKey=${s.token}`,
    report: (kind: 'Playing' | 'Progress' | 'Stopped', body: object) =>
      req<void>(s, `/Sessions/Playing${kind === 'Playing' ? '' : '/' + kind}`, { method: 'POST', body: JSON.stringify(body) }).catch(() => {}),

    // ----- about -----
    publicInfo: () => fetch(`${s.server}/System/Info/Public`, { signal: AbortSignal.timeout(8000) }).then(r => r.json() as Promise<PublicInfo>)
  }

  // Anything that returns titles is stamped with when it was asked for, so a My List or watched change made later
  // in this session is applied to older copies on screen but never to fresher data from the server.
  const stamped = ['resume', 'nextUp', 'latest', 'recommendations', 'items', 'byGenre', 'search', 'searchPeople', 'item', 'episodes', 'similar', 'extras', 'nextEpisode'] as const
  for (const k of stamped) {
    const f = raw[k] as (...a: never[]) => Promise<unknown>
    ;(raw as Record<string, unknown>)[k] = (...a: never[]) => tracked(f(...a))
  }
  return raw
}

export type Api = ReturnType<typeof api>
export const ticksToMin = (t?: number) => (t ? Math.round(t / 600_000_000) : 0)
