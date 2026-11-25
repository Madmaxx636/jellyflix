// Mock Jellyfin server for UI tests. Made-up titles, generated placeholder art (SVG), one real HLS clip.
// Sends NO CORS headers unless MOCK_CORS=1, so the app's own CORS handling is what gets exercised.
// Favourites and watched flags are kept in memory, so toggling them in the app can be checked here.
import http from 'node:http'
import https from 'node:https'
import fs from 'node:fs'
import path from 'node:path'

const PORT = Number(process.env.PORT ?? 8096)
const SELF_CORS = process.env.MOCK_CORS === '1'
const TOKEN = 'tok-demo'
// normal      accepts the modern Authorization header and the legacy X-Emby-Authorization one
// modern      behaves like Jellyfin 12: ignores X-Emby-* headers and api_key, and the old /Users/{id}/... routes are gone
// legacy      an older server: only X-Emby-Authorization, none of the newer routes
// oldroutes   modern auth, but only the older /Users/{id}/... routes (a 10.8-era server)
// collapse    a user with "Group movies into collections" on: plain movie lists come back with each collection standing in
//             for the movies inside it, unless the request says CollapseBoxSetItems=false (or GroupItems=false for /Items/Latest)
// nginx400    a proxy answering plain HTTP on an HTTPS port
// notjellyfin a web server that is not Jellyfin
// redirect    301-redirects everything to http://127.0.0.1:$MOCK_REDIRECT_TO
const MODE = process.env.MOCK_MODE ?? 'normal'
const MEDIA = process.env.MOCK_MEDIA ?? ''
const SEC = 10_000_000

const ADJ = ['Silent', 'Crimson', 'Hollow', 'Northern', 'Paper', 'Electric', 'Gilded', 'Midnight', 'Wandering', 'Iron', 'Velvet', 'Last', 'Burning', 'Distant', 'Hidden', 'Broken']
const NOUN = ['Harbor', 'Orbit', 'Lantern', 'Kingdom', 'Signal', 'Garden', 'Reckoning', 'Machine', 'Frontier', 'Archive', 'Tide', 'Lighthouse', 'Meridian', 'Echo']
const KIND = ['Chronicles', 'Files', 'Diaries', 'Stories', 'Mysteries']
const GENRES = ['Action', 'Comedy', 'Crime', 'Drama', 'Family', 'Fantasy', 'Sci-Fi', 'Thriller']
const EPNAMES = ['Pilot', 'The Quiet Hour', 'Salt Road', 'Borrowed Time', 'What the River Keeps', 'Static', 'Homecoming', 'The Long Way Round', 'Ash and Ember', 'Open Water', 'Second Light', 'The Hollow Month']
const OVERVIEWS = [
  t => `When an old debt resurfaces, a retired courier is dragged into a conspiracy that stretches far beyond the harbor. ${t} is a slow-burning story about loyalty, loss, and the price of staying quiet.`,
  t => `Three strangers wake up in a town that is not on any map, with one rule: nobody leaves before sunrise. ${t} turns a small mystery into something much bigger, one night at a time.`,
  t => `A failing family bakery becomes the unlikely center of a city-wide feud. ${t} mixes warm humor with sharp observations about ambition, tradition, and second chances.`,
  t => `Decades after the signal first appeared, a young engineer finally decodes it. What she finds in ${t} changes how everyone understands the sky above them.`,
  t => `In a kingdom made of glass, a single crack could end everything. ${t} follows a reluctant heir who must learn to rule before the whole palace shatters.`
]
const PEOPLE = ['Ava Lindqvist', 'Marcus Bell', 'Priya Raman', 'Tomas Ortega', 'Hana Kobayashi', 'Daniel Okafor', 'Elise Moreau', 'Jonas Weber', 'Mei Tanaka', 'Samuel Reyes', 'Nora Haddad', 'Viktor Sokolov',
  'Lucia Ferrari', 'Owen Pritchard', 'Zainab Idris', 'Felix Andersson', 'Ingrid Solheim', 'Rafael Duarte', 'Chloe Bennett', 'Kenji Mori', 'Amara Nwosu', 'Leo Fontaine', 'Sana Qureshi', 'Henrik Berg']

const hash = s => [...String(s)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const day = 86_400_000

// ---------- data ----------
const people = PEOPLE.map((name, n) => ({ Id: `p${n + 1}`, Name: name, Type: 'Person', Overview: `${name} is a made-up performer, here only for testing.`, ImageTags: { Primary: 'p' } }))
const castFor = i => [
  ...[0, 1, 2, 3].map(k => { const p = people[(i * 3 + k * 5) % 24]; return { Name: p.Name, Id: p.Id, Role: `Character ${k + 1}`, Type: 'Actor', PrimaryImageTag: 'p' } }),
  (p => ({ Name: p.Name, Id: p.Id, Type: 'Director', PrimaryImageTag: 'p' }))(people[(i * 7 + 2) % 24])
]

const movies = Array.from({ length: 100 }, (_, i) => {
  const g1 = GENRES[i % 8], g2 = GENRES[(i * 3 + 1) % 8]
  const name = `${ADJ[i % 16]} ${NOUN[(i * 5 + 3) % 14]}`
  const year = 2008 + ((i * 5) % 17)
  return {
    Id: `m${i + 1}`, Name: name, Type: 'Movie', Overview: OVERVIEWS[i % 5](name), ProductionYear: year,
    OfficialRating: ['PG', 'PG-13', 'R', 'PG-13', 'G'][i % 5], RunTimeTicks: (88 + ((i * 13) % 60)) * 600_000_000,
    CommunityRating: +(5 + ((i * 7) % 45) / 10).toFixed(1), Genres: g1 === g2 ? [g1] : [g1, g2],
    DateCreated: new Date(Date.UTC(2026, 10, 18) - i * day * 1.7).toISOString(), PremiereDate: new Date(Date.UTC(year, (i * 5) % 12, 1 + (i % 27))).toISOString(),
    ImageTags: { Primary: 'p', Thumb: 't' }, BackdropImageTags: ['b'], UserData: {}, ord: i,
    ...(i % 7 === 0 ? { RemoteTrailers: [{ Url: `https://www.youtube.com/watch?v=mock${i}`, Name: 'Trailer' }] } : {}),
    ...(i % 3 === 0 ? { Taglines: ['Nothing stays buried.'] } : {})
  }
})

const series = Array.from({ length: 14 }, (_, i) => {
  const g1 = GENRES[(i * 5 + 2) % 8], g2 = GENRES[(i * 3 + 4) % 8]
  const name = `${NOUN[(i * 3 + 1) % 14]} ${KIND[i % 5]}`
  const year = 2012 + ((i * 3) % 13)
  return {
    Id: `s${i + 1}`, Name: name, Type: 'Series', Overview: OVERVIEWS[(i + 2) % 5](name), ProductionYear: year,
    OfficialRating: ['TV-14', 'TV-MA', 'TV-PG'][i % 3], CommunityRating: +(6 + ((i * 11) % 38) / 10).toFixed(1), Genres: g1 === g2 ? [g1] : [g1, g2],
    DateCreated: new Date(Date.UTC(2026, 10, 12) - i * day * 4).toISOString(), PremiereDate: new Date(Date.UTC(year, (i * 7) % 12, 5)).toISOString(),
    ImageTags: { Primary: 'p', Thumb: 't' }, BackdropImageTags: ['b'], UserData: {}, ord: 200 + i
  }
})

const boxsets = [[1, 2, 3, 4], [10, 11, 12, 13], [20, 21, 22]].map((ids, n) => ({
  Id: `b${n + 1}`, Name: `${NOUN[n * 4]} Collection`, Type: 'BoxSet', Overview: `A made-up collection of ${ids.length} titles.`, ProductionYear: 2020 + n,
  CommunityRating: 7 + n / 2, Genres: ['Action'], DateCreated: new Date(Date.UTC(2026, 9, 1) - n * day).toISOString(), PremiereDate: new Date(Date.UTC(2020 + n, 0, 1)).toISOString(),
  ImageTags: { Primary: 'p', Thumb: 't' }, BackdropImageTags: ['b'], UserData: {}, children: ids.map(k => `m${k}`), ord: 300 + n
}))

const views = [
  { Id: 'lib-movies', Name: 'Movies', CollectionType: 'movies', Type: 'CollectionFolder', ImageTags: {}, ord: 400 },
  { Id: 'lib-shows', Name: 'Shows', CollectionType: 'tvshows', Type: 'CollectionFolder', ImageTags: {}, ord: 401 },
  { Id: 'lib-collections', Name: 'Collections', CollectionType: 'boxsets', Type: 'CollectionFolder', ImageTags: { Primary: 'p' }, ord: 402 },
  { Id: 'lib-music', Name: 'Music', CollectionType: 'music', Type: 'CollectionFolder', ImageTags: {}, ord: 403 } // the app should hide this one
]

const episodes = []
series.forEach((s, si) => {
  const seasons = 2 + (si % 2)
  for (let sn = 1; sn <= seasons; sn++) {
    for (let en = 1; en <= 7; en++) {
      episodes.push({
        Id: `${s.Id}e${sn}x${en}`, Name: EPNAMES[(si * 5 + sn * 3 + en) % EPNAMES.length], Type: 'Episode', SeriesId: s.Id, SeriesName: s.Name,
        ParentIndexNumber: sn, IndexNumber: en, Overview: `Season ${sn}, episode ${en}. Old secrets surface and nobody is quite who they said they were.`,
        RunTimeTicks: 47 * 600_000_000, ImageTags: { Primary: 'p' }, ParentBackdropItemId: s.Id, ParentBackdropImageTags: ['b'],
        UserData: { Played: sn === 1 && en <= 3 }, ord: 500 + episodes.length
      })
    }
  }
})

const extraOf = (id, n) => ({ Id: `x-${id}-${n}`, Name: n === 1 ? 'Behind the Scenes' : 'Deleted Scene', Type: 'Video', RunTimeTicks: (4 + n) * 600_000_000, ImageTags: { Primary: 'p' }, UserData: {} })
const trailerOf = id => ({ Id: `x-${id}-t`, Name: 'Official Trailer', Type: 'Trailer', RunTimeTicks: 2 * 600_000_000, ImageTags: { Primary: 'p' }, UserData: {} })

const all = new Map([...movies, ...series, ...boxsets, ...views, ...episodes, ...people].map(x => [x.Id, x]))
const get = id => all.get(id) ?? (id.startsWith('x-') ? { Id: id, Name: 'Extra', Type: 'Video', ord: hash(id) % 500 } : undefined)
const ud = new Map() // id -> { IsFavorite, Played } overrides made through the API
const stops = new Map() // item id -> last position (ticks) the player reported when it stopped
const failing = new Map() // path fragment -> status: requests whose path contains the fragment fail with that status (see /__fail)

const V = it => { const { children, ord, ...rest } = it; void children; void ord; return { ...rest, UserData: { ...(it.UserData ?? {}), ...(ud.get(it.Id) ?? {}) } } }
const STREAMS = [
  { Index: 0, Type: 'Video', Codec: 'h264', DisplayTitle: '360p H264' },
  { Index: 1, Type: 'Audio', Codec: 'aac', Language: 'eng', DisplayTitle: 'English - AAC - Stereo', IsDefault: true, Channels: 2 },
  { Index: 2, Type: 'Audio', Codec: 'aac', Language: 'spa', DisplayTitle: 'Spanish - AAC - Stereo', Channels: 2 },
  { Index: 3, Type: 'Subtitle', Codec: 'srt', Language: 'eng', DisplayTitle: 'English - SRT', IsTextSubtitleStream: true },
  { Index: 4, Type: 'Subtitle', Codec: 'srt', Language: 'spa', DisplayTitle: 'Spanish - SRT', IsTextSubtitleStream: true },
  { Index: 5, Type: 'Subtitle', Codec: 'pgssub', Language: 'eng', DisplayTitle: 'English - PGSSUB', IsTextSubtitleStream: false }
]
/** Single-item responses carry the extra detail that list responses leave out. */
// Seek-bar previews, as a server that has made them describes them: 13 thumbnails, one a second, in one 5 by 5 tile.
const TRICKPLAY = { ms1: { 160: { Width: 160, Height: 90, TileWidth: 5, TileHeight: 5, ThumbnailCount: 13, Interval: 1000, Bandwidth: 1000 } } }
// Qt's SVG renderer (the native app) doesn't read hsl(); MOCK_RGB=1 turns the art's colours into rgb() for it.
const hslToRgb = svg => svg.replace(/hsl\((\d+(?:\.\d+)?) (\d+)% (\d+)%\)/g, (_m, h, s, l) => {
  const S = s / 100, L = l / 100, a = S * Math.min(L, 1 - L)
  const f = n => { const k = (n + h / 30) % 12; return Math.round(255 * (L - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))) }
  return `rgb(${f(0)},${f(8)},${f(4)})`
})
const tileSvg = () => `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450">${Array.from({ length: 25 }, (_, k) => `<rect x="${(k % 5) * 160}" y="${Math.floor(k / 5) * 90}" width="160" height="90" fill="hsl(${k * 14} 60% 40%)"/><text x="${(k % 5) * 160 + 80}" y="${Math.floor(k / 5) * 90 + 55}" font-size="40" fill="#fff" text-anchor="middle">${k}s</text>`).join('')}</svg>`
const detail = it => {
  const base = V(it)
  if (it.Type === 'Movie' || it.Type === 'Series') {
    return { ...base, People: castFor(it.ord), Studios: [{ Name: 'Mock Pictures' }], MediaSources: [{ Id: 'ms1', RunTimeTicks: 12 * SEC, MediaStreams: STREAMS }], Trickplay: TRICKPLAY }
  }
  if (it.Type === 'Episode') return { ...base, MediaSources: [{ Id: 'ms1', RunTimeTicks: 12 * SEC, MediaStreams: STREAMS }], Trickplay: TRICKPLAY }
  return base
}

get('s1e1x4').UserData = { PlaybackPositionTicks: 6 * SEC, PlayedPercentage: 50 }
const withProgress = (it, pct) => ({ ...it, UserData: { PlayedPercentage: pct, PlaybackPositionTicks: Math.round(((it.RunTimeTicks ?? 0) * pct) / 100) } })
const resume = [withProgress(get('s1e1x4'), 42), withProgress(movies[3], 68), withProgress(get('s3e1x2'), 15), withProgress(movies[10], 81), withProgress(get('s5e2x1'), 55), withProgress(movies[17], 23)]
const nextUp = ['s2e1x1', 's4e1x1', 's6e2x3', 's8e1x2', 's10e1x1'].map(get)

// ---------- placeholder art ----------
function art(item, kind) {
  const isPerson = item.Type === 'Person'
  const wide = !isPerson && (kind !== 'Primary' || item.Type === 'Episode' || item.Type === 'CollectionFolder' || item.Type === 'Video' || item.Type === 'Trailer')
  const W = isPerson ? 300 : wide ? 1280 : 400, H = isPerson ? 300 : wide ? 720 : 600
  const seed = hash(item.SeriesId ?? item.Id)
  const hue = seed % 360, hue2 = (hue + 40 + ((seed >> 3) % 60)) % 360
  const rnd = n => ((seed >> n) & 255) / 255
  let decor = ''
  if (isPerson) {
    const initials = item.Name.split(' ').map(w => w[0]).join('').slice(0, 2)
    decor = `<text x="150" y="190" font-family="Georgia, serif" font-size="110" font-weight="700" fill="#fff" text-anchor="middle">${esc(initials)}</text>`
  } else if (wide) {
    for (let k = 0; k < 4; k++) {
      const cx = Math.round(rnd(k * 3) * W), cy = Math.round(rnd(k * 3 + 1) * H), r = 120 + Math.round(rnd(k * 3 + 2) * 260)
      decor += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="hsl(${(hue + k * 35) % 360} 80% ${45 + k * 6}%)" opacity="${(0.1 + k * 0.04).toFixed(2)}"/>`
    }
    decor += `<polygon points="0,${H} ${W * 0.55},${H * 0.55} ${W},${H}" fill="hsl(${hue2} 60% 8%)" opacity=".5"/>`
  } else {
    decor += `<circle cx="${W * 0.7}" cy="${H * 0.3}" r="${W * 0.38}" fill="hsl(${hue2} 90% 62%)" opacity=".35"/>`
    decor += `<polygon points="0,${H} 0,${H * 0.62} ${W * 0.35},${H * 0.5} ${W * 0.7},${H * 0.64} ${W},${H * 0.55} ${W},${H}" fill="hsl(${hue} 50% 8%)" opacity=".7"/>`
    const lines = []
    let cur = ''
    for (const w of item.Name.split(' ')) { if ((cur + ' ' + w).trim().length > 11 && cur) { lines.push(cur); cur = w } else cur = (cur + ' ' + w).trim() }
    lines.push(cur)
    const y0 = H - 36 - (lines.length - 1) * 54
    decor += `<text x="28" y="${y0}" font-family="Georgia, serif" font-weight="700" font-size="46" fill="#fff">` +
      lines.map((l, i) => `<tspan x="28" dy="${i === 0 ? 0 : 54}">${esc(l)}</tspan>`).join('') + '</text>'
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 60% 30%)"/><stop offset="1" stop-color="hsl(${hue2} 70% 12%)"/></linearGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/>${decor}</svg>`
}

// ---------- query engine ----------
const boxOf = new Map()
boxsets.forEach(b => b.children.forEach(id => boxOf.set(id, b)))
/** Replace every movie that belongs to a collection with that collection (once, where its first movie was). */
function collapseBoxes(list) {
  const seen = new Set(), out = []
  for (const x of list) {
    const b = boxOf.get(x.Id)
    if (!b) out.push(x)
    else if (!seen.has(b.Id)) { seen.add(b.Id); out.push(b) }
  }
  return out
}
function queryItems(q) {
  const types = (q.get('IncludeItemTypes') ?? '').split(',').filter(Boolean)
  const parent = q.get('ParentId')
  let pool
  if (types.includes('Person')) pool = people
  else if (parent === 'lib-movies') pool = movies
  else if (parent === 'lib-shows') pool = series
  else if (parent === 'lib-collections') pool = boxsets
  else if (parent && all.get(parent)?.Type === 'BoxSet') pool = all.get(parent).children.map(get)
  else pool = [...movies, ...series, ...boxsets, ...(types.includes('Episode') ? episodes : [])]
  if (types.length) pool = pool.filter(x => types.includes(x.Type))
  const genres = (q.get('Genres') ?? '').split('|').filter(Boolean)
  if (genres.length) pool = pool.filter(x => genres.some(g => x.Genres?.includes(g)))
  const filters = (q.get('Filters') ?? '').split(',').filter(Boolean)
  const flag = (x, k) => V(x).UserData[k]
  if (filters.includes('IsFavorite')) pool = pool.filter(x => flag(x, 'IsFavorite'))
  if (filters.includes('IsUnplayed')) pool = pool.filter(x => !flag(x, 'Played'))
  if (filters.includes('IsPlayed')) pool = pool.filter(x => flag(x, 'Played'))
  const term = (q.get('SearchTerm') ?? '').toLowerCase()
  if (term) pool = pool.filter(x => x.Name.toLowerCase().includes(term))
  const person = q.get('PersonIds')
  if (person) pool = pool.filter(x => castFor(x.ord).some(p => p.Id === person))
  // Like the real server, only group plain browsing lists (not filtered by genre, favourites, a person or a search).
  if (MODE === 'collapse' && q.get('CollapseBoxSetItems') !== 'false' && types.includes('Movie') && !types.includes('BoxSet') && !genres.length && !filters.length && !term && !person) pool = collapseBoxes(pool)
  const by = (q.get('SortBy') ?? '').split(',')[0]
  const dir = q.get('SortOrder') === 'Descending' ? -1 : 1
  const keyOf = { SortName: x => x.Name.toLowerCase(), DateCreated: x => x.DateCreated ?? '', PremiereDate: x => x.PremiereDate ?? '', CommunityRating: x => x.CommunityRating ?? 0, ProductionYear: x => x.ProductionYear ?? 0, Random: x => hash(x.Id + (q.get('Seed') ?? '')) }[by]
  if (keyOf) pool = [...pool].sort((a, b) => (keyOf(a) < keyOf(b) ? -1 : keyOf(a) > keyOf(b) ? 1 : 0) * dir)
  const start = Number(q.get('StartIndex') ?? 0), limit = Number(q.get('Limit') ?? 1000)
  return { Items: pool.slice(start, start + limit).map(V), TotalRecordCount: pool.length, StartIndex: start }
}

// ---------- server ----------
const json = (res, obj, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)) }
const text = (res, status, body, type = 'text/plain') => { res.writeHead(status, { 'Content-Type': type }); res.end(body) }
const parseAuth = h => {
  const m = /^(MediaBrowser|Emby)\s+(.*)$/i.exec(h ?? '')
  return m ? Object.fromEntries([...m[2].matchAll(/(\w+)="([^"]*)"/g)].map(x => [x[1], x[2]])) : {}
}
const authInfo = req => {
  const modern = parseAuth(req.headers['authorization']), legacy = parseAuth(req.headers['x-emby-authorization'])
  return MODE === 'modern' ? modern : MODE === 'legacy' ? legacy : { ...legacy, ...modern }
}
const tokenOf = (req, q) => authInfo(req).Token || (MODE === 'modern' ? undefined : req.headers['x-emby-token']) || q.get('ApiKey') || (MODE === 'modern' ? undefined : q.get('api_key'))
const readBody = req => new Promise(r => { let b = ''; req.on('data', c => (b += c)); req.on('end', () => r(b)) })
const VTT = 'WEBVTT\n\n00:00:00.500 --> 00:00:03.000\nHello from the mock subtitles\n\n00:00:03.500 --> 00:00:06.000\nSecond line of subtitles\n'

const handler = async (req, res) => {
  const u = new URL(req.url, 'http://x'), p = u.pathname, q = u.searchParams
  res.on('finish', () => console.log(`[${PORT}] ${req.method} ${p}${u.search.slice(0, 400)} -> ${res.statusCode}`))
  if (SELF_CORS) {
    res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', '*'); res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  }
  if (MODE === 'nginx400') return text(res, 400, '<html>\r\n<head><title>400 The plain HTTP request was sent to HTTPS port</title></head>\r\n<body>\r\n<center><h1>400 Bad Request</h1></center>\r\n<center>The plain HTTP request was sent to HTTPS port</center>\r\n<hr><center>nginx</center>\r\n</body>\r\n</html>', 'text/html')
  if (MODE === 'notjellyfin') return req.method === 'GET' ? text(res, 200, '<html><body><h1>Welcome to nginx!</h1></body></html>', 'text/html') : text(res, 405, '')
  if (MODE === 'redirect') { res.writeHead(301, { Location: `http://127.0.0.1:${process.env.MOCK_REDIRECT_TO}${req.url}` }); return res.end() }
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end() }

  let m
  if (p === '/__reset') { ud.clear(); stops.clear(); failing.clear(); return text(res, 200, 'ok') }
  // /__fail?match=Genres&status=500 makes every signed-in request whose path contains "Genres" fail with 500 (match= alone
  // means every one, which is how a revoked token looks); /__fail?match=Genres without a status lifts it again.
  if (p === '/__fail') { const frag = q.get('match') ?? ''; if (q.has('status')) failing.set(frag, Number(q.get('status'))); else failing.delete(frag); return text(res, 200, 'ok') }
  if (p === '/__state') return json(res, { ...(ud.get(q.get('id')) ?? {}), stoppedAt: stops.get(q.get('id')) })
  if (p === '/System/Info/Public') return json(res, { ServerName: 'Mock', Version: MODE === 'modern' ? '12.0.0' : '10.10.0', ProductName: 'Jellyfin Server', Id: 'mockserver' })
  if (p === '/Users/Public') return json(res, [{ Name: 'demo', Id: 'u1' }, { Name: 'guest', Id: 'u2' }])
  if (p === '/Users/AuthenticateByName' && req.method === 'POST') {
    const b = JSON.parse((await readBody(req)) || '{}')
    const a = authInfo(req)
    for (const [k, param] of [['Client', 'request.App'], ['Version', 'request.AppVersion'], ['DeviceId', 'request.DeviceId'], ['Device', 'request.DeviceName']])
      if (!a[k]) return text(res, 400, `Value cannot be null. (Parameter '${param}')`)
    if ((b.Username === 'demo' && b.Pw === 'demo') || (b.Username === 'guest' && b.Pw === 'guest')) return json(res, { AccessToken: TOKEN, User: { Id: 'u1', Name: b.Username } })
    return json(res, { error: 'bad credentials' }, 401)
  }
  if ((m = p.match(/^\/Items\/([^/]+)\/Images\/(Primary|Backdrop|Thumb)$/))) {
    const it = get(m[1])
    if (!it) { res.writeHead(404); return res.end() }
    res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'max-age=60' })
    return res.end(process.env.MOCK_RGB === '1' ? hslToRgb(art(it, m[2])) : art(it, m[2]))
  }
  if ((m = p.match(/^\/Videos\/[^/]+\/(seg\d+\.ts)$/i)) && MEDIA) { // real Jellyfin puts the token in segment URLs; the mock does not care
    const f = path.join(MEDIA, m[1])
    if (!fs.existsSync(f)) { res.writeHead(404); return res.end() }
    res.writeHead(200, { 'Content-Type': 'video/mp2t' })
    return res.end(fs.readFileSync(f))
  }

  // everything below needs the token the app got at login
  if (tokenOf(req, q) !== TOKEN) return json(res, { error: 'unauthorized' }, 401)
  for (const [frag, status] of failing) if (p.includes(frag)) return json(res, { error: 'failure made up by the test' }, status)
  if (/^\/Videos\/[^/]+\/Trickplay\/\d+\/\d+\.jpg$/i.test(p)) { res.writeHead(200, { 'Content-Type': 'image/svg+xml' }); return res.end(tileSvg()) }
  if (/^\/Videos\/[^/]+\/stream$/i.test(p) && MEDIA) { // the file as it is, with byte ranges so the player can seek in it
    const f = path.join(MEDIA, 'clip.mp4')
    if (MODE === 'brokendirect' || !fs.existsSync(f)) { res.writeHead(200, { 'Content-Type': 'video/mp4' }); return res.end('this is not a video') }
    const size = fs.statSync(f).size
    const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '')
    const start = range && range[1] ? Number(range[1]) : 0
    const end = range && range[2] ? Number(range[2]) : size - 1
    res.writeHead(range ? 206 : 200, { 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, ...(range ? { 'Content-Range': `bytes ${start}-${end}/${size}` } : {}) })
    return fs.createReadStream(f, { start, end }).pipe(res)
  }
  if (/\/master\.m3u8$/.test(p)) {
    const f = path.join(MEDIA, 'index.m3u8')
    return MEDIA && fs.existsSync(f) ? text(res, 200, fs.readFileSync(f), 'application/vnd.apple.mpegurl') : text(res, 404, 'the mock has no media')
  }
  if (/\/Subtitles\/\d+\/\d+\/Stream\.vtt$/.test(p)) return text(res, 200, VTT, 'text/vtt')

  const oldStyle = MODE !== 'modern' // /Users/{id}/...  ('modern' pretends these were removed)
  const newStyle = MODE !== 'legacy' && MODE !== 'oldroutes' // /UserViews, /UserItems/Resume, /Items/Latest, /Items/{id}, /UserFavoriteItems ... ('legacy' pretends an older server)
  const latest = () => {
    const wantSeries = q.get('IncludeItemTypes') === 'Series'
    let list = [...(wantSeries ? series : movies)].sort((a, b) => (a.DateCreated < b.DateCreated ? 1 : -1))
    if (MODE === 'collapse' && !wantSeries && q.get('GroupItems') !== 'false') list = collapseBoxes(list)
    return json(res, list.slice(0, 20).map(V))
  }
  const one = id => (get(id) ? json(res, detail(get(id))) : json(res, {}, 404))
  const setFlag = (id, key, on) => { ud.set(id, { ...(ud.get(id) ?? {}), [key]: on }); return json(res, { ...V(get(id)).UserData, ItemId: id }) }

  if (p === '/UserViews' && newStyle) return json(res, { Items: views.map(V), TotalRecordCount: views.length })
  if (p === '/Users/u1/Views' && oldStyle) return json(res, { Items: views.map(V), TotalRecordCount: views.length })
  if (p === '/UserItems/Resume' && newStyle) return json(res, { Items: resume.map(V) })
  if (p === '/Users/u1/Items/Resume' && oldStyle) return json(res, { Items: resume.map(V) })
  if (p === '/Shows/NextUp') {
    const sid = q.get('SeriesId')
    if (sid) { const e = episodes.find(x => x.SeriesId === sid && !V(x).UserData.Played); return json(res, { Items: e ? [V(e)] : [] }) }
    return json(res, { Items: nextUp.map(V) })
  }
  if (p === '/Users/u1/Items/Latest' && oldStyle) return latest()
  if (p === '/Items/Latest' && newStyle) return latest()
  if (p === '/Genres') return json(res, { Items: GENRES.map(Name => ({ Name, Id: `g-${Name}`, Type: 'Genre' })) })
  if ((p === '/Users/u1/Items' && oldStyle) || p === '/Items') return json(res, queryItems(q))
  if ((m = p.match(/^\/Users\/u1\/Items\/([^/]+)$/)) && oldStyle) return one(m[1])
  if ((m = p.match(/^\/Items\/([^/]+)$/)) && newStyle) return one(m[1])
  if ((m = p.match(/^\/Shows\/([^/]+)\/Episodes$/))) return json(res, { Items: episodes.filter(e => e.SeriesId === m[1]).map(V) })
  if ((m = p.match(/^\/Items\/([^/]+)\/Similar$/))) {
    const pool = [...movies, ...series].filter(x => x.Id !== m[1])
    const start = hash(m[1]) % pool.length
    return json(res, { Items: Array.from({ length: 10 }, (_, k) => V(pool[(start + k) % pool.length])) })
  }
  if ((m = p.match(/^\/Items\/([^/]+)\/SpecialFeatures$/))) {
    const it = get(m[1])
    return json(res, it?.Type === 'Movie' && it.ord % 5 === 0 ? [extraOf(it.Id, 1), extraOf(it.Id, 2)] : [])
  }
  if ((m = p.match(/^\/Items\/([^/]+)\/LocalTrailers$/))) {
    const it = get(m[1])
    return json(res, it?.Type === 'Movie' && it.ord % 7 === 0 ? [trailerOf(it.Id)] : [])
  }
  if (p === '/Movies/Recommendations') {
    const cat = (type, baseline, start) => ({ RecommendationType: type, BaselineItemName: baseline, CategoryId: `c-${start}`, Items: movies.slice(start, start + 12).map(V) })
    return json(res, [cat('SimilarToRecentlyPlayed', movies[3].Name, 30), cat('HasDirectorFromRecentlyPlayed', 'Dana Whitfield', 50), cat('HasActorFromRecentlyPlayed', PEOPLE[4], 70)])
  }
  if ((m = p.match(/^\/MediaSegments\/([^/]+)$/))) {
    const items = [{ Type: 'Intro', StartTicks: 1 * SEC, EndTicks: 4 * SEC }, { Type: 'Outro', StartTicks: 9 * SEC, EndTicks: 12 * SEC }]
    return json(res, { Items: items.map(x => ({ ...x, ItemId: m[1] })), TotalRecordCount: 2 })
  }
  if ((m = p.match(/^\/Items\/([^/]+)\/PlaybackInfo$/)) && req.method === 'POST') {
    // Like a real server: told what the player can decode, it answers with the file to play as it is or a stream address.
    const b = JSON.parse((await readBody(req)) || '{}')
    const source = { Id: 'ms1', ETag: 'etag1', Container: 'mp4', RunTimeTicks: 12 * SEC, MediaStreams: STREAMS, DefaultAudioStreamIndex: 1 }
    if ((MODE === 'directplay' || MODE === 'brokendirect') && b.EnableDirectPlay !== false) return json(res, { PlaySessionId: 'ps1', MediaSources: [{ ...source, SupportsDirectPlay: true, SupportsDirectStream: true, SupportsTranscoding: true }] })
    if (MODE === 'legacy' || MODE === 'oldroutes') return json(res, { PlaySessionId: 'ps1', MediaSources: [source] }) // older servers give no stream address
    const tq = new URLSearchParams({ MediaSourceId: 'ms1', PlaySessionId: 'ps1', VideoCodec: 'h264', AudioCodec: 'aac', SegmentContainer: 'ts' })
    if (b.AudioStreamIndex != null) tq.set('AudioStreamIndex', String(b.AudioStreamIndex))
    if (b.SubtitleStreamIndex != null) { tq.set('SubtitleStreamIndex', String(b.SubtitleStreamIndex)); tq.set('SubtitleMethod', 'Encode') }
    if (b.MaxStreamingBitrate) tq.set('VideoBitRate', String(b.MaxStreamingBitrate - 192000))
    return json(res, { PlaySessionId: 'ps1', MediaSources: [{ ...source, SupportsDirectPlay: false, SupportsDirectStream: true, SupportsTranscoding: true, TranscodingUrl: `/videos/${m[1]}/master.m3u8?${tq}`, TranscodingSubProtocol: 'hls', TranscodingContainer: 'ts' }] })
  }
  if ((m = p.match(/^\/UserFavoriteItems\/([^/]+)$/)) && newStyle) return setFlag(m[1], 'IsFavorite', req.method === 'POST')
  if ((m = p.match(/^\/Users\/u1\/FavoriteItems\/([^/]+)$/)) && oldStyle) return setFlag(m[1], 'IsFavorite', req.method === 'POST')
  if ((m = p.match(/^\/UserPlayedItems\/([^/]+)$/)) && newStyle) return setFlag(m[1], 'Played', req.method === 'POST')
  if ((m = p.match(/^\/Users\/u1\/PlayedItems\/([^/]+)$/)) && oldStyle) return setFlag(m[1], 'Played', req.method === 'POST')
  if (p === '/Sessions/Playing/Stopped') {
    try { const b = JSON.parse((await readBody(req)) || '{}'); if (b.ItemId) stops.set(b.ItemId, b.PositionTicks) } catch { /* ignore */ }
    res.writeHead(204); return res.end()
  }
  if (p.startsWith('/Sessions/Playing')) { res.writeHead(204); return res.end() }

  res.writeHead(404); res.end()
}
// With MOCK_TLS_KEY and MOCK_TLS_CERT (file paths) it speaks HTTPS, for the self-signed certificate check.
const server = process.env.MOCK_TLS_KEY ? https.createServer({ key: fs.readFileSync(process.env.MOCK_TLS_KEY), cert: fs.readFileSync(process.env.MOCK_TLS_CERT) }, handler) : http.createServer(handler)
server.listen(PORT, '127.0.0.1', () => console.log(`mock jellyfin on ${PORT}`))
