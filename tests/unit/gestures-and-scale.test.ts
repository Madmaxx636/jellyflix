import { describe, expect, it } from 'vitest'
import { edgeSide, swipeProgress, wheelSwipe, type WheelSwipe } from '../../src/renderer/src/util/backGesture'
import { seasonFor } from '../../src/renderer/src/util/seasons'
import { nearestStep, stepScale, zoomKeyOf } from '../../src/shared/zoom'
import { itemsQuery } from '../../src/renderer/src/api/client'
import { normalizeSettings } from '../../src/renderer/src/settingsModel'

describe('interface size', () => {
  it('steps up and down and stops at the ends', () => {
    expect(stepScale(1, 'in')).toBe(1.1)
    expect(stepScale(1, 'out')).toBe(0.9)
    expect(stepScale(2, 'in')).toBe(2)
    expect(stepScale(0.75, 'out')).toBe(0.75)
    expect(stepScale(1.5, 'reset')).toBe(1)
  })
  it('moves from a saved value that is not a step to the nearest one first', () => {
    expect(nearestStep(1.12)).toBe(1.1)
    expect(stepScale(1.12, 'in')).toBe(1.25)
  })
  it('reads Ctrl or Cmd with + - 0, and nothing else', () => {
    const k = (key: string, over = {}) => zoomKeyOf({ key, control: true, meta: false, alt: false, ...over })
    expect(k('=')).toBe('in')
    expect(k('+')).toBe('in')
    expect(k('-')).toBe('out')
    expect(k('0')).toBe('reset')
    expect(k('a')).toBeNull()
    expect(k('=', { control: false })).toBeNull()
    expect(k('=', { control: false, meta: true })).toBe('in')
    expect(k('=', { alt: true })).toBeNull()
  })
  it('keeps a saved scale only when it is a sensible number', () => {
    expect(normalizeSettings({ scale: 1.25 }).scale).toBe(1.25)
    expect(normalizeSettings({ scale: 40 }).scale).toBe(1)
    expect(normalizeSettings({ scale: 'big' }).scale).toBe(1)
  })
})

describe('back swipes', () => {
  it('starts only at an edge', () => {
    expect(edgeSide(5, 800)).toBe('left')
    expect(edgeSide(796, 800)).toBe('right')
    expect(edgeSide(400, 800)).toBeNull()
  })
  it('measures the way toward the middle from each side, and gives up on up-and-down moves', () => {
    expect(swipeProgress('left', { x: 4, y: 100 }, { x: 120, y: 110 })).toBe(116)
    expect(swipeProgress('right', { x: 796, y: 100 }, { x: 700, y: 105 })).toBe(96)
    expect(swipeProgress('left', { x: 4, y: 100 }, { x: 20, y: 300 })).toBeNull()
    expect(swipeProgress('left', { x: 4, y: 100 }, { x: -30, y: 100 })).toBe(0)
  })
  it('goes back after enough two-finger travel to the right, once per swipe', () => {
    let state: WheelSwipe = { total: 0, at: 0, fired: false }
    let backs = 0
    for (let i = 0; i < 12; i++) {
      const r = wheelSwipe(state, { deltaX: -40, deltaY: 2, time: 1000 + i * 16 })
      state = r.state
      if (r.back) backs++
    }
    expect(backs).toBe(1) // the momentum after it fired does nothing
    const next = wheelSwipe(state, { deltaX: -40, deltaY: 0, time: 1000 + 12 * 16 + 400 }) // a new swipe starts after a pause
    expect(next.state.fired).toBe(false)
  })
  it('ignores up-and-down scrolling, scrolling to the left, and short swipes', () => {
    let state: WheelSwipe = { total: 0, at: 0, fired: false }
    for (let i = 0; i < 30; i++) {
      const r = wheelSwipe(state, { deltaX: -10, deltaY: 40, time: 1000 + i * 16 })
      state = r.state
      expect(r.back).toBe(false)
    }
    const left = wheelSwipe({ total: 0, at: 5000, fired: false }, { deltaX: 400, deltaY: 0, time: 5010 })
    expect(left.back).toBe(false)
    expect(wheelSwipe({ total: 0, at: 6000, fired: false }, { deltaX: -100, deltaY: 0, time: 6010 }).back).toBe(false)
  })
})

describe('seasons', () => {
  it('knows its weeks', () => {
    expect(seasonFor(new Date(2026, 1, 10))?.id).toBe('valentines')
    expect(seasonFor(new Date(2026, 1, 15))).toBeNull()
    expect(seasonFor(new Date(2026, 9, 31))?.id).toBe('halloween')
    expect(seasonFor(new Date(2026, 11, 25))?.id).toBe('christmas')
    expect(seasonFor(new Date(2026, 5, 1))).toBeNull()
  })
})

describe('lean grid queries', () => {
  it('leave out overviews and ask for the count only on the first page', () => {
    const first = new URLSearchParams(itemsQuery({ userId: 'u' }, { lean: true }))
    expect(first.get('Fields')).toBe('ProductionYear,OfficialRating,RunTimeTicks')
    expect(first.get('EnableTotalRecordCount')).toBe('true')
    expect(new URLSearchParams(itemsQuery({ userId: 'u' }, { lean: true, start: 48 })).get('EnableTotalRecordCount')).toBe('false')
    expect(new URLSearchParams(itemsQuery({ userId: 'u' }, {})).get('Fields')).toContain('Overview')
  })
  it('asks for tags', () => {
    expect(new URLSearchParams(itemsQuery({ userId: 'u' }, { tags: ['christmas', 'xmas'] })).get('Tags')).toBe('christmas|xmas')
  })
})
