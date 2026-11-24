// What the Settings page controls, and the plain logic that goes with it (no React in here, so it is easy to test).
import type { MediaStream } from './api/jellyfin'

export interface Settings {
  autoplayNext: boolean
  skipIntro: 'button' | 'auto' | 'off'
  /** '' keeps whatever the server picks. */
  audioLang: string
  subtitleMode: 'off' | 'foreign' | 'always'
  subtitleLang: string
  quality: 'auto' | '1080' | '720' | '480'
  speed: number
  cardSize: 'small' | 'medium' | 'large'
  showHero: boolean
  rotateHero: boolean
  reduceMotion: boolean
  /** Touch controls: follow what was used last, or always on or off. */
  touchMode: 'auto' | 'on' | 'off'
  /** How big everything is: 1 is normal (see shared/zoom.ts for the steps). */
  scale: number
  /** How big the player's controls are, on top of the interface size: 1 is normal. */
  controlsScale: number
  /** Show the controls while the mouse is over the player: in narrow windows (half a screen), always, or never. */
  hoverControls: 'narrow' | 'always' | 'off'
  /** Seconds before the controls hide while playing; 0 keeps them showing. */
  controlsHide: number
  /** Whether the volume is remembered from one video to the next. */
  rememberVolume: boolean
  subSize: 'small' | 'medium' | 'large' | 'huge'
  subColor: 'white' | 'yellow' | 'cyan' | 'green'
  subBackground: 'shadow' | 'dark' | 'solid' | 'none'
  /** What to do with a file this app can't play as it is: 'never' convert it on the server (offer another player instead), or 'allow'. */
  convert: 'never' | 'allow'
  /** The player used for "Open in external player". */
  externalPlayer: 'auto' | 'mpv' | 'vlc'
  /** Holiday banner: 'classics' picks well-liked, family-friendly favourites; 'all' takes anything that matches. */
  seasonalStyle: 'classics' | 'all'
  rows: { continueWatching: boolean; nextUp: boolean; myList: boolean; recommended: boolean; recent: boolean; topRated: boolean; seasonal: boolean }
  genreRows: number
}

export const DEFAULTS: Settings = {
  autoplayNext: true, skipIntro: 'button', audioLang: '', subtitleMode: 'foreign', subtitleLang: 'eng', quality: 'auto', speed: 1,
  cardSize: 'medium', showHero: true, rotateHero: true, reduceMotion: false, touchMode: 'auto', scale: 1,
  controlsScale: 1, hoverControls: 'narrow', controlsHide: 3, rememberVolume: true,
  subSize: 'medium', subColor: 'white', subBackground: 'shadow', convert: 'never', externalPlayer: 'auto', seasonalStyle: 'classics',
  rows: { continueWatching: true, nextUp: true, myList: true, recommended: true, recent: true, topRated: true, seasonal: true },
  genreRows: 6
}

export const LANGUAGES: { code: string; label: string; aliases: string[] }[] = [
  { code: 'eng', label: 'English', aliases: ['eng', 'en'] },
  { code: 'spa', label: 'Spanish', aliases: ['spa', 'es'] },
  { code: 'fra', label: 'French', aliases: ['fra', 'fre', 'fr'] },
  { code: 'deu', label: 'German', aliases: ['deu', 'ger', 'de'] },
  { code: 'ita', label: 'Italian', aliases: ['ita', 'it'] },
  { code: 'por', label: 'Portuguese', aliases: ['por', 'pt'] },
  { code: 'jpn', label: 'Japanese', aliases: ['jpn', 'ja'] },
  { code: 'kor', label: 'Korean', aliases: ['kor', 'ko'] },
  { code: 'zho', label: 'Chinese', aliases: ['zho', 'chi', 'zh'] },
  { code: 'rus', label: 'Russian', aliases: ['rus', 'ru'] },
  { code: 'hin', label: 'Hindi', aliases: ['hin', 'hi'] },
  { code: 'ara', label: 'Arabic', aliases: ['ara', 'ar'] },
  { code: 'nld', label: 'Dutch', aliases: ['nld', 'dut', 'nl'] },
  { code: 'swe', label: 'Swedish', aliases: ['swe', 'sv'] },
  { code: 'pol', label: 'Polish', aliases: ['pol', 'pl'] },
  { code: 'tur', label: 'Turkish', aliases: ['tur', 'tr'] }
]

const canon = (c?: string) => {
  const x = (c ?? '').toLowerCase()
  return LANGUAGES.find(l => l.aliases.includes(x))?.code ?? x
}
export const sameLang = (a?: string, b?: string) => !!a && !!b && canon(a) === canon(b)
/** "eng" → "English"; unknown codes are shown in capitals. */
export const langName = (code?: string) => LANGUAGES.find(l => sameLang(l.code, code))?.label ?? (code ? code.toUpperCase() : '')

/** The audio track to start with: the preferred language if the file has it, else the server's default. */
export function pickAudio(streams: MediaStream[], pref: string, serverDefault?: number): number | null {
  const audio = streams.filter(s => s.Type === 'Audio')
  if (!audio.length) return null
  if (pref) { const m = audio.find(s => sameLang(s.Language, pref)); if (m) return m.Index }
  return serverDefault ?? audio.find(s => s.IsDefault)?.Index ?? audio[0].Index
}

/** The subtitle track to start with, or null for none. "foreign" means: only when the audio isn't in the subtitle language. */
export function pickSubtitle(streams: MediaStream[], mode: Settings['subtitleMode'], lang: string, audioLang?: string): number | null {
  const subs = streams.filter(s => s.Type === 'Subtitle')
  if (mode === 'off' || !subs.length) return null
  const want = lang || 'eng'
  if (mode === 'foreign' && sameLang(audioLang, want)) return null
  const match = subs.find(s => sameLang(s.Language, want) && !s.IsForced) ?? subs.find(s => sameLang(s.Language, want))
  return match ? match.Index : null
}

/** Settings from a fresh start. Motion follows the system's "reduce motion" choice until someone picks. */
export function defaultSettings(prefersReducedMotion = false): Settings {
  return { ...DEFAULTS, rows: { ...DEFAULTS.rows }, reduceMotion: prefersReducedMotion }
}

const CHOICES: { [K in keyof Settings]?: readonly unknown[] } = {
  skipIntro: ['button', 'auto', 'off'],
  subtitleMode: ['off', 'foreign', 'always'],
  quality: ['auto', '1080', '720', '480'],
  cardSize: ['small', 'medium', 'large'],
  touchMode: ['auto', 'on', 'off'],
  hoverControls: ['narrow', 'always', 'off'],
  subSize: ['small', 'medium', 'large', 'huge'],
  subColor: ['white', 'yellow', 'cyan', 'green'],
  subBackground: ['shadow', 'dark', 'solid', 'none'],
  convert: ['never', 'allow'],
  externalPlayer: ['auto', 'mpv', 'vlc'],
  seasonalStyle: ['classics', 'all']
}
const RANGES: { [K in keyof Settings]?: readonly [number, number] } = { speed: [0.25, 4], genreRows: [0, 12], scale: [0.5, 3], controlsScale: [0.6, 2.5], controlsHide: [0, 30] }

function usable(key: keyof Settings, value: unknown): boolean {
  if (typeof value !== typeof DEFAULTS[key]) return false
  const choices = CHOICES[key]
  if (choices) return choices.includes(value)
  const range = RANGES[key]
  if (range) return Number.isFinite(value) && (value as number) >= range[0] && (value as number) <= range[1]
  return true
}

/**
 * Turns whatever was stored into valid settings. Anything missing, of the wrong kind or out of range falls back to the
 * starting value, so an old or damaged save can't break the app.
 */
export function normalizeSettings(raw: unknown, prefersReducedMotion = false): Settings {
  const out = defaultSettings(prefersReducedMotion)
  if (!raw || typeof raw !== 'object') return out
  const saved = raw as Record<string, unknown>
  for (const key of Object.keys(DEFAULTS) as (keyof Settings)[]) {
    if (key !== 'rows' && usable(key, saved[key])) (out as unknown as Record<string, unknown>)[key] = saved[key]
  }
  const rows = saved['rows']
  if (rows && typeof rows === 'object') {
    for (const key of Object.keys(DEFAULTS.rows) as (keyof Settings['rows'])[]) {
      const on = (rows as Record<string, unknown>)[key]
      if (typeof on === 'boolean') out.rows[key] = on
    }
  }
  return out
}
