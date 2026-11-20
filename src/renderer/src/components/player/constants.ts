import type { MediaStream } from '../../api/jellyfin'
import { langName } from '../../settingsModel'

export const QUALITIES = [
  { id: 'auto', label: 'Auto', bps: 0 },
  { id: '1080', label: '1080p', bps: 8_000_000 },
  { id: '720', label: '720p', bps: 4_000_000 },
  { id: '480', label: '480p', bps: 1_500_000 }
] as const

export const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

/** The marked stretches of a video that get a Skip button, and what the button says. */
export const SKIPPABLE: Record<string, string> = { Intro: 'Skip Intro', Recap: 'Skip Recap', Preview: 'Skip Preview', Commercial: 'Skip' }

export type Menu = null | 'tracks' | 'speed' | 'settings' | 'episodes'
/** A pop-up that is open, as opposed to none. */
export type OpenMenu = Exclude<Menu, null>

/** What an audio or subtitle track is called in a menu. */
export const trackLabel = (s: MediaStream) =>
  s.DisplayTitle || [langName(s.Language), s.Codec?.toUpperCase()].filter(Boolean).join(' · ') || `Track ${s.Index}`
