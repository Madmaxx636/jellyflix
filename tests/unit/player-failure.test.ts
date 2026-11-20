import { describe, expect, it } from 'vitest'
import { describeStreamFailure, isRefusal } from '../../src/renderer/src/components/player/failure'

describe('isRefusal', () => {
  it('is true when the server answered and said no', () => {
    for (const code of [401, 403, 404]) expect(isRefusal({ type: 'networkError', details: 'x', response: { code } })).toBe(true)
  })

  it('is false for a dropped connection or a server error, which may pass', () => {
    expect(isRefusal({ type: 'networkError', details: 'x' })).toBe(false)
    expect(isRefusal({ type: 'networkError', details: 'x', response: { code: 503 } })).toBe(false)
  })
})

describe('describeStreamFailure', () => {
  it('says when the sign-in has ended', () => {
    expect(describeStreamFailure({ type: 'networkError', details: 'manifestLoadError', response: { code: 401 } })).toMatch(/sign in again/)
  })

  it('says when the stream does not exist', () => {
    expect(describeStreamFailure({ type: 'networkError', details: 'manifestLoadError', response: { code: 404 } })).toMatch(/404/)
  })

  it('points at the transcoding log for server errors', () => {
    expect(describeStreamFailure({ type: 'networkError', details: 'fragLoadError', response: { code: 500 } })).toMatch(/500.*transcoding/s)
  })

  it('describes lost connections and undecodable video', () => {
    expect(describeStreamFailure({ type: 'networkError', details: 'fragLoadError' })).toMatch(/connection/)
    expect(describeStreamFailure({ type: 'mediaError', details: 'bufferAppendError' })).toMatch(/decoded/)
  })

  it('names the problem when it has nothing better to say', () => {
    expect(describeStreamFailure({ type: 'otherError', details: 'internalException' })).toMatch(/internalException/)
  })
})
