import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addressCandidates, explainSignInFailure } from '../../src/renderer/src/api/connect'
import { HttpError, authHeader, reasonFrom, req, setUnauthorizedHandler } from '../../src/renderer/src/api/http'

function stubStorage() {
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => { data.set(k, v) },
    removeItem: (k: string) => { data.delete(k) }
  })
}

describe('reasonFrom', () => {
  it('reads the usual JSON error shapes', () => {
    expect(reasonFrom('{"title":"Bad Request","detail":"Pw is required"}')).toBe('Pw is required — Bad Request')
    expect(reasonFrom('{"Message":"Nope"}')).toBe('Nope')
    expect(reasonFrom('{"errors":{"Username":["is required"]}}')).toBe('is required')
  })

  it("uses the title of a proxy's error page", () => {
    expect(reasonFrom('<!DOCTYPE html><html><head><title>502 Bad Gateway</title></head><body>x</body></html>')).toBe('502 Bad Gateway')
  })

  it('strips tags from other HTML and plain text', () => {
    expect(reasonFrom('<p>Hello   <b>there</b></p>')).toBe('Hello there')
    expect(reasonFrom('  just text  ')).toBe('just text')
    expect(reasonFrom('')).toBe('')
  })

  it('keeps it short', () => {
    expect(reasonFrom('x'.repeat(1000)).length).toBeLessThanOrEqual(240)
  })
})

describe('requests', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    stubStorage()
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    fetchMock.mockReset()
    setUnauthorizedHandler(null)
  })

  it('sends the app identity, and the token once there is one', async () => {
    expect(authHeader()).toMatch(/^MediaBrowser Client="Jellyflix", Device="Desktop", DeviceId="[^"]+", Version="[^"]+"$/)
    expect(authHeader('abc')).toMatch(/, Token="abc"$/)
  })

  it('returns the parsed answer', async () => {
    fetchMock.mockResolvedValue(new Response('{"ok":true}', { status: 200 }))
    await expect(req({ server: 'http://s', token: 't' }, '/x')).resolves.toEqual({ ok: true })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }]
    expect(url).toBe('http://s/x')
    expect(init.headers['Authorization']).toContain('Token="t"')
  })

  it('treats an empty answer as nothing', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
    await expect(req({ server: 'http://s' }, '/x', { method: 'POST' })).resolves.toBeUndefined()
  })

  it('sends a body as JSON', async () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }))
    await req({ server: 'http://s' }, '/x', { method: 'POST', body: '{"a":1}' })
    const [, init] = fetchMock.mock.calls[0] as [string, { headers: Record<string, string> }]
    expect(init.headers['Content-Type']).toBe('application/json')
  })

  it('fails with the status and what the server said', async () => {
    fetchMock.mockResolvedValue(new Response('{"title":"Boom"}', { status: 500, statusText: 'Internal Server Error' }))
    const failure = await req({ server: 'http://s' }, '/x').catch((e: unknown) => e)
    expect(failure).toBeInstanceOf(HttpError)
    expect((failure as HttpError).status).toBe(500)
    expect((failure as HttpError).message).toBe('500 Internal Server Error: Boom')
  })

  it('tells the app when a signed-in request is turned down with 401', async () => {
    const ended = vi.fn()
    setUnauthorizedHandler(ended)
    fetchMock.mockResolvedValue(new Response('', { status: 401, statusText: 'Unauthorized' }))
    await expect(req({ server: 'http://s', token: 't' }, '/x')).rejects.toBeInstanceOf(HttpError)
    expect(ended).toHaveBeenCalledOnce()
  })

  it('does not treat a wrong password at sign-in as an ended session', async () => {
    const ended = vi.fn()
    setUnauthorizedHandler(ended)
    fetchMock.mockResolvedValue(new Response('', { status: 401, statusText: 'Unauthorized' }))
    await expect(req({ server: 'http://s' }, '/Users/AuthenticateByName')).rejects.toBeInstanceOf(HttpError)
    expect(ended).not.toHaveBeenCalled()
  })

  it('stops when asked to', async () => {
    fetchMock.mockImplementation((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(init.signal?.reason))
    }))
    const ctl = new AbortController()
    const pending = req({ server: 'http://s' }, '/x', {}, ctl.signal)
    ctl.abort(new Error('left the page'))
    await expect(pending).rejects.toThrow('left the page')
  })
})

describe('addressCandidates', () => {
  it('tries the usual spellings for a bare host', () => {
    expect(addressCandidates('media.example.com')).toEqual([
      'https://media.example.com', 'http://media.example.com:8096', 'http://media.example.com', 'https://media.example.com:8920'
    ])
  })

  it('keeps a typed port, trying the likelier scheme first', () => {
    expect(addressCandidates('192.168.1.10:8096')).toEqual(['http://192.168.1.10:8096', 'https://192.168.1.10:8096'])
    expect(addressCandidates('host:443')).toEqual(['https://host:443', 'http://host:443'])
  })

  it('takes an address with a scheme as it is, minus a trailing slash', () => {
    expect(addressCandidates('https://jf.example.com/')).toEqual(['https://jf.example.com'])
  })

  it("keeps Jellyfin's own base path but drops the web client's", () => {
    expect(addressCandidates('https://example.com/jellyfin')).toEqual(['https://example.com/jellyfin'])
    expect(addressCandidates('https://example.com/jellyfin/web/index.html#!/home.html')).toEqual(['https://example.com/jellyfin'])
    expect(addressCandidates('http://nas:8096/web/index.html')).toEqual(['http://nas:8096'])
  })

  it('gives nothing for what is not an address', () => {
    expect(addressCandidates('')).toEqual([])
    expect(addressCandidates('   ')).toEqual([])
    expect(addressCandidates('ftp://example.com')).toEqual([])
    expect(addressCandidates('http://')).toEqual([])
  })
})

describe('explainSignInFailure', () => {
  const found = { server: 'http://nas:8096', info: { ServerName: 'Nas', Version: '12.0.0' }, tried: ['http://nas:8096'] }

  it('says the password is wrong for a 401', () => {
    expect(explainSignInFailure(new HttpError(401, 'Unauthorized', ''), found)).toBe('Wrong username or password.')
  })

  it('explains a 400 and includes what the server said', () => {
    const text = explainSignInFailure(new HttpError(400, 'Bad Request', 'Pw is required'), found)
    expect(text).toContain('400')
    expect(text).toContain('Pw is required')
    expect(text).toContain('Jellyfin 12.0.0')
  })

  it('points to https when a plain request reached a TLS port', () => {
    expect(explainSignInFailure(new HttpError(400, 'Bad Request', 'Client sent an HTTP request to an HTTPS server. plain http request was sent to https port'), found))
      .toContain('https://nas:8096')
  })

  it('says when the address is not Jellyfin at all', () => {
    expect(explainSignInFailure(new HttpError(404, 'Not Found', ''), { server: 'http://x', info: null, tried: [] })).toMatch(/not like Jellyfin/)
  })

  it('lists what it tried when nothing answered', () => {
    const text = explainSignInFailure(new TypeError('Failed to fetch'), { server: 'http://a', info: null, tried: ['http://a', 'https://a'] })
    expect(text).toContain('http://a, https://a')
  })
})
