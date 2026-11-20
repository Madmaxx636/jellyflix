import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { IconName } from './components/Icon'

export type ThemeId = 'netflix' | 'hulu' | 'hbo' | 'disney'

export interface NavLink { to: string; label: string; icon?: IconName }

/** Everything that can sit on the player's control bar. */
export type PlayerControl = 'play' | 'back10' | 'fwd10' | 'volume' | 'next' | 'episodes' | 'tracks' | 'speed' | 'settings' | 'fullscreen'

/** How a look lays out its player. */
export interface PlayerLayout {
  /** Where the title is shown: next to the back button at the top, or in the middle of the control bar. */
  title: 'top' | 'bar'
  /** What the clocks around the progress bar show: the time left, or the time so far as well. */
  clocks: 'remaining' | 'both'
  left: PlayerControl[]
  /** A cluster in the middle of the bar. Empty when the title takes that place. */
  middle: PlayerControl[]
  right: PlayerControl[]
  /** A panel with the title and its description once the video has been paused for a moment. */
  pausePanel: boolean
  /** Episode list rows: a picture on every row, or only on the one that is playing. */
  episodePictures: 'all' | 'current'
}

/** The wording of the player. */
export interface PlayerWords {
  back: string
  audioSubtitles: string
  speed: string
  settings: string
  next: string
  /** The line on the next-episode card, with the seconds left when it is counting down. */
  nextCard: (seconds: number | null) => string
  watchCredits: string
  nowWatching: string
  /** The line under a show's name: its season, episode and title. */
  episodeLine: (season: number | undefined, episode: number | undefined, name: string) => string
}

/** The wording each service uses for the same feature. */
export interface Words {
  myList: string
  libraries: string
  genres: string
  collections: string
  settings: string
  switchProfile: string
  searchHint: string
  play: string
  resume: string
  playFromStart: string
  continueWatching: (user: string) => string
  nextUp: string
  recentlyAdded: (kind: 'movies' | 'shows') => string
  topRated: string
  becauseYouWatched: (title: string) => string
  cast: string
  moreLikeThis: string
  episodes: string
  extras: string
  details: string
  newPage: string
  player: PlayerWords
}

export interface Theme {
  id: ThemeId
  label: string
  /** Tall posters, or wide 16:9 tiles. */
  shape: 'poster' | 'landscape'
  logo: string
  nav: NavLink[]
  more: { label: string; links: NavLink[] }
  /** Icons next to the nav labels (Disney+ style). */
  navIcons: boolean
  /** icon-expand: icon that opens an input · bar: always-open input · page: opens the search page */
  search: 'icon-expand' | 'bar' | 'page'
  hero: 'single' | 'carousel'
  /** Libraries shown as brand tiles under the banner (Disney+ style). */
  brandTiles: boolean
  /** A numbered ranking row (Netflix style). */
  top10: boolean
  /** Title page sections become tabs. */
  detailTabs: boolean
  settings: 'lines' | 'cards' | 'sidebar' | 'list'
  player: PlayerLayout
  words: Words
}

export const THEMES: Theme[] = [
  {
    id: 'netflix', label: 'Netflix', shape: 'poster', logo: 'JELLYFLIX',
    nav: [
      { to: '/', label: 'Home' }, { to: '/shows', label: 'TV Shows' }, { to: '/movies', label: 'Movies' },
      { to: '/new', label: 'New & Popular' }, { to: '/mylist', label: 'My List' }
    ],
    more: { label: 'Browse', links: [{ to: '/libraries', label: 'Libraries' }, { to: '/genres', label: 'Genres' }, { to: '/collections', label: 'Collections' }] },
    navIcons: false, search: 'icon-expand', hero: 'single', brandTiles: false, top10: true, detailTabs: false, settings: 'lines',
    player: { title: 'bar', clocks: 'remaining', left: ['play', 'back10', 'fwd10', 'volume'], middle: [], right: ['next', 'episodes', 'tracks', 'speed', 'fullscreen'], pausePanel: true, episodePictures: 'current' },
    words: {
      myList: 'My List', libraries: 'Libraries', genres: 'Genres', collections: 'Collections', settings: 'Account',
      switchProfile: 'Switch Profiles', searchHint: 'Titles, people, genres', play: 'Play', resume: 'Resume', playFromStart: 'Play from start',
      continueWatching: u => `Continue Watching for ${u}`, nextUp: 'Next Up',
      recentlyAdded: k => (k === 'movies' ? 'Recently Added Movies' : 'Recently Added Shows'), topRated: 'Top 10 Rated',
      becauseYouWatched: t => `Because you watched ${t}`, cast: 'Cast', moreLikeThis: 'More Like This', episodes: 'Episodes',
      extras: 'Trailers & More', details: 'About', newPage: 'New & Popular',
      player: {
        back: 'Back to Browse', audioSubtitles: 'Audio & Subtitles', speed: 'Playback Speed', settings: 'Settings', next: 'Next Episode',
        nextCard: n => (n == null ? 'Next episode' : `Next episode in ${n}`), watchCredits: 'Watch Credits', nowWatching: "You're watching",
        episodeLine: (s, e, name) => `S${s}:E${e} ${name}`
      }
    }
  },
  {
    id: 'hulu', label: 'Hulu', shape: 'landscape', logo: 'jellyflix',
    nav: [
      { to: '/', label: 'Home' }, { to: '/shows', label: 'TV' }, { to: '/movies', label: 'Movies' },
      { to: '/mylist', label: 'My Stuff' }, { to: '/libraries', label: 'Hubs' }
    ],
    more: { label: 'Browse', links: [{ to: '/genres', label: 'Genres' }, { to: '/collections', label: 'Collections' }, { to: '/new', label: 'Just Added' }] },
    navIcons: false, search: 'bar', hero: 'carousel', brandTiles: false, top10: false, detailTabs: true, settings: 'cards',
    player: { title: 'top', clocks: 'both', left: ['play', 'back10', 'fwd10', 'volume'], middle: [], right: ['next', 'episodes', 'tracks', 'settings', 'fullscreen'], pausePanel: false, episodePictures: 'all' },
    words: {
      myList: 'My Stuff', libraries: 'Hubs', genres: 'Genres', collections: 'Collections', settings: 'Account',
      switchProfile: 'Switch Profile', searchHint: 'Search', play: 'Start Watching', resume: 'Resume', playFromStart: 'Start Over',
      continueWatching: () => 'Keep Watching', nextUp: 'Up Next',
      recentlyAdded: k => (k === 'movies' ? 'Just Added Movies' : 'Just Added TV'), topRated: 'Top Rated',
      becauseYouWatched: t => `Because You Watched ${t}`, cast: 'Cast', moreLikeThis: 'Suggested', episodes: 'Episodes',
      extras: 'Extras', details: 'Details', newPage: 'Just Added',
      player: {
        back: 'Back', audioSubtitles: 'Subtitles & Audio', speed: 'Playback Speed', settings: 'Settings', next: 'Next Episode',
        nextCard: n => (n == null ? 'Up next' : `Up next in ${n}`), watchCredits: 'Watch Credits', nowWatching: "You're watching",
        episodeLine: (s, e, name) => `S${s} E${e} · ${name}`
      }
    }
  },
  {
    id: 'hbo', label: 'HBO', shape: 'landscape', logo: 'JELLY MAX',
    nav: [
      { to: '/', label: 'Home' }, { to: '/shows', label: 'Series' }, { to: '/movies', label: 'Movies' },
      { to: '/libraries', label: 'Hubs' }, { to: '/mylist', label: 'My List' }
    ],
    more: { label: 'More', links: [{ to: '/genres', label: 'Genres' }, { to: '/collections', label: 'Collections' }, { to: '/new', label: 'Just Added' }] },
    navIcons: false, search: 'page', hero: 'carousel', brandTiles: false, top10: false, detailTabs: true, settings: 'sidebar',
    player: { title: 'top', clocks: 'both', left: ['play', 'back10', 'fwd10', 'volume'], middle: [], right: ['tracks', 'episodes', 'next', 'settings', 'fullscreen'], pausePanel: false, episodePictures: 'all' },
    words: {
      myList: 'My List', libraries: 'Hubs', genres: 'Genres', collections: 'Collections', settings: 'Settings',
      switchProfile: 'Switch Profile', searchHint: 'Search', play: 'Watch Now', resume: 'Resume', playFromStart: 'Watch From Start',
      continueWatching: () => 'Continue Watching', nextUp: 'Up Next',
      recentlyAdded: k => (k === 'movies' ? 'Just Added Movies' : 'Just Added Series'), topRated: 'Popular',
      becauseYouWatched: t => `Because You Watched ${t}`, cast: 'Cast & Crew', moreLikeThis: 'More Like This', episodes: 'Episodes',
      extras: 'Extras', details: 'Details', newPage: 'Just Added',
      player: {
        back: 'Back', audioSubtitles: 'Audio & Subtitles', speed: 'Playback Speed', settings: 'Settings', next: 'Next Episode',
        nextCard: n => (n == null ? 'Up next' : `Up next in ${n}`), watchCredits: 'Watch Credits', nowWatching: "You're watching",
        episodeLine: (s, e, name) => `S${s} E${e} · ${name}`
      }
    }
  },
  {
    id: 'disney', label: 'Disney+', shape: 'poster', logo: 'Jellyflix+',
    nav: [
      { to: '/', label: 'Home', icon: 'home' }, { to: '/search', label: 'Search', icon: 'search' },
      { to: '/mylist', label: 'Watchlist', icon: 'plus' }, { to: '/movies', label: 'Movies', icon: 'film' },
      { to: '/shows', label: 'Series', icon: 'tv' }, { to: '/libraries', label: 'Brands', icon: 'grid' }
    ],
    more: { label: 'More', links: [{ to: '/genres', label: 'Genres' }, { to: '/collections', label: 'Collections' }, { to: '/new', label: 'New' }] },
    navIcons: true, search: 'page', hero: 'carousel', brandTiles: true, top10: false, detailTabs: true, settings: 'list',
    player: { title: 'top', clocks: 'remaining', left: ['volume'], middle: ['back10', 'play', 'fwd10'], right: ['next', 'episodes', 'tracks', 'settings', 'fullscreen'], pausePanel: false, episodePictures: 'all' },
    words: {
      myList: 'Watchlist', libraries: 'Brands', genres: 'Genres', collections: 'Collections', settings: 'App Settings',
      switchProfile: 'Switch Profile', searchHint: 'Search by title, character, or genre', play: 'Play', resume: 'Resume', playFromStart: 'Start Over',
      continueWatching: () => 'Continue Watching', nextUp: 'Up Next',
      recentlyAdded: k => (k === 'movies' ? 'New Movies' : 'New Series'), topRated: 'Top Rated',
      becauseYouWatched: t => `More Like ${t}`, cast: 'Cast', moreLikeThis: 'Suggested', episodes: 'Episodes',
      extras: 'Extras', details: 'Details', newPage: 'New',
      player: {
        back: 'Back', audioSubtitles: 'Audio & Subtitles', speed: 'Playback Speed', settings: 'Settings', next: 'Next Episode',
        nextCard: n => (n == null ? 'Up next' : `Up next in ${n}`), watchCredits: 'Watch Credits', nowWatching: "You're watching",
        episodeLine: (s, e, name) => `S${s} · E${e}: ${name}`
      }
    }
  }
]

const KEY = 'jellyflix.theme'
interface ThemeContext { theme: Theme; setTheme: (id: ThemeId) => void }
const Ctx = createContext<ThemeContext | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<ThemeId>(() => {
    let saved: string | null = null
    try { saved = localStorage.getItem(KEY) } catch { /* storage unavailable */ }
    return THEMES.some(t => t.id === saved) ? (saved as ThemeId) : 'netflix'
  })
  useEffect(() => {
    document.documentElement.dataset['theme'] = id
    try { localStorage.setItem(KEY, id) } catch { /* storage unavailable */ }
  }, [id])
  const value = useMemo<ThemeContext>(() => ({ theme: THEMES.find(t => t.id === id) ?? THEMES[0], setTheme: setId }), [id])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useTheme(): ThemeContext {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTheme needs a ThemeProvider above it')
  return ctx
}
