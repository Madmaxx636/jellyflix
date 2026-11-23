import { describe, expect, it } from 'vitest'
import { planPlayback, playbackRequest } from '../../src/renderer/src/api/playback'
import type { MediaSource } from '../../src/renderer/src/api/types'

const ctx = { server: 'http://nas:8096', token: 'tok en', deviceId: 'dev1', id: 'item/1' }
const source = (extra: Partial<MediaSource> = {}): MediaSource => ({ Id: 'ms', ETag: 'etag', ...extra })

describe('playbackRequest', () => {
  it('tells the server what this player can decode and lets it choose', () => {
    const b = playbackRequest('u1', {})
    expect(b.UserId).toBe('u1')
    expect(b.EnableDirectPlay).toBe(true)
    expect(b.EnableTranscoding).toBe(true)
    expect(b.DeviceProfile.TranscodingProfiles[0]).toMatchObject({ Protocol: 'hls', VideoCodec: 'h264' })
    expect(b.DeviceProfile.DirectPlayProfiles.map(p => p.Container).join()).toContain('mkv')
  })

  it('carries the chosen audio track, picture subtitle and quality', () => {
    const b = playbackRequest('u1', { audio: 2, subtitle: 5, bitrate: 4_000_000 })
    expect(b).toMatchObject({ AudioStreamIndex: 2, SubtitleStreamIndex: 5, MaxStreamingBitrate: 4_192_000 })
  })

  it('does not ask to play the file as it is when a quality or a burned-in subtitle needs a converted stream', () => {
    expect(playbackRequest('u', { bitrate: 1_500_000 }).EnableDirectPlay).toBe(false)
    expect(playbackRequest('u', { subtitle: 3 }).EnableDirectPlay).toBe(false)
  })

  it('does not ask for direct play or stream once playing the file has failed', () => {
    const b = playbackRequest('u', { direct: false })
    expect(b.EnableDirectPlay).toBe(false)
    expect(b.EnableDirectStream).toBe(false)
  })
})

describe('planPlayback', () => {
  it('plays the file as it is when the server says it can be', () => {
    const plan = planPlayback(ctx, { PlaySessionId: 'ps', MediaSources: [source({ SupportsDirectPlay: true })] }, {})
    expect(plan?.kind).toBe('file')
    expect(plan?.method).toBe('DirectPlay')
    const url = new URL(plan?.url ?? '')
    expect(url.pathname).toBe('/Videos/item%2F1/stream')
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ static: 'true', MediaSourceId: 'ms', PlaySessionId: 'ps', DeviceId: 'dev1', Tag: 'etag', ApiKey: 'tok en' })
  })

  it("uses the server's stream address when it has to convert, and adds the key if the address has none", () => {
    const plan = planPlayback(ctx, { PlaySessionId: 'ps', MediaSources: [source({ SupportsDirectStream: true, TranscodingUrl: '/videos/x/master.m3u8?VideoCodec=h264', TranscodingSubProtocol: 'hls' })] }, {})
    expect(plan).toMatchObject({ kind: 'hls', method: 'DirectStream' })
    expect(plan?.url.startsWith('http://nas:8096/videos/x/master.m3u8?VideoCodec=h264&ApiKey=tok%20en')).toBe(true)
  })

  it('leaves a key the server already put in the address alone', () => {
    const plan = planPlayback(ctx, { MediaSources: [source({ TranscodingUrl: '/videos/x/master.m3u8?api_key=abc' })] }, {})
    expect(plan?.url).toBe('http://nas:8096/videos/x/master.m3u8?api_key=abc')
    expect(plan?.method).toBe('Transcode')
  })

  it('converts instead of playing the file when playing it failed or a quality was asked for', () => {
    const both = source({ SupportsDirectPlay: true, TranscodingUrl: '/videos/x/master.m3u8?a=1' })
    expect(planPlayback(ctx, { MediaSources: [both] }, { direct: false })?.kind).toBe('hls')
    expect(planPlayback(ctx, { MediaSources: [both] }, { bitrate: 4_000_000 })?.kind).toBe('hls')
  })

  it('gives null when an older server gave no stream address', () => {
    expect(planPlayback(ctx, { PlaySessionId: 'ps', MediaSources: [source()] }, {})).toBeNull()
  })

  it('says why in plain words when the server refuses', () => {
    expect(() => planPlayback(ctx, { ErrorCode: 'NoCompatibleStream' }, {})).toThrow(/can't make a stream/)
    expect(() => planPlayback(ctx, { ErrorCode: 'NotAllowed' }, {})).toThrow(/isn't allowed/)
    expect(() => planPlayback(ctx, { ErrorCode: 'Odd' }, {})).toThrow(/Odd/)
    expect(() => planPlayback(ctx, {}, {})).toThrow(/nothing to play/)
  })
})
