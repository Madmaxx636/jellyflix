export interface Session { server: string; token: string; userId: string; userName: string }

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
  SeriesId?: string
  SeriesName?: string
  ParentIndexNumber?: number
  IndexNumber?: number
  ImageTags?: { Primary?: string; Thumb?: string }
  ParentBackdropItemId?: string
  ParentBackdropImageTags?: string[]
  BackdropImageTags?: string[]
  UserData?: { PlaybackPositionTicks?: number; PlayedPercentage?: number; Played?: boolean }
}

const KEY = 'jellyflix.session'
const DEVICE_KEY = 'jellyflix.deviceId'

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

const authHeader = (token?: string) =>
  `MediaBrowser Client="Jellyflix", Device="Desktop", DeviceId="${deviceId()}", Version="0.1.0"` +
  (token ? `, Token="${token}"` : '')

export function normalizeServer(input: string): string {
  let s = input.trim().replace(/\/+$/, '')
  if (!/^https?:\/\//i.test(s)) s = 'http://' + s
  return s
}

async function req<T>(s: { server: string; token?: string }, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(s.server + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', 'X-Emby-Authorization': authHeader(s.token), ...init.headers }
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export async function login(serverInput: string, user: string, pw: string): Promise<Session> {
  const server = normalizeServer(serverInput)
  const r = await req<{ AccessToken: string; User: { Id: string; Name: string } }>(
    { server }, '/Users/AuthenticateByName',
    { method: 'POST', body: JSON.stringify({ Username: user, Pw: pw }) }
  )
  return { server, token: r.AccessToken, userId: r.User.Id, userName: r.User.Name }
}

const FIELDS = 'Overview,Genres,ProductionYear,OfficialRating,CommunityRating,RunTimeTicks'
type List = { Items: Item[] }

export const api = (s: Session) => ({
  resume: () => req<List>(s, `/Users/${s.userId}/Items/Resume?Limit=20&MediaTypes=Video&Fields=${FIELDS}`).then(r => r.Items),
  nextUp: () => req<List>(s, `/Shows/NextUp?UserId=${s.userId}&Limit=20&Fields=${FIELDS}`).then(r => r.Items),
  latest: (type: 'Movie' | 'Series') =>
    req<Item[]>(s, `/Users/${s.userId}/Items/Latest?Limit=20&IncludeItemTypes=${type}&Fields=${FIELDS}`),
  genres: () =>
    req<List>(s, `/Genres?UserId=${s.userId}&IncludeItemTypes=Movie,Series&SortBy=SortName`).then(r => r.Items.map(g => g.Name)),
  byGenre: (genre: string) =>
    req<List>(s, `/Users/${s.userId}/Items?Recursive=true&IncludeItemTypes=Movie,Series&Genres=${encodeURIComponent(genre)}&SortBy=Random&Limit=20&Fields=${FIELDS}`).then(r => r.Items),
  search: (q: string) =>
    req<List>(s, `/Users/${s.userId}/Items?Recursive=true&IncludeItemTypes=Movie,Series&SearchTerm=${encodeURIComponent(q)}&Limit=40&Fields=${FIELDS}`).then(r => r.Items),
  item: (id: string) => req<Item>(s, `/Users/${s.userId}/Items/${id}`),
  episodes: (seriesId: string) =>
    req<List>(s, `/Shows/${seriesId}/Episodes?UserId=${s.userId}&Fields=Overview`).then(r => r.Items),
  similar: (id: string) => req<List>(s, `/Items/${id}/Similar?UserId=${s.userId}&Limit=12`).then(r => r.Items),

  poster: (it: Item, w = 400) => {
    // Episode stills are 16:9, so on tall cards use the show's own poster instead.
    if (it.Type === 'Episode' && it.SeriesId) return `${s.server}/Items/${it.SeriesId}/Images/Primary?maxWidth=${w}`
    return it.ImageTags?.Primary ? `${s.server}/Items/${it.Id}/Images/Primary?maxWidth=${w}&tag=${it.ImageTags.Primary}` : ''
  },
  /** Wide 16:9 art for landscape tiles: Thumb, else Backdrop, else Primary. */
  thumb: (it: Item, w = 600) => {
    if (it.ImageTags?.Thumb) return `${s.server}/Items/${it.Id}/Images/Thumb?maxWidth=${w}&tag=${it.ImageTags.Thumb}`
    if (it.BackdropImageTags?.[0]) return `${s.server}/Items/${it.Id}/Images/Backdrop?maxWidth=${w}&tag=${it.BackdropImageTags[0]}`
    if (it.ParentBackdropItemId && it.ParentBackdropImageTags?.[0])
      return `${s.server}/Items/${it.ParentBackdropItemId}/Images/Backdrop?maxWidth=${w}&tag=${it.ParentBackdropImageTags[0]}`
    return it.ImageTags?.Primary ? `${s.server}/Items/${it.Id}/Images/Primary?maxWidth=${w}&tag=${it.ImageTags.Primary}` : ''
  },
  backdrop: (it: Item, w = 1920) => {
    if (it.BackdropImageTags?.[0]) return `${s.server}/Items/${it.Id}/Images/Backdrop?maxWidth=${w}&tag=${it.BackdropImageTags[0]}`
    if (it.SeriesId) return `${s.server}/Items/${it.SeriesId}/Images/Backdrop?maxWidth=${w}`
    return ''
  },

  async streamUrl(id: string): Promise<{ url: string; playSessionId: string; mediaSourceId: string }> {
    const info = await req<{ PlaySessionId: string; MediaSources: { Id: string }[] }>(
      s, `/Items/${id}/PlaybackInfo?UserId=${s.userId}`, { method: 'POST', body: JSON.stringify({}) })
    const ms = info.MediaSources[0].Id
    const p = new URLSearchParams({
      MediaSourceId: ms, PlaySessionId: info.PlaySessionId, api_key: s.token, DeviceId: deviceId(),
      VideoCodec: 'h264', AudioCodec: 'aac,mp3', TranscodingMaxAudioChannels: '2', SegmentContainer: 'ts'
    })
    return { url: `${s.server}/Videos/${id}/master.m3u8?${p}`, playSessionId: info.PlaySessionId, mediaSourceId: ms }
  },
  report: (kind: 'Playing' | 'Progress' | 'Stopped', body: object) =>
    req<void>(s, `/Sessions/Playing${kind === 'Playing' ? '' : '/' + kind}`, { method: 'POST', body: JSON.stringify(body) }).catch(() => {})
})

export type Api = ReturnType<typeof api>
export const ticksToMin = (t?: number) => (t ? Math.round(t / 600_000_000) : 0)
