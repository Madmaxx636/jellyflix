import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApi, itemsQuery } from '../../src/renderer/src/api/client'
import { flagsOf } from '../../src/renderer/src/userdata'
import type { Session } from '../../src/renderer/src/api/types'

const session = (server: string): Session => ({ server, token: 'tok', userId: 'u1', userName: 'demo' })
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, statusText: status === 404 ? 'Not Found' : 'OK' })

describe('itemsQuery', () => {
  it('always turns off collapsing movies into collections, and asks for the total', () => {
    const q = new URLSearchParams(itemsQuery({ userId: 'u1' }, {}))
    expect(q.get('CollapseBoxSetItems')).toBe('false')
    expect(q.get('Recursive')).toBe('true')
    expect(q.get('EnableTotalRecordCount')).toBe('true')
    expect(q.get('userId')).toBe('u1')
  })

  it('writes every part of a query', () => {
    const q = new URLSearchParams(itemsQuery({ userId: 'u1' }, {
      parentId: 'lib', types: ['Movie', 'Series'], genres: ['Action', 'Sci-Fi'], filters: ['IsUnplayed', 'IsFavorite'],
      sortBy: 'SortName', sortOrder: 'Descending', start: 48, limit: 24, search: 'sil ent', personId: 'p1'
    }))
    expect(Object.fromEntries(q)).toMatchObject({
      ParentId: 'lib', IncludeItemTypes: 'Movie,Series', Genres: 'Action|Sci-Fi', Filters: 'IsUnplayed,IsFavorite',
      SortBy: 'SortName', SortOrder: 'Descending', StartIndex: '48', Limit: '24', SearchTerm: 'sil ent', PersonIds: 'p1'
    })
  })

  it('leaves out what is not asked for', () => {
    const q = new URLSearchParams(itemsQuery({ userId: 'u1' }, { types: [], genres: [] }))
    expect(q.has('IncludeItemTypes')).toBe(false)
    expect(q.has('Genres')).toBe(false)
    expect(q.has('SortBy')).toBe(false)
    expect(q.has('StartIndex')).toBe(false)
  })

  it('sorts ascending unless told otherwise', () => {
    expect(new URLSearchParams(itemsQuery({ userId: 'u1' }, { sortBy: 'SortName' })).get('SortOrder')).toBe('Ascending')
  })
})

describe('the client', () => {
  const fetchMock = vi.fn()
  let n = 0
  // The client remembers which spelling of a route a server understood, per server: every test gets a server of its own.
  const server = () => `http://mock-${++n}.test`

  beforeEach(() => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} })
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => fetchMock.mockReset())

  it('falls back to the older route when the current one is not found, and then remembers which worked', async () => {
    const s = server()
    fetchMock.mockImplementation(async (url: string) => (url.includes('/UserViews') ? json({}, 404) : json({ Items: [{ Id: 'v1', Name: 'Movies' }] })))
    const api = createApi(session(s))
    expect(await api.views()).toEqual([{ Id: 'v1', Name: 'Movies' }])
    expect(fetchMock.mock.calls.map(c => c[0])).toEqual([`${s}/UserViews?userId=u1`, `${s}/Users/u1/Views`])

    fetchMock.mockClear()
    await api.views()
    expect(fetchMock).not.toHaveBeenCalled() // pages share one answer for a minute

    const later = Date.now() + 61_000
    const clock = vi.spyOn(Date, 'now').mockReturnValue(later)
    await api.views()
    clock.mockRestore()
    expect(fetchMock.mock.calls.map(c => c[0])).toEqual([`${s}/Users/u1/Views`]) // straight to the one that worked
  })

  it("does not hide a real server error behind the fallback", async () => {
    fetchMock.mockResolvedValue(json({}, 500))
    await expect(createApi(session(server())).views()).rejects.toMatchObject({ status: 500 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('sends the token as ApiKey in stream and subtitle addresses', () => {
    const api = createApi(session('http://s.test'))
    const hls = new URL(api.hlsUrl('item 1', { playSessionId: 'ps', source: { Id: 'ms' } }, { audio: 2, burnSubtitle: 5, bitrate: 4_000_000 }))
    expect(hls.pathname).toBe('/Videos/item%201/master.m3u8')
    expect(Object.fromEntries(hls.searchParams)).toMatchObject({
      ApiKey: 'tok', MediaSourceId: 'ms', PlaySessionId: 'ps', AudioStreamIndex: '2', SubtitleStreamIndex: '5', SubtitleMethod: 'Encode',
      VideoBitRate: '4000000', MaxStreamingBitrate: '4192000'
    })
    expect(api.subtitleUrl('i', 'ms', 3)).toBe('http://s.test/Videos/i/ms/Subtitles/3/0/Stream.vtt?ApiKey=tok')
    const plain = new URL(api.hlsUrl('i', { playSessionId: 'ps', source: { Id: 'ms' } }))
    expect(plain.searchParams.has('AudioStreamIndex')).toBe(false)
    expect(plain.searchParams.has('SubtitleMethod')).toBe(false)
  })

  it('builds picture addresses that are safe to put in a page', () => {
    const api = createApi(session('http://s.test'))
    expect(api.image('a/b', 'tag 1', 300)).toBe('http://s.test/Items/a%2Fb/Images/Primary?maxWidth=300&tag=tag%201')
    expect(api.poster({ Id: 'e1', Name: 'E', Type: 'Episode', SeriesId: 's1' })).toBe('http://s.test/Items/s1/Images/Primary?maxWidth=400') // an episode shows its show's poster
    expect(api.poster({ Id: 'm1', Name: 'M', Type: 'Movie' })).toBe('')
    expect(api.thumb({ Id: 'm1', Name: 'M', Type: 'Movie', BackdropImageTags: ['b'] }, 500)).toContain('/Images/Backdrop?maxWidth=500&tag=b')
  })

  it("marks what it fetched, so a list change made later still applies to it but not to fresher copies", async () => {
    fetchMock.mockImplementation(async () => json({ Items: [{ Id: 'a', Name: 'A', Type: 'Movie', UserData: { IsFavorite: true } }], TotalRecordCount: 1 }))
    const page = await createApi(session(server())).items({})
    expect(page.total).toBe(1)
    expect(flagsOf(page.items[0]).fav).toBe(true) // the server's answer is used when nothing has been changed here
  })

  it('stops requests when the page that asked has gone', async () => {
    fetchMock.mockImplementation((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(init.signal?.reason))
    }))
    const ctl = new AbortController()
    const pending = createApi(session(server())).with(ctl.signal).genres()
    ctl.abort(new Error('left'))
    await expect(pending).rejects.toThrow('left')
  })

  it('does not let an extras failure break a title page', async () => {
    fetchMock.mockImplementation(async (url: string) => (url.includes('SpecialFeatures') ? json({}, 500) : json([{ Id: 't1', Name: 'Trailer', Type: 'Trailer' }])))
    const extras = await createApi(session(server())).extras('m1')
    expect(extras.map(x => x.Name)).toEqual(['Trailer'])
  })
})
