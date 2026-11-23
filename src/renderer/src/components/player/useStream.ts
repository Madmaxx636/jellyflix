import { useEffect, useRef, type RefObject } from 'react'
import HlsPlayer, { ErrorDetails, ErrorTypes, Events } from 'hls.js'
import type { Playback } from '../../api/jellyfin'
import { describeStreamFailure, isRefusal } from './failure'

const RETRIES = 3

/**
 * Plays a stream in a video element: the file itself, or an HLS stream. Whenever `url` changes (another audio track, another
 * quality) a new one is loaded and carries on from where the last one stopped. A hiccup in the network or in decoding is
 * retried a few times before the viewer is told; a refusal from the server is reported straight away. A file that the video
 * element can't play calls `onFileFailed`, so the caller can ask the server to convert it instead.
 */
export function useStream({ video, url, kind, initialTime, speed, onFatal, onFileFailed }: {
  video: RefObject<HTMLVideoElement | null>
  url: string
  kind: Playback['kind']
  /** Where to start the very first stream, in seconds. */
  initialTime: number
  speed: number
  onFatal: (message: string) => void
  onFileFailed: () => void
}) {
  const resumeAt = useRef(initialTime)
  const latest = useRef({ speed, onFatal, onFileFailed })
  useEffect(() => { latest.current = { speed, onFatal, onFileFailed } })

  useEffect(() => {
    const el = video.current
    if (!el) return
    const begin = () => {
      if (resumeAt.current > 1) el.currentTime = resumeAt.current
      el.playbackRate = latest.current.speed
      el.play().catch(() => { /* the viewer can press play */ })
    }
    const remember = () => { if (el.readyState > 0) resumeAt.current = el.currentTime } // a stream still loading has no position yet: keep the old one

    if (kind === 'file') {
      const failed = () => latest.current.onFileFailed()
      el.addEventListener('loadedmetadata', begin, { once: true })
      el.addEventListener('error', failed, { once: true })
      // oxlint-disable-next-line react/immutability -- a video element is driven imperatively: setting its src is the API
      el.src = url
      return () => {
        el.removeEventListener('loadedmetadata', begin)
        el.removeEventListener('error', failed)
        remember()
        el.removeAttribute('src')
        el.load()
      }
    }

    const hls = new HlsPlayer({
      startPosition: resumeAt.current > 1 ? resumeAt.current : -1,
      // The server may need a few seconds to start converting before the first piece exists, and after a seek it starts over.
      manifestLoadingTimeOut: 30_000,
      levelLoadingTimeOut: 30_000,
      fragLoadingTimeOut: 40_000,
      fragLoadingMaxRetry: 4,
      maxBufferLength: 60,
      maxMaxBufferLength: 120,
      backBufferLength: 90,
      nudgeMaxRetry: 8,
      lowLatencyMode: false
    })
    let networkTries = 0
    let mediaTries = 0
    hls.on(Events.MANIFEST_PARSED, begin)
    hls.on(Events.FRAG_LOADED, () => { networkTries = 0; mediaTries = 0 })
    hls.on(Events.ERROR, (_event, data) => {
      if (!data.fatal) return
      if (data.type === ErrorTypes.NETWORK_ERROR && !isRefusal(data) && networkTries < RETRIES) {
        networkTries++
        if (data.details === ErrorDetails.MANIFEST_LOAD_ERROR || data.details === ErrorDetails.MANIFEST_LOAD_TIMEOUT) hls.loadSource(url)
        else hls.startLoad()
        return
      }
      if (data.type === ErrorTypes.MEDIA_ERROR && mediaTries < RETRIES) {
        mediaTries++
        hls.recoverMediaError()
        return
      }
      latest.current.onFatal(describeStreamFailure(data))
    })
    hls.loadSource(url)
    hls.attachMedia(el)
    return () => {
      remember()
      hls.destroy()
    }
  }, [video, url, kind])
}
