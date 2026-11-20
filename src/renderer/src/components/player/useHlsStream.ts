import { useEffect, useRef, type RefObject } from 'react'
import HlsPlayer, { ErrorDetails, ErrorTypes, Events } from 'hls.js'
import { describeStreamFailure, isRefusal } from './failure'

const RETRIES = 3

/**
 * Plays an HLS stream in a video element. Whenever `src` changes (another audio track, another quality) a new stream is
 * loaded and carries on from where the last one stopped. A hiccup in the network or in decoding is retried a few times
 * before the viewer is told; a refusal from the server is reported straight away.
 */
export function useHlsStream({ video, src, initialTime, speed, onFatal }: {
  video: RefObject<HTMLVideoElement | null>
  src: string
  /** Where to start the very first stream, in seconds. */
  initialTime: number
  speed: number
  onFatal: (message: string) => void
}) {
  const resumeAt = useRef(initialTime)
  const latest = useRef({ speed, onFatal })
  useEffect(() => { latest.current = { speed, onFatal } })

  useEffect(() => {
    const el = video.current
    if (!el) return
    const hls = new HlsPlayer({ startPosition: resumeAt.current > 1 ? resumeAt.current : -1 })
    let networkTries = 0
    let mediaTries = 0
    hls.on(Events.MANIFEST_PARSED, () => {
      el.playbackRate = latest.current.speed
      el.play().catch(() => { /* the viewer can press play */ })
    })
    hls.on(Events.FRAG_LOADED, () => { networkTries = 0; mediaTries = 0 })
    hls.on(Events.ERROR, (_event, data) => {
      if (!data.fatal) return
      if (data.type === ErrorTypes.NETWORK_ERROR && !isRefusal(data) && networkTries < RETRIES) {
        networkTries++
        if (data.details === ErrorDetails.MANIFEST_LOAD_ERROR || data.details === ErrorDetails.MANIFEST_LOAD_TIMEOUT) hls.loadSource(src)
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
    hls.loadSource(src)
    hls.attachMedia(el)
    return () => {
      if (el.readyState > 0) resumeAt.current = el.currentTime // a stream still loading has no position yet: keep the old one
      hls.destroy()
    }
  }, [video, src])
}
