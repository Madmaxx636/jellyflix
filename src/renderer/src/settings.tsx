import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react'
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
  rows: { continueWatching: boolean; nextUp: boolean; myList: boolean; recommended: boolean; recent: boolean; topRated: boolean }
  genreRows: number
}

export const DEFAULTS: Settings = {
  autoplayNext: true, skipIntro: 'button', audioLang: '', subtitleMode: 'foreign', subtitleLang: 'eng', quality: 'auto', speed: 1,
  cardSize: 'medium', showHero: true, rotateHero: true, reduceMotion: false,
  rows: { continueWatching: true, nextUp: true, myList: true, recommended: true, recent: true, topRated: true },
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

const KEY = 'jellyflix.settings'

function merge(raw: Partial<Settings> | null): Settings {
  return { ...DEFAULTS, ...(raw ?? {}), rows: { ...DEFAULTS.rows, ...(raw?.rows ?? {}) } }
}
function load(): Settings {
  try { return merge(JSON.parse(localStorage.getItem(KEY) ?? 'null')) } catch { return DEFAULTS }
}

interface Ctx {
  settings: Settings
  set: (patch: Partial<Settings>) => void
  setRow: (key: keyof Settings['rows'], on: boolean) => void
  reset: () => void
}
const SettingsCtx = createContext<Ctx>(null!)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load)
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(settings)) } catch { /* storage unavailable */ }
    document.documentElement.dataset.cards = settings.cardSize
    document.documentElement.dataset.motion = settings.reduceMotion ? 'reduced' : 'full'
  }, [settings])
  const set = useCallback((patch: Partial<Settings>) => setSettings(s => ({ ...s, ...patch })), [])
  const setRow = useCallback((key: keyof Settings['rows'], on: boolean) => setSettings(s => ({ ...s, rows: { ...s.rows, [key]: on } })), [])
  const reset = useCallback(() => setSettings(DEFAULTS), [])
  const value = useMemo(() => ({ settings, set, setRow, reset }), [settings, set, setRow, reset])
  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>
}

export const useSettings = () => useContext(SettingsCtx)
