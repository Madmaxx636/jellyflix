import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { IconName } from './components/Icon'

export type ThemeId = 'netflix' | 'hulu' | 'hbo' | 'disney'

export interface NavLink { to: string; label: string; icon?: IconName }

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
    words: {
      myList: 'My List', libraries: 'Libraries', genres: 'Genres', collections: 'Collections', settings: 'Account',
      switchProfile: 'Switch Profiles', searchHint: 'Titles, people, genres', play: 'Play', resume: 'Resume', playFromStart: 'Play from start',
      continueWatching: u => `Continue Watching for ${u}`, nextUp: 'Next Up',
      recentlyAdded: k => (k === 'movies' ? 'Recently Added Movies' : 'Recently Added Shows'), topRated: 'Top 10 Rated',
      becauseYouWatched: t => `Because you watched ${t}`, cast: 'Cast', moreLikeThis: 'More Like This', episodes: 'Episodes',
      extras: 'Trailers & More', details: 'About', newPage: 'New & Popular'
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
    words: {
      myList: 'My Stuff', libraries: 'Hubs', genres: 'Genres', collections: 'Collections', settings: 'Account',
      switchProfile: 'Switch Profile', searchHint: 'Search', play: 'Start Watching', resume: 'Resume', playFromStart: 'Start Over',
      continueWatching: () => 'Keep Watching', nextUp: 'Up Next',
      recentlyAdded: k => (k === 'movies' ? 'Just Added Movies' : 'Just Added TV'), topRated: 'Top Rated',
      becauseYouWatched: t => `Because You Watched ${t}`, cast: 'Cast', moreLikeThis: 'Suggested', episodes: 'Episodes',
      extras: 'Extras', details: 'Details', newPage: 'Just Added'
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
    words: {
      myList: 'My List', libraries: 'Hubs', genres: 'Genres', collections: 'Collections', settings: 'Settings',
      switchProfile: 'Switch Profile', searchHint: 'Search', play: 'Watch Now', resume: 'Resume', playFromStart: 'Watch From Start',
      continueWatching: () => 'Continue Watching', nextUp: 'Up Next',
      recentlyAdded: k => (k === 'movies' ? 'Just Added Movies' : 'Just Added Series'), topRated: 'Popular',
      becauseYouWatched: t => `Because You Watched ${t}`, cast: 'Cast & Crew', moreLikeThis: 'More Like This', episodes: 'Episodes',
      extras: 'Extras', details: 'Details', newPage: 'Just Added'
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
    words: {
      myList: 'Watchlist', libraries: 'Brands', genres: 'Genres', collections: 'Collections', settings: 'App Settings',
      switchProfile: 'Switch Profile', searchHint: 'Search by title, character, or genre', play: 'Play', resume: 'Resume', playFromStart: 'Start Over',
      continueWatching: () => 'Continue Watching', nextUp: 'Up Next',
      recentlyAdded: k => (k === 'movies' ? 'New Movies' : 'New Series'), topRated: 'Top Rated',
      becauseYouWatched: t => `More Like ${t}`, cast: 'Cast', moreLikeThis: 'Suggested', episodes: 'Episodes',
      extras: 'Extras', details: 'Details', newPage: 'New'
    }
  }
]

const KEY = 'jellyflix.theme'
const Ctx = createContext<{ theme: Theme; setTheme: (id: ThemeId) => void }>(null!)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [id, setId] = useState<ThemeId>(() => {
    let saved: string | null = null
    try { saved = localStorage.getItem(KEY) } catch { /* storage unavailable */ }
    return THEMES.some(t => t.id === saved) ? (saved as ThemeId) : 'netflix'
  })
  const theme = THEMES.find(t => t.id === id)!
  useEffect(() => {
    document.documentElement.dataset.theme = id
    try { localStorage.setItem(KEY, id) } catch { /* storage unavailable */ }
  }, [id])
  return <Ctx.Provider value={{ theme, setTheme: setId }}>{children}</Ctx.Provider>
}

export const useTheme = () => useContext(Ctx)
