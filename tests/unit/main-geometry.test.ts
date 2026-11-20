import { describe, expect, it } from 'vitest'
import { DEFAULT_WINDOW, isReachable, parseSavedWindow, placeWindow } from '../../src/main/geometry'

const screen = { x: 0, y: 0, width: 1920, height: 1080 }

describe('isReachable', () => {
  it('is true for a window on a screen', () => {
    expect(isReachable({ x: 100, y: 100, width: 1400, height: 860 }, [screen])).toBe(true)
  })

  it('is false once the window has been left on a screen that is gone', () => {
    expect(isReachable({ x: 2200, y: 100, width: 1400, height: 860 }, [screen])).toBe(false)
  })

  it('is false when only a sliver shows', () => {
    expect(isReachable({ x: 1900, y: 100, width: 1400, height: 860 }, [screen])).toBe(false)
  })

  it('is true when it is on the second of two screens', () => {
    const right = { x: 1920, y: 0, width: 1920, height: 1080 }
    expect(isReachable({ x: 2200, y: 100, width: 1400, height: 860 }, [screen, right])).toBe(true)
  })
})

describe('parseSavedWindow', () => {
  it('reads a saved window', () => {
    expect(parseSavedWindow({ x: 10, y: 20, width: 1200.4, height: 700, maximized: true })).toEqual({ x: 10, y: 20, width: 1200, height: 700, maximized: true })
  })

  it('works without a position', () => {
    expect(parseSavedWindow({ width: 1000, height: 700 })).toEqual({ width: 1000, height: 700, maximized: false })
  })

  it('ignores anything that is not a sensible window', () => {
    expect(parseSavedWindow(null)).toBeNull()
    expect(parseSavedWindow('x')).toBeNull()
    expect(parseSavedWindow({ width: 100, height: 100 })).toBeNull()
    expect(parseSavedWindow({ width: 'wide', height: 700 })).toBeNull()
    expect(parseSavedWindow({ width: 1e9, height: 700 })).toBeNull()
    expect(parseSavedWindow({ width: NaN, height: 700 })).toBeNull()
  })
})

describe('placeWindow', () => {
  it('uses the defaults when nothing was saved', () => {
    expect(placeWindow(null, [screen])).toEqual(DEFAULT_WINDOW)
  })

  it('keeps a saved spot that is still on a screen', () => {
    const saved = { x: 50, y: 60, width: 1300, height: 800, maximized: false }
    expect(placeWindow(saved, [screen])).toEqual(saved)
  })

  it('keeps the size but lets the system choose the place when the screen is gone', () => {
    expect(placeWindow({ x: 4000, y: 60, width: 1300, height: 800, maximized: true }, [screen])).toEqual({ width: 1300, height: 800, maximized: true })
  })
})
