// Things that know about Jellyflix itself: signing in without typing, switching the look, and what each look is called.
import { J, ev, send, sleep, waitFor, click, clickText, goto, settle } from './rig.mjs'

/** What each look calls things and where it puts them, as the tests expect to find them. */
export const NAV = {
  netflix: { links: ['Home', 'TV Shows', 'Movies', 'New & Popular', 'My List'], more: 'Browse', moreLinks: ['Libraries', 'Genres', 'Collections'], shows: 'TV Shows', movies: 'Movies', list: 'My List', libs: 'Libraries', fresh: 'New & Popular', settings: 'Account', play: 'Play', continue: 'Continue Watching for demo', because: n => `Because you watched ${n}`, top: 'Top 10 Rated' },
  hulu: { links: ['Home', 'TV', 'Movies', 'My Stuff', 'Hubs'], more: 'Browse', moreLinks: ['Genres', 'Collections', 'Just Added'], shows: 'TV', movies: 'Movies', list: 'My Stuff', libs: 'Hubs', fresh: 'Just Added', settings: 'Account', play: 'Start Watching', continue: 'Keep Watching', because: n => `Because You Watched ${n}`, top: 'Top Rated' },
  hbo: { links: ['Home', 'Series', 'Movies', 'Hubs', 'My List'], more: 'More', moreLinks: ['Genres', 'Collections', 'Just Added'], shows: 'Series', movies: 'Movies', list: 'My List', libs: 'Hubs', fresh: 'Just Added', settings: 'Settings', play: 'Watch Now', continue: 'Continue Watching', because: n => `Because You Watched ${n}`, top: 'Popular' },
  disney: { links: ['Home', 'Search', 'Watchlist', 'Movies', 'Series', 'Brands'], more: 'More', moreLinks: ['Genres', 'Collections', 'New'], shows: 'Series', movies: 'Movies', list: 'Watchlist', libs: 'Brands', fresh: 'New', settings: 'App Settings', play: 'Play', continue: 'Continue Watching', because: n => `More Like ${n}`, top: 'Top Rated' }
}
/** What each look's player has and where: the controls on the bar in the order they appear, and so on. */
export const PLAYER = {
  netflix: { title: 'bar', clocks: 'remaining', middle: false, settings: false, pausePanel: true, pictures: 'current', acts: ['play', 'back10', 'fwd10', 'mute', 'next', 'episodes', 'tracks', 'speed', 'fullscreen'] },
  hulu: { title: 'top', clocks: 'both', middle: false, settings: true, pausePanel: false, pictures: 'all', acts: ['play', 'back10', 'fwd10', 'mute', 'next', 'episodes', 'tracks', 'settings', 'fullscreen'] },
  hbo: { title: 'top', clocks: 'both', middle: false, settings: true, pausePanel: false, pictures: 'all', acts: ['play', 'back10', 'fwd10', 'mute', 'tracks', 'episodes', 'next', 'settings', 'fullscreen'] },
  disney: { title: 'top', clocks: 'remaining', middle: true, settings: true, pausePanel: false, pictures: 'all', acts: ['mute', 'back10', 'play', 'fwd10', 'next', 'episodes', 'tracks', 'settings', 'fullscreen'] }
}
export const SETTINGS_CLASS = { netflix: 'settings-lines', hulu: 'settings-cards', hbo: 'settings-sidebar', disney: 'settings-list' }

/** Signs in to a mock server by planting a session, then reloads. */
export async function signInTo(port) {
  await ev(`localStorage.setItem('jellyflix.session', ${J(J({ server: `http://127.0.0.1:${port}`, token: 'tok-demo', userId: 'u1', userName: 'demo' }))})`)
  await send('Page.reload')
  await waitFor(`document.querySelector('.nav')`, 30000)
  await sleep(300)
}

/** Changes saved settings directly (and reloads so the app reads them). */
export async function patchSettings(patch, reload = true) {
  await ev(`(()=>{const cur=JSON.parse(localStorage.getItem('jellyflix.settings')||'{}');localStorage.setItem('jellyflix.settings',JSON.stringify({...cur,...${J(patch)}}))})()`)
  if (reload) { await send('Page.reload'); await waitFor(`document.querySelector('.nav, .player, .login')`, 30000); await sleep(400) }
}

/** Picks a look from the menu in the top bar. */
export async function setLook(id) {
  if ((await ev(`document.documentElement.dataset.theme`)) === id) return
  await ev(`document.querySelector('.look-btn').click()`); await sleep(150)
  await ev(`document.querySelector('.menu [data-look=${J(id)}]').click()`); await sleep(450)
}

/** Clicks a link in the top bar, opening the overflow menu if it is in there. */
export async function clickNav(label) {
  if (await clickText('.nav-links > a', label)) return
  await click('.nav-more'); await sleep(150)
  if (!(await clickText('.menu a', label))) throw new Error('nav link not found: ' + label)
}

export async function home() {
  await goto('#/', `document.querySelector('.rows') && document.querySelectorAll('.row').length >= 6`)
  await settle()
}
