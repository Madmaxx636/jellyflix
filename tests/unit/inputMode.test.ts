import { describe, expect, it } from 'vitest'
import { chooseInputMode } from '../../src/renderer/src/inputMode'

describe('chooseInputMode', () => {
  it('is fixed when set to on or off', () => {
    expect(chooseInputMode('on', 'mouse', false)).toBe('touch')
    expect(chooseInputMode('off', 'touch', true)).toBe('mouse')
  })

  it('follows what was used last in auto', () => {
    expect(chooseInputMode('auto', 'touch', false)).toBe('touch')
    expect(chooseInputMode('auto', 'mouse', true)).toBe('mouse')
    expect(chooseInputMode('auto', 'pen', true)).toBe('mouse')
  })

  it("goes by the device's main pointer before anything has been used", () => {
    expect(chooseInputMode('auto', null, true)).toBe('touch') // a tablet
    expect(chooseInputMode('auto', null, false)).toBe('mouse') // a laptop, even with a touch screen
  })
})
