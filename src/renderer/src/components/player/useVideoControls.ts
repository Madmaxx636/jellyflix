import { useCallback, type RefObject } from 'react'

/** Play/pause and moving about in the video element. The functions keep their identity from one render to the next. */
export function useVideoControls(video: RefObject<HTMLVideoElement | null>) {
  const seek = useCallback((seconds: number) => {
    const el = video.current
    // oxlint-disable-next-line react/immutability -- a video element is driven imperatively: setting its own currentTime is the API
    if (el) el.currentTime = Math.max(0, Number.isFinite(el.duration) ? Math.min(seconds, el.duration) : seconds)
  }, [video])

  /** Moves forward (or back, when negative) from where the video is now. */
  const bump = useCallback((by: number) => seek((video.current?.currentTime ?? 0) + by), [seek, video])

  const toggle = useCallback(() => {
    const el = video.current
    if (!el) return
    if (el.paused) el.play().catch(() => { /* the viewer can press play */ })
    else el.pause()
  }, [video])

  return { seek, bump, toggle }
}
