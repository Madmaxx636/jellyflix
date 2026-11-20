import { useEffect, useEffectEvent, useState } from 'react'
import type { Api, Item } from '../../api/jellyfin'
import type { PlayerWords } from '../../theme'
import Icon from '../Icon'

const COUNTDOWN_FROM = 5

/**
 * "Next episode in 5", shown when the credits start. Clicking it goes now; the cross dismisses it. With `autoplay` it counts
 * down and goes by itself. The count lives here, so it starts afresh with every card and a count left over from the
 * previous episode can never trigger a second jump.
 */
export default function NextEpisodeCard({ api, episode, autoplay, say, onPlay, onDismiss }: {
  api: Api
  episode: Item
  autoplay: boolean
  say: PlayerWords
  onPlay: () => void
  onDismiss: () => void
}) {
  const [left, setLeft] = useState<number | null>(autoplay ? COUNTDOWN_FROM : null)
  const go = useEffectEvent(onPlay)

  useEffect(() => {
    if (!autoplay) return
    let remaining = COUNTDOWN_FROM
    const timer = window.setInterval(() => {
      remaining -= 1
      setLeft(remaining)
      if (remaining <= 0) { clearInterval(timer); go() }
    }, 1000)
    return () => clearInterval(timer)
  }, [autoplay])

  return (
    <div className="pc-next" data-countdown={left ?? ''}>
      <button className="pc-next-x" aria-label={say.watchCredits} title={say.watchCredits} onClick={onDismiss}><Icon name="x" size={16} /></button>
      <button className="pc-next-body" data-act="next" onClick={onPlay}>
        {episode.ImageTags?.Primary ? <img src={api.image(episode.Id, episode.ImageTags.Primary, 320)} alt="" /> : <span className="ph"><Icon name="play" size={22} /></span>}
        <span>
          <small>{say.nextCard(left)}</small>
          <b>S{episode.ParentIndexNumber}:E{episode.IndexNumber} {episode.Name}</b>
        </span>
      </button>
    </div>
  )
}
