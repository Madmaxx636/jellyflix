import { describe, expect, it } from 'vitest'
import { THEMES, type PlayerControl } from '../../src/renderer/src/theme'

const ALL: PlayerControl[] = ['play', 'back10', 'fwd10', 'volume', 'next', 'episodes', 'tracks', 'speed', 'settings', 'fullscreen']

describe.each(THEMES)('the $label player layout', theme => {
  const { left, middle, right, title } = theme.player
  const placed = [...left, ...middle, ...right]

  it('places every control at most once, and only controls that exist', () => {
    expect(new Set(placed).size).toBe(placed.length)
    for (const control of placed) expect(ALL).toContain(control)
  })

  it('can play, pause, seek, change the sound and go full screen', () => {
    for (const control of ['play', 'back10', 'fwd10', 'volume', 'fullscreen'] as const) expect(placed).toContain(control)
  })

  it('can reach audio and subtitles, episodes and the next episode', () => {
    for (const control of ['tracks', 'episodes', 'next'] as const) expect(placed).toContain(control)
  })

  it('can change the speed', () => {
    expect(placed.includes('speed') || placed.includes('settings')).toBe(true)
  })

  it('puts the title in the middle of the bar only when nothing else is there', () => {
    if (title === 'bar') expect(middle).toEqual([])
  })

  it('words the next-episode card with and without a countdown', () => {
    expect(theme.words.player.nextCard(null)).not.toMatch(/\d/)
    expect(theme.words.player.nextCard(4)).toContain('4')
  })

  it('writes the episode line with season, episode and name', () => {
    const line = theme.words.player.episodeLine(2, 5, 'Open Water')
    expect(line).toContain('Open Water')
    expect(line).toMatch(/2/)
    expect(line).toMatch(/5/)
  })
})
