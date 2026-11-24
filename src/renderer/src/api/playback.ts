// Asking Jellyfin how to play a title. We tell it what this player can decode; it answers with the file to play as it is,
// or the address of a stream it converts, and which of the two it picked.
import { detectCapabilities, type Capabilities } from './capabilities'
import type { MediaSource, Playback, PlaybackInfoResponse, PlaybackOptions } from './types'

const list = (...v: string[]) => v.join(',')
const some = (have: string[], want: string[]) => want.filter(c => have.includes(c))

/** The device profile: what the video element here can play as it is. Anything else the server converts, if that is allowed. */
export function deviceProfile(caps: Capabilities = detectCapabilities()) {
  const v = (...want: string[]) => list(...some(caps.video, want))
  const a = (...want: string[]) => list(...some(caps.audio, want))
  return {
    Name: 'Jellyflix',
    MaxStreamingBitrate: 120_000_000,
    MaxStaticBitrate: 100_000_000,
    MusicStreamingTranscodingBitrate: 192_000,
    DirectPlayProfiles: [
      { Container: 'mp4,m4v,mov', Type: 'Video', VideoCodec: v('h264', 'hevc', 'vp9', 'av1'), AudioCodec: a('aac', 'mp3', 'opus', 'flac', 'ac3', 'eac3') },
      { Container: 'webm', Type: 'Video', VideoCodec: v('vp8', 'vp9', 'av1'), AudioCodec: a('vorbis', 'opus') },
      { Container: 'mkv', Type: 'Video', VideoCodec: v('h264', 'hevc', 'vp9', 'av1'), AudioCodec: a('aac', 'mp3', 'opus', 'flac', 'vorbis', 'ac3', 'eac3') }
    ],
    TranscodingProfiles: [
      { Container: 'ts', Type: 'Video', AudioCodec: a('aac', 'mp3'), VideoCodec: v('h264'), Context: 'Streaming', Protocol: 'hls', MaxAudioChannels: '2', MinSegments: '1', BreakOnNonKeyFrames: true }
    ],
    CodecProfiles: [
      {
        Type: 'Video', Codec: 'h264',
        Conditions: [
          { Condition: 'NotEquals', Property: 'IsAnamorphic', Value: 'true', IsRequired: false },
          { Condition: 'EqualsAny', Property: 'VideoProfile', Value: 'high|main|baseline|constrained baseline', IsRequired: false },
          { Condition: 'LessThanEqual', Property: 'VideoLevel', Value: '52', IsRequired: false },
          { Condition: 'LessThanEqual', Property: 'VideoBitDepth', Value: '8', IsRequired: false }
        ]
      }
    ],
    ContainerProfiles: [],
    SubtitleProfiles: [
      { Format: 'vtt', Method: 'External' }, { Format: 'srt', Method: 'External' }, { Format: 'subrip', Method: 'External' },
      { Format: 'ass', Method: 'External' }, { Format: 'ssa', Method: 'External' },
      { Format: 'pgssub', Method: 'Encode' }, { Format: 'dvdsub', Method: 'Encode' }, { Format: 'dvbsub', Method: 'Encode' }
    ]
  }
}

/** The body of the PlaybackInfo request. */
export function playbackRequest(userId: string, o: PlaybackOptions, caps?: Capabilities) {
  const direct = o.direct !== false
  return {
    UserId: userId,
    DeviceProfile: deviceProfile(caps),
    ...(o.bitrate ? { MaxStreamingBitrate: o.bitrate + 192_000 } : {}),
    ...(o.audio != null ? { AudioStreamIndex: o.audio } : {}),
    ...(o.subtitle != null ? { SubtitleStreamIndex: o.subtitle } : {}),
    EnableDirectPlay: direct && !o.bitrate && o.subtitle == null,
    EnableDirectStream: direct,
    EnableTranscoding: o.convert !== false,
    AllowVideoStreamCopy: true,
    AllowAudioStreamCopy: true,
    AutoOpenLiveStream: false
  }
}

const REFUSALS: Record<string, string> = {
  NotAllowed: "This account isn't allowed to play this title.",
  NoCompatibleStream: "The server can't make a stream from this file that this app can play.",
  RateLimitExceeded: 'Too many streams are playing on this account.'
}

/**
 * Turns the server's answer into something to play. Null when the server gave no stream address and the file can't be played
 * as it is (an older server): the caller then asks for HLS the long way.
 */
export function planPlayback(ctx: { server: string; token: string; deviceId: string; id: string }, info: PlaybackInfoResponse, asked: PlaybackOptions): Playback | null {
  const source: MediaSource | undefined = info.MediaSources?.[0]
  if (!source) throw new Error(info.ErrorCode ? (REFUSALS[info.ErrorCode] ?? `The server would not play this (${info.ErrorCode}).`) : 'The server has nothing to play for this title.')
  const playSessionId = info.PlaySessionId ?? ''
  const key = `ApiKey=${encodeURIComponent(ctx.token)}`

  if (source.SupportsDirectPlay && asked.direct !== false && asked.bitrate == null && asked.subtitle == null) {
    const q = new URLSearchParams({ static: 'true', MediaSourceId: source.Id, PlaySessionId: playSessionId, DeviceId: ctx.deviceId })
    if (source.ETag) q.set('Tag', source.ETag)
    return { playSessionId, source, url: `${ctx.server}/Videos/${encodeURIComponent(ctx.id)}/stream?${q}&${key}`, kind: 'file', method: 'DirectPlay', asked }
  }
  if (source.TranscodingUrl) {
    let url = /^https?:/i.test(source.TranscodingUrl) ? source.TranscodingUrl : ctx.server + (source.TranscodingUrl.startsWith('/') ? '' : '/') + source.TranscodingUrl
    if (!/[?&](ApiKey|api_key)=/i.test(url)) url += `${url.includes('?') ? '&' : '?'}${key}`
    const hls = source.TranscodingSubProtocol === 'hls' || /\.m3u8(\?|$)/i.test(url)
    return { playSessionId, source, url, kind: hls ? 'hls' : 'file', method: source.SupportsDirectStream ? 'DirectStream' : 'Transcode', asked }
  }
  return null
}
