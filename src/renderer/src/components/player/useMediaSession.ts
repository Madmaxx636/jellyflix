import { useEffect, type RefObject } from 'react'

const SKIP_SECONDS = 10

/** Lets the system's media keys, lock screen and "now playing" panel show and control what is playing. */
export function useMediaSession({ title, subtitle, artwork, video, onNext }: {
  title: string
  subtitle: string
  artwork: string
  video: RefObject<HTMLVideoElement | null>
  /** Null when there is no next episode. Must not change from one render to the next unless the episode does. */
  onNext: (() => void) | null
}) {
  useEffect(() => {
    const session = navigator.mediaSession
    session.metadata = new MediaMetadata({ title, artist: subtitle, artwork: artwork ? [{ src: artwork }] : [] })
    const move = (by: number) => { if (video.current) video.current.currentTime += by }
    const handlers: [MediaSessionAction, MediaSessionActionHandler | null][] = [
      ['play', () => { void video.current?.play() }],
      ['pause', () => video.current?.pause()],
      ['seekbackward', () => move(-SKIP_SECONDS)],
      ['seekforward', () => move(SKIP_SECONDS)],
      ['nexttrack', onNext]
    ]
    for (const [action, handler] of handlers) {
      try { session.setActionHandler(action, handler) } catch { /* this action isn't supported here */ }
    }
    return () => {
      for (const [action] of handlers) {
        try { session.setActionHandler(action, null) } catch { /* as above */ }
      }
      session.metadata = null
    }
  }, [title, subtitle, artwork, video, onNext])
}
