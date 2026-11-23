// The calls the app makes once it is signed in: libraries, titles, My List, playback and image addresses.
import { markFetched } from '../userdata'
import { HttpError, req } from './http'
import { deviceId } from './session'
import { planPlayback, playbackRequest } from './playback'
import type { Item, MediaSource, Page, Person, Playback, PlaybackInfoResponse, PlaybackOptions, Prepared, PublicInfo, Query, Recommendation, Segment, Session, View } from './types'

const FIELDS = 'Overview,Genres,ProductionYear,OfficialRating,CommunityRating,RunTimeTicks'
type ListOf<T> = { Items: T[]; TotalRecordCount?: number }
type List = ListOf<Item>
type Attempt = string | [string, RequestInit]

/** Makes an id safe to put in a path. They are GUIDs, but they come from the server. */
const seg = encodeURIComponent

/**
 * Some routes moved: the current ones are /UserItems/Resume, /Items/Latest, /Items/{id}?userId=,
 * /UserViews and /UserFavoriteItems/{id}, while the older /Users/{id}/... spellings are deprecated.
 * Try the current one first and fall back when a server doesn't know it (404/405), remembering which
 * spelling worked for that server.
 */
const worked = new Map<string, number>()
async function firstThatExists<T>(s: Session, name: string, attempts: Attempt[], signal?: AbortSignal): Promise<T> {
  const key = `${s.server}|${name}`
  const order = [...new Set([worked.get(key) ?? 0, ...attempts.keys()])]
  let last: unknown
  for (const i of order) {
    const a = attempts[i]
    const [path, init] = typeof a === 'string' ? [a, undefined] : a
    try {
      // eslint-disable-next-line no-await-in-loop -- the spellings are tried one after another on purpose
      const r = await req<T>(s, path, init, signal)
      worked.set(key, i)
      return r
    } catch (e) {
      last = e
      if (!(e instanceof HttpError && (e.status === 404 || e.status === 405))) throw e
    }
  }
  throw last
}

/** The query string for /Items. */
export function itemsQuery(s: Pick<Session, 'userId'>, q: Query): string {
  // A server can be set to "group movies into collections", which swaps each movie for its collection in plain lists and
  // turns a Movies page into collection folders. Say no: collections have their own pages here.
  const p = new URLSearchParams({ userId: s.userId, Fields: FIELDS, EnableTotalRecordCount: 'true', CollapseBoxSetItems: 'false', Recursive: 'true' })
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
async function tracked<T>(p: Promise<T>): Promise<T> {
  const t0 = Date.now()
  const r = await p
  stamp(r, t0)
  return r
}

function build(s: Session, signal?: AbortSignal) {
  const get = <T>(path: string, init?: RequestInit) => req<T>(s, path, init, signal)
  const first = <T>(name: string, attempts: Attempt[]) => firstThatExists<T>(s, name, attempts, signal)
  const image = (id: string, tag: string | undefined, w: number, type = 'Primary') =>
    `${s.server}/Items/${seg(id)}/Images/${type}?maxWidth=${w}${tag ? `&tag=${encodeURIComponent(tag)}` : ''}`

  const flag = (kind: 'Favorite' | 'Played') => (id: string, on: boolean) => {
    const method = on ? 'POST' : 'DELETE'
    return first<unknown>(`${kind}-${method}`, [
      [kind === 'Favorite' ? `/UserFavoriteItems/${seg(id)}?userId=${s.userId}` : `/UserPlayedItems/${seg(id)}?userId=${s.userId}`, { method }],
      [`/Users/${s.userId}/${kind === 'Favorite' ? 'FavoriteItems' : 'PlayedItems'}/${seg(id)}`, { method }]
    ])
  }

  const raw = {
    // ----- home rows -----
    resume: () => first<List>('resume', [
      `/UserItems/Resume?userId=${s.userId}&Limit=20&MediaTypes=Video&Fields=${FIELDS}`,
      `/Users/${s.userId}/Items/Resume?Limit=20&MediaTypes=Video&Fields=${FIELDS}`
    ]).then(r => r.Items),
    nextUp: () => get<List>(`/Shows/NextUp?UserId=${s.userId}&Limit=20&Fields=${FIELDS}`).then(r => r.Items),
    latest: (type: 'Movie' | 'Series') => first<Item[]>('latest', [
      `/Items/Latest?userId=${s.userId}&Limit=20&IncludeItemTypes=${type}&GroupItems=false&Fields=${FIELDS}`,
      `/Users/${s.userId}/Items/Latest?Limit=20&IncludeItemTypes=${type}&GroupItems=false&Fields=${FIELDS}`
    ]),
    recommendations: () =>
      get<Recommendation[]>(`/Movies/Recommendations?userId=${s.userId}&categoryLimit=3&itemLimit=14&Fields=${FIELDS}`).catch(() => [] as Recommendation[]),

    // ----- browsing -----
    items: async (q: Query): Promise<Page> => {
      const r = await get<List>(`/Items?${itemsQuery(s, q)}`)
      return { items: r.Items, total: r.TotalRecordCount ?? r.Items.length }
    },
    views: () => first<ListOf<View>>('views', [`/UserViews?userId=${s.userId}`, `/Users/${s.userId}/Views`]).then(r => r.Items),
    genres: (opts: { parentId?: string; types?: string[] } = {}) => {
      const p = new URLSearchParams({ userId: s.userId, SortBy: 'SortName', SortOrder: 'Ascending', IncludeItemTypes: (opts.types ?? ['Movie', 'Series']).join(',') })
      if (opts.parentId) p.set('ParentId', opts.parentId)
      return get<ListOf<{ Name: string }>>(`/Genres?${p}`).then(r => r.Items.map(g => g.Name))
    },
    byGenre: (genre: string) =>
      get<List>(`/Items?${itemsQuery(s, { types: ['Movie', 'Series'], genres: [genre], sortBy: 'Random', limit: 20 })}`).then(r => r.Items),
    search: (q: string, types: string[] = ['Movie', 'Series']) =>
      get<List>(`/Items?${itemsQuery(s, { types, search: q, limit: 60 })}`).then(r => r.Items),
    searchPeople: (q: string) =>
      get<List>(`/Items?${itemsQuery(s, { types: ['Person'], search: q, limit: 24 })}`).then(r => r.Items),

    // ----- one title -----
    item: (id: string) => first<Item>('item', [`/Items/${seg(id)}?userId=${s.userId}`, `/Users/${s.userId}/Items/${seg(id)}`]),
    episodes: (seriesId: string) =>
      get<List>(`/Shows/${seg(seriesId)}/Episodes?UserId=${s.userId}&Fields=Overview,RunTimeTicks`).then(r => r.Items),
    similar: (id: string) => get<List>(`/Items/${seg(id)}/Similar?UserId=${s.userId}&Limit=12`).then(r => r.Items),
    /** Trailers and behind-the-scenes clips stored next to the title. */
    extras: async (id: string): Promise<Item[]> => {
      const [features, trailers] = await Promise.all([
        get<Item[]>(`/Items/${seg(id)}/SpecialFeatures?userId=${s.userId}`).catch(() => [] as Item[]),
        get<Item[]>(`/Items/${seg(id)}/LocalTrailers?userId=${s.userId}`).catch(() => [] as Item[])
      ])
      return [...trailers, ...features]
    },
    /** What to play for a show: the next unwatched episode, else the first. */
    nextEpisode: async (seriesId: string): Promise<Item | null> => {
      try {
        const r = await get<List>(`/Shows/NextUp?UserId=${s.userId}&SeriesId=${seg(seriesId)}&Limit=1&Fields=${FIELDS}`)
        if (r.Items[0]) return r.Items[0]
      } catch { /* fall through to the episode list */ }
      const eps = await get<List>(`/Shows/${seg(seriesId)}/Episodes?UserId=${s.userId}&Fields=Overview`).then(r => r.Items).catch(() => [] as Item[])
      return eps.find(e => !e.UserData?.Played) ?? eps[0] ?? null
    },

    // ----- My List and watched -----
    setFavorite: flag('Favorite'),
    setPlayed: flag('Played'),

    // ----- images -----
    image,
    poster: (it: Item, w = 400) => {
      // Episode stills are 16:9, so on tall cards use the show's own poster instead.
      if (it.Type === 'Episode' && it.SeriesId) return `${s.server}/Items/${seg(it.SeriesId)}/Images/Primary?maxWidth=${w}`
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
      if (it.SeriesId) return `${s.server}/Items/${seg(it.SeriesId)}/Images/Backdrop?maxWidth=${w}`
      return ''
    },
    personImage: (p: Person, w = 240) => (p.PrimaryImageTag ? image(p.Id, p.PrimaryImageTag, w) : ''),
    avatar: () => (s.avatarTag ? `${s.server}/Users/${seg(s.userId)}/Images/Primary?maxWidth=96&tag=${encodeURIComponent(s.avatarTag)}` : ''),

    // ----- playback -----
    segments: async (id: string): Promise<Segment[]> => {
      try {
        const r = await get<ListOf<{ Type: string | number; StartTicks: number; EndTicks: number }>>(`/MediaSegments/${seg(id)}`)
        return r.Items.map(x => ({ type: String(x.Type), start: x.StartTicks / 1e7, end: x.EndTicks / 1e7 }))
      } catch { return [] }
    },
    prepare: async (id: string): Promise<Prepared> => {
      const info = await get<{ PlaySessionId: string; MediaSources: MediaSource[] }>(
        `/Items/${seg(id)}/PlaybackInfo?UserId=${s.userId}`, { method: 'POST', body: JSON.stringify({}) })
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
      return `${s.server}/Videos/${seg(id)}/master.m3u8?${p}`
    },
    /** Text subtitles as WebVTT, which the video element can show on its own. */
    /** One tile of seek-bar previews. */
    trickplayUrl: (id: string, mediaSourceId: string, width: number, tile: number) =>
      `${s.server}/Videos/${seg(id)}/Trickplay/${width}/${tile}.jpg?MediaSourceId=${encodeURIComponent(mediaSourceId)}&ApiKey=${encodeURIComponent(s.token)}`,
    subtitleUrl: (id: string, mediaSourceId: string, index: number) =>
      `${s.server}/Videos/${seg(id)}/${seg(mediaSourceId)}/Subtitles/${index}/0/Stream.vtt?ApiKey=${encodeURIComponent(s.token)}`,
    report: (kind: 'Playing' | 'Progress' | 'Stopped', body: object, init: RequestInit = {}) =>
      get<void>(`/Sessions/Playing${kind === 'Playing' ? '' : '/' + kind}`, { ...init, method: 'POST', body: JSON.stringify(body) }).catch(() => {}),

    // ----- about -----
    publicInfo: async (): Promise<PublicInfo> => {
      const timeout = AbortSignal.timeout(8000)
      const res = await fetch(`${s.server}/System/Info/Public`, { signal: signal ? AbortSignal.any([timeout, signal]) : timeout })
      if (!res.ok) throw new HttpError(res.status, res.statusText, '')
      return res.json()
    }
  }

  // Anything that returns titles is stamped with when it was asked for, so a My List or watched change made later
  // in this session is applied to older copies on screen but never to fresher data from the server.
  const stamped = ['resume', 'nextUp', 'latest', 'recommendations', 'items', 'byGenre', 'search', 'searchPeople', 'item', 'episodes', 'similar', 'extras', 'nextEpisode'] as const
  for (const k of stamped) {
    const f = raw[k] as (...a: never[]) => Promise<unknown>
    ;(raw as Record<string, unknown>)[k] = (...a: never[]) => tracked(f(...a))
  }
  /**
   * How to play a title: the file itself when this player can, otherwise the stream the server makes. An older server that
   * gives no stream address is asked for HLS the long way (see hlsUrl).
   */
  const playback = async (id: string, o: PlaybackOptions = {}): Promise<Playback> => {
    const info = await get<PlaybackInfoResponse>(`/Items/${seg(id)}/PlaybackInfo`, { method: 'POST', body: JSON.stringify(playbackRequest(s.userId, o)) })
    const plan = planPlayback({ server: s.server, token: s.token, deviceId: deviceId(), id }, info, o)
    if (plan) return plan
    const source = info.MediaSources?.[0]
    if (!source || !info.PlaySessionId) throw new Error('The server has nothing to play for this title.')
    const prep = { playSessionId: info.PlaySessionId, source }
    return { playSessionId: prep.playSessionId, source, url: raw.hlsUrl(id, prep, { audio: o.audio, burnSubtitle: o.subtitle, bitrate: o.bitrate }), kind: 'hls', method: 'Transcode', asked: o }
  }
  return { ...raw, playback }
}

export type Api = ReturnType<typeof build> & {
  /** The same client, but its requests stop when the signal is aborted (used to drop requests for a page you've left). */
  with(signal: AbortSignal): Api
}

export function createApi(s: Session, signal?: AbortSignal): Api {
  return { ...build(s, signal), with: sig => createApi(s, sig) }
}
