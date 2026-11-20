import { describe, expect, it } from 'vitest'
import { isWebUrl } from '../../src/shared/url'
import { hueOf, isBrowsable, typesFor } from '../../src/renderer/src/util/library'
import { allOrFallback } from '../../src/renderer/src/util/settle'
import { seedFrom, shuffled } from '../../src/renderer/src/util/shuffle'
import { clock, ticksToMin } from '../../src/renderer/src/util/time'

describe('time', () => {
  it('turns Jellyfin ticks into minutes', () => {
    expect(ticksToMin(undefined)).toBe(0)
    expect(ticksToMin(0)).toBe(0)
    expect(ticksToMin(36_000_000_000)).toBe(60)
    expect(ticksToMin(54_300_000_000)).toBe(91) // 90.5 minutes rounds up
  })

  it('writes a clock the way players do', () => {
    expect(clock(0)).toBe('0:00')
    expect(clock(5)).toBe('0:05')
    expect(clock(83)).toBe('1:23')
    expect(clock(3725)).toBe('1:02:05')
    expect(clock(-4)).toBe('0:00')
    expect(clock(61.9)).toBe('1:01')
  })
})

describe('library helpers', () => {
  it('maps a library to the kinds of title it holds', () => {
    expect(typesFor('movies')).toEqual(['Movie'])
    expect(typesFor('TVSHOWS')).toEqual(['Series'])
    expect(typesFor('boxsets')).toEqual(['BoxSet'])
    expect(typesFor(undefined)).toContain('Movie')
    expect(typesFor('mixed')).toContain('Series')
  })

  it('hides the libraries a video app cannot browse', () => {
    expect(isBrowsable({ Id: '1', Name: 'Music', CollectionType: 'music' })).toBe(false)
    expect(isBrowsable({ Id: '2', Name: 'Films', CollectionType: 'movies' })).toBe(true)
    expect(isBrowsable({ Id: '3', Name: 'Misc' })).toBe(true)
  })

  it('gives a name the same hue every time', () => {
    expect(hueOf('Action')).toBe(hueOf('Action'))
    expect(hueOf('Action')).not.toBe(hueOf('Drama'))
    expect(hueOf('Anything')).toBeGreaterThanOrEqual(0)
    expect(hueOf('Anything')).toBeLessThan(360)
  })
})

describe('isWebUrl', () => {
  it('accepts http and https only', () => {
    expect(isWebUrl('https://www.youtube.com/watch?v=abc')).toBe(true)
    expect(isWebUrl('http://example.com')).toBe(true)
    expect(isWebUrl('file:///etc/passwd')).toBe(false)
    expect(isWebUrl('smb://server/share')).toBe(false)
    expect(isWebUrl('javascript:alert(1)')).toBe(false)
    expect(isWebUrl('not a url')).toBe(false)
    expect(isWebUrl('')).toBe(false)
    expect(isWebUrl(undefined)).toBe(false)
  })
})

describe('shuffled', () => {
  const list = Array.from({ length: 30 }, (_, i) => i)

  it('keeps every item exactly once', () => {
    expect([...shuffled(list, 7)].sort((a, b) => a - b)).toEqual(list)
  })

  it('gives the same order for the same seed, and leaves the input alone', () => {
    const copy = [...list]
    expect(shuffled(list, 42)).toEqual(shuffled(list, 42))
    expect(list).toEqual(copy)
  })

  it('gives other orders for other seeds', () => {
    expect(shuffled(list, 1)).not.toEqual(shuffled(list, 2))
    expect(shuffled(list, 1)).not.toEqual(list)
  })

  it('handles short lists', () => {
    expect(shuffled([], 1)).toEqual([])
    expect(shuffled(['only'], 1)).toEqual(['only'])
  })

  it('makes seeds from text', () => {
    expect(seedFrom('abc')).toBe(seedFrom('abc'))
    expect(seedFrom('abc')).not.toBe(seedFrom('abd'))
    expect(seedFrom('')).toBeGreaterThanOrEqual(0)
  })
})

describe('allOrFallback', () => {
  it('returns every answer when all succeed', async () => {
    expect(await allOrFallback([Promise.resolve(1), Promise.resolve(2)], 0)).toEqual([1, 2])
  })

  it('puts the fallback where one failed', async () => {
    expect(await allOrFallback([Promise.resolve(1), Promise.reject(new Error('x')), Promise.resolve(3)], 0)).toEqual([1, 0, 3])
  })

  it('throws the first error when every call failed', async () => {
    await expect(allOrFallback([Promise.reject(new Error('first')), Promise.reject(new Error('second'))], 0)).rejects.toThrow('first')
  })

  it('has nothing to complain about when there is nothing to wait for', async () => {
    expect(await allOrFallback([], 0)).toEqual([])
  })
})
