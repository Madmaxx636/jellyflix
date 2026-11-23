import { describe, expect, it } from 'vitest'
import { isNewer } from '../../src/shared/updates'

describe('isNewer', () => {
  it('compares versions number by number', () => {
    expect(isNewer('0.2.0', '0.1.3')).toBe(true)
    expect(isNewer('0.1.10', '0.1.9')).toBe(true)
    expect(isNewer('1.0.0', '0.99.99')).toBe(true)
    expect(isNewer('0.1.3', '0.1.3')).toBe(false)
    expect(isNewer('0.1.2', '0.1.3')).toBe(false)
  })

  it('ignores a leading v, as in a tag', () => {
    expect(isNewer('v0.2.0', '0.1.3')).toBe(true)
    expect(isNewer('v0.1.3', '0.1.3')).toBe(false)
  })

  it('puts a release above its own pre-release', () => {
    expect(isNewer('1.0.0', '1.0.0-beta.1')).toBe(true)
    expect(isNewer('1.0.0-beta.1', '1.0.0')).toBe(false)
    expect(isNewer('1.0.0-beta.2', '1.0.0-beta.1')).toBe(true)
  })

  it('says no to anything that is not a version', () => {
    expect(isNewer('latest', '0.1.3')).toBe(false)
    expect(isNewer('0.2.0', 'dev')).toBe(false)
    expect(isNewer('', '')).toBe(false)
  })
})
