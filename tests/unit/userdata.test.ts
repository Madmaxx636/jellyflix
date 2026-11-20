import { afterEach, describe, expect, it, vi } from 'vitest'
import { recall, remember, forgetAll } from '../../src/renderer/src/hooks/memory'
import { toast } from '../../src/renderer/src/toast'
import { clearFlags, flagsOf, markFetched, toggleFavorite, togglePlayed } from '../../src/renderer/src/userdata'
import type { Api } from '../../src/renderer/src/api/jellyfin'
import type { Item } from '../../src/renderer/src/api/types'

vi.mock('../../src/renderer/src/toast', () => ({ toast: vi.fn() }))

const movie = (extra: Partial<Item> = {}): Item => ({ Id: 'a', Name: 'Alpha', Type: 'Movie', UserData: { IsFavorite: false, Played: false }, ...extra })
const fakeApi = (setFavorite: Api['setFavorite'], setPlayed: Api['setPlayed'] = async () => undefined) => ({ setFavorite, setPlayed }) as Api

describe('My List and watched marks', () => {
  afterEach(() => clearFlags())

  it("shows the server's state when nothing was changed here", () => {
    expect(flagsOf(movie({ UserData: { IsFavorite: true, Played: true } }))).toEqual({ fav: true, played: true })
    expect(flagsOf({ Id: 'x', Name: 'X', Type: 'Movie' })).toEqual({ fav: false, played: false })
  })

  it('applies a change at once, before the server has answered', async () => {
    const item = movie()
    let answer: () => void = () => {}
    const pending = toggleFavorite(fakeApi(() => new Promise<unknown>(resolve => { answer = () => resolve(undefined) })), item)
    expect(flagsOf(item).fav).toBe(true)
    answer()
    await pending
    expect(flagsOf(item).fav).toBe(true)
  })

  it('can be told which way to go', async () => {
    const item = movie({ UserData: { IsFavorite: true } })
    await toggleFavorite(fakeApi(async () => undefined), item, true)
    expect(flagsOf(item).fav).toBe(true)
    await toggleFavorite(fakeApi(async () => undefined), item, false)
    expect(flagsOf(item).fav).toBe(false)
  })

  it('puts it back and says so when the server refuses', async () => {
    const item = movie()
    await toggleFavorite(fakeApi(async () => { throw new Error('nope') }), item)
    expect(flagsOf(item).fav).toBe(false)
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('Alpha'))
  })

  it('does the same for watched marks', async () => {
    const item = movie()
    await togglePlayed(fakeApi(async () => undefined, async () => { throw new Error('nope') }), item)
    expect(flagsOf(item).played).toBe(false)
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('watched'))
  })

  it('applies to copies fetched before the change, but trusts copies fetched after it', async () => {
    const before = movie()
    markFetched([before], Date.now() - 1000)
    await toggleFavorite(fakeApi(async () => undefined), before)
    const sameTitleBefore = movie()
    markFetched([sameTitleBefore], Date.now() - 1000)
    const sameTitleAfter = movie()
    markFetched([sameTitleAfter], Date.now() + 1000)
    expect(flagsOf(sameTitleBefore).fav).toBe(true)
    expect(flagsOf(sameTitleAfter).fav).toBe(false)
  })

  it('forgets everything on sign-out', async () => {
    const item = movie()
    await toggleFavorite(fakeApi(async () => undefined), item)
    clearFlags()
    expect(flagsOf(item).fav).toBe(false)
  })
})

describe('what a page remembers for Back', () => {
  afterEach(() => { forgetAll(); vi.useRealTimers() })

  it('gives back what was kept', () => {
    remember('a', { items: [1, 2, 3] })
    expect(recall<{ items: number[] }>('a')).toEqual({ items: [1, 2, 3] })
    expect(recall('missing')).toBeUndefined()
  })

  it('replaces an older answer for the same page', () => {
    remember('a', 1)
    remember('a', 2)
    expect(recall('a')).toBe(2)
  })

  it('lets go of the oldest pages beyond a few dozen', () => {
    for (let i = 0; i < 45; i++) remember(`page-${i}`, i)
    expect(recall('page-0')).toBeUndefined()
    expect(recall('page-4')).toBeUndefined()
    expect(recall('page-44')).toBe(44)
  })

  it('lets go of a page after ten minutes', () => {
    vi.useFakeTimers()
    remember('a', 1)
    vi.advanceTimersByTime(9 * 60_000)
    expect(recall('a')).toBe(1)
    vi.advanceTimersByTime(2 * 60_000)
    expect(recall('a')).toBeUndefined()
  })

  it('forgets everything on request', () => {
    remember('a', 1)
    forgetAll()
    expect(recall('a')).toBeUndefined()
  })
})
