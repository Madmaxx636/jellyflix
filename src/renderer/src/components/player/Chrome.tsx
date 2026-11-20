import type { ReactNode } from 'react'
import type { Segment } from '../../api/jellyfin'
import type { PlayerControl, PlayerLayout, PlayerWords } from '../../theme'
import { clock } from '../../util/time'
import Icon, { type IconName } from '../Icon'
import type { OpenMenu, Menu } from './constants'
import Scrubber from './Scrubber'

export interface ChromeState {
  playing: boolean
  muted: boolean
  volume: number
  time: number
  duration: number
  buffered: number
  fullscreen: boolean
  menu: Menu
}

export interface ChromeActions {
  back: () => void
  toggle: () => void
  bump: (seconds: number) => void
  seek: (seconds: number) => void
  mute: () => void
  setVolume: (volume: number) => void
  next: () => void
  /** Opens (or closes) a pop-up. The button it came from tells where to put the pop-up. */
  menu: (menu: OpenMenu, from: HTMLElement) => void
  fullscreen: () => void
}

const SKIP_SECONDS = 10

/**
 * What sits over the picture: the top bar, and the bar with the progress line and the controls. Which controls there are,
 * where they are, and where the title and the clocks go is up to the look (see `PlayerLayout` in theme.tsx).
 */
export default function Chrome({ layout, say, episodesLabel, heading, state, available, segments, on }: {
  layout: PlayerLayout
  say: PlayerWords
  episodesLabel: string
  heading: { name: string; detail: string }
  state: ChromeState
  /** Which of the optional controls make sense for what is playing. */
  available: { next: boolean; episodes: boolean; tracks: boolean }
  segments: Segment[]
  on: ChromeActions
}) {
  const remaining = Math.max(0, state.duration - state.time)

  const opener = (menu: OpenMenu, label: string, icon: IconName) => (
    <button key={menu} className="pc-btn" data-act={menu} aria-label={label} title={label} aria-expanded={state.menu === menu} onClick={e => on.menu(menu, e.currentTarget)}>
      <Icon name={icon} />
    </button>
  )

  const control = (id: PlayerControl): ReactNode => {
    switch (id) {
      case 'play': {
        const label = state.playing ? 'Pause' : 'Play'
        return <button key={id} className="pc-btn play" data-act="play" aria-label={label} title={label} onClick={on.toggle}><Icon name={state.playing ? 'pause' : 'play'} /></button>
      }
      case 'back10':
        return <button key={id} className="pc-btn" data-act="back10" aria-label="Back 10 seconds" title="Back 10 seconds" onClick={() => on.bump(-SKIP_SECONDS)}><Icon name="back10" /></button>
      case 'fwd10':
        return <button key={id} className="pc-btn" data-act="fwd10" aria-label="Forward 10 seconds" title="Forward 10 seconds" onClick={() => on.bump(SKIP_SECONDS)}><Icon name="fwd10" /></button>
      case 'volume':
        return (
          <div key={id} className="pc-volume">
            <button className="pc-btn" data-act="mute" aria-label={state.muted ? 'Unmute' : 'Mute'} title={state.muted ? 'Unmute' : 'Mute'} aria-pressed={state.muted} onClick={on.mute}>
              <Icon name={state.muted || state.volume === 0 ? 'mute' : 'volume'} />
            </button>
            <input className="pc-vol" type="range" min={0} max={1} step={0.05} value={state.muted ? 0 : state.volume} aria-label="Volume" onChange={e => on.setVolume(Number(e.target.value))} />
          </div>
        )
      case 'next':
        return available.next
          ? <button key={id} className="pc-btn" data-act="next" aria-label={say.next} title={say.next} onClick={on.next}><Icon name="next" /></button>
          : null
      case 'episodes': return available.episodes ? opener('episodes', episodesLabel, 'episodes') : null
      case 'tracks': return available.tracks ? opener('tracks', say.audioSubtitles, 'speech') : null
      case 'speed': return opener('speed', say.speed, 'speed')
      case 'settings': return opener('settings', say.settings, 'settings')
      case 'fullscreen': {
        const label = state.fullscreen ? 'Exit full screen' : 'Full screen'
        return <button key={id} className="pc-btn" data-act="fullscreen" aria-label={label} title={label} aria-pressed={state.fullscreen} onClick={on.fullscreen}><Icon name={state.fullscreen ? 'exit-fullscreen' : 'fullscreen'} /></button>
      }
    }
  }

  const titleInBar = layout.title === 'bar'
  return (
    <>
      <div className="pc-top">
        <button className="pc-btn" data-act="back" onClick={on.back} aria-label={say.back} title={say.back}><Icon name="left" /></button>
        {!titleInBar && (
          <div className="pc-heading">
            <span className="pc-title">{heading.name}</span>
            {heading.detail && <span className="pc-sub">{heading.detail}</span>}
          </div>
        )}
      </div>

      <div className="pc-bar">
        <div className="pc-progress">
          {layout.clocks === 'both' && <span className="pc-clock pc-elapsed">{clock(state.time)}</span>}
          <Scrubber time={state.time} duration={state.duration} buffered={state.buffered} segments={segments} onSeek={on.seek} />
          <span className="pc-clock pc-remaining" title="Time left">{clock(remaining)}</span>
        </div>
        <div className="pc-row" data-middle={layout.middle.length ? 'cluster' : 'title'}>
          <div className="pc-left">{layout.left.map(control)}</div>
          {layout.middle.length
            ? <div className="pc-cluster">{layout.middle.map(control)}</div>
            : <div className="pc-mid">{titleInBar && <span className="pc-title"><b>{heading.name}</b>{heading.detail && <> <span>{heading.detail}</span></>}</span>}</div>}
          <div className="pc-right">{layout.right.map(control)}</div>
        </div>
      </div>
    </>
  )
}
