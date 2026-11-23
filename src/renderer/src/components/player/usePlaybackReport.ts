import { useEffect, type RefObject } from 'react'
import type { Api, Playback } from '../../api/jellyfin'

const PROGRESS_EVERY_MS = 10_000

/**
 * Tells Jellyfin what is playing and how far in, so Continue Watching and watched marks stay right: once at the start,
 * every ten seconds, and once more at the end. Closing the window never runs a page's own clean-up, so the last report is
 * also sent when the page is hidden, in a request the browser finishes even as the page goes away.
 */
export function usePlaybackReport(api: Api, id: string, plan: Playback, video: RefObject<HTMLVideoElement | null>, position: RefObject<number>) {
  useEffect(() => {
    const body = () => ({
      ItemId: id, MediaSourceId: plan.source.Id, PlaySessionId: plan.playSessionId,
      PositionTicks: Math.floor(position.current * 1e7), IsPaused: !!video.current?.paused, PlayMethod: plan.method
    })
    let stopped = false
    const stop = (init: RequestInit) => {
      if (stopped) return
      stopped = true
      api.report('Stopped', body(), init)
    }
    api.report('Playing', body())
    const timer = window.setInterval(() => api.report('Progress', body()), PROGRESS_EVERY_MS)
    const onPageHide = () => stop({ keepalive: true })
    window.addEventListener('pagehide', onPageHide)
    return () => {
      clearInterval(timer)
      window.removeEventListener('pagehide', onPageHide)
      stop({})
    }
  }, [api, id, plan, video, position])
}
