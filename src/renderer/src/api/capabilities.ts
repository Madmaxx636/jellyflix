// What this player's decoders can handle, found by asking the browser engine, so the server only converts what it must.
// A build of the app with a fuller set of decoders (see the README) is picked up here without any change.

export interface Capabilities {
  video: string[]
  audio: string[]
}

const VIDEO_TESTS: [name: string, mime: string][] = [
  ['h264', 'video/mp4; codecs="avc1.640028"'],
  ['hevc', 'video/mp4; codecs="hvc1.1.6.L120.90"'],
  ['vp8', 'video/webm; codecs="vp8"'],
  ['vp9', 'video/webm; codecs="vp09.00.10.08"'],
  ['av1', 'video/mp4; codecs="av01.0.05M.08"']
]
const AUDIO_TESTS: [name: string, mime: string][] = [
  ['aac', 'audio/mp4; codecs="mp4a.40.2"'],
  ['mp3', 'audio/mpeg'],
  ['opus', 'audio/webm; codecs="opus"'],
  ['flac', 'audio/flac'],
  ['vorbis', 'audio/webm; codecs="vorbis"'],
  ['ac3', 'audio/mp4; codecs="ac-3"'],
  ['eac3', 'audio/mp4; codecs="ec-3"'],
  ['dts', 'audio/mp4; codecs="dtsc"']
]

/** What the baseline browser engine plays; used when there is no page to ask (tests) or the asking fails. */
export const BASELINE: Capabilities = { video: ['h264', 'vp8', 'vp9', 'av1'], audio: ['aac', 'mp3', 'opus', 'flac', 'vorbis'] }

let cached: Capabilities | null = null

/** Asks the video element which codecs it plays. The answer is kept: it can't change while the app runs. */
export function detectCapabilities(): Capabilities {
  if (cached) return cached
  if (typeof document === 'undefined') return BASELINE
  try {
    const el = document.createElement('video')
    const supported = (mime: string) => el.canPlayType(mime) !== ''
    const video = VIDEO_TESTS.filter(([, mime]) => supported(mime)).map(([name]) => name)
    const audio = AUDIO_TESTS.filter(([, mime]) => supported(mime)).map(([name]) => name)
    cached = video.length && audio.length ? { video, audio } : BASELINE
  } catch { cached = BASELINE }
  return cached
}
