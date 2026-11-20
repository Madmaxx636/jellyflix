import { describe, expect, it } from 'vitest'
import type { MediaStream } from '../../src/renderer/src/api/types'
import { DEFAULTS, defaultSettings, langName, normalizeSettings, pickAudio, pickSubtitle, sameLang } from '../../src/renderer/src/settingsModel'

const audio = (Index: number, Language: string, extra: Partial<MediaStream> = {}): MediaStream => ({ Index, Type: 'Audio', Language, ...extra })
const sub = (Index: number, Language: string, extra: Partial<MediaStream> = {}): MediaStream => ({ Index, Type: 'Subtitle', Language, ...extra })

describe('languages', () => {
  it('treats the two- and three-letter codes as one language', () => {
    expect(sameLang('eng', 'en')).toBe(true)
    expect(sameLang('fre', 'fra')).toBe(true)
    expect(sameLang('eng', 'spa')).toBe(false)
    expect(sameLang(undefined, 'eng')).toBe(false)
  })

  it('names languages, and shows unknown codes in capitals', () => {
    expect(langName('eng')).toBe('English')
    expect(langName('ger')).toBe('German')
    expect(langName('xyz')).toBe('XYZ')
    expect(langName(undefined)).toBe('')
  })
})

describe('pickAudio', () => {
  const streams = [audio(1, 'eng'), audio(2, 'jpn'), audio(3, 'spa', { IsDefault: true })]

  it('has nothing to pick without audio', () => {
    expect(pickAudio([], '', undefined)).toBeNull()
  })

  it('uses the preferred language when the file has it', () => {
    expect(pickAudio(streams, 'jpn', 1)).toBe(2)
  })

  it("falls back to the server's choice, then the default track, then the first", () => {
    expect(pickAudio(streams, 'deu', 3)).toBe(3)
    expect(pickAudio(streams, '', undefined)).toBe(3)
    expect(pickAudio([audio(5, 'eng'), audio(6, 'spa')], '', undefined)).toBe(5)
  })
})

describe('pickSubtitle', () => {
  const subs = [sub(10, 'eng', { IsForced: true }), sub(11, 'eng'), sub(12, 'spa')]

  it('stays off when asked to, or when there are none', () => {
    expect(pickSubtitle(subs, 'off', 'eng', 'jpn')).toBeNull()
    expect(pickSubtitle([], 'always', 'eng', 'jpn')).toBeNull()
  })

  it('"foreign" only turns on when the audio is not in the subtitle language', () => {
    expect(pickSubtitle(subs, 'foreign', 'eng', 'eng')).toBeNull()
    expect(pickSubtitle(subs, 'foreign', 'eng', 'spa')).toBe(11)
  })

  it('"always" picks the language, and prefers full subtitles to forced ones', () => {
    expect(pickSubtitle(subs, 'always', 'eng', 'eng')).toBe(11)
    expect(pickSubtitle([sub(10, 'eng', { IsForced: true })], 'always', 'eng', 'eng')).toBe(10)
    expect(pickSubtitle(subs, 'always', 'deu', 'eng')).toBeNull()
  })
})

describe('normalizeSettings', () => {
  it('starts from the defaults when nothing was saved', () => {
    expect(normalizeSettings(null)).toEqual(DEFAULTS)
    expect(normalizeSettings('what')).toEqual(DEFAULTS)
    expect(normalizeSettings(undefined)).toEqual(DEFAULTS)
  })

  it("follows the system's choice about motion until one is saved", () => {
    expect(normalizeSettings(null, true).reduceMotion).toBe(true)
    expect(normalizeSettings({ reduceMotion: false }, true).reduceMotion).toBe(false)
    expect(defaultSettings(true).reduceMotion).toBe(true)
  })

  it('keeps valid saved values', () => {
    const saved = { ...DEFAULTS, quality: '720', speed: 1.5, cardSize: 'large', rows: { ...DEFAULTS.rows, nextUp: false }, genreRows: 9 }
    expect(normalizeSettings(saved)).toEqual(saved)
  })

  it('fills in settings an older version did not have', () => {
    const { genreRows: _dropped, ...older } = DEFAULTS
    expect(normalizeSettings(older).genreRows).toBe(DEFAULTS.genreRows)
  })

  it('drops values of the wrong kind or out of range', () => {
    const damaged = { quality: 'ultra', speed: 'fast', cardSize: 7, genreRows: 99, autoplayNext: 'yes', skipIntro: 'sometimes', rows: { myList: 'no', recent: false } }
    const out = normalizeSettings(damaged)
    expect(out.quality).toBe(DEFAULTS.quality)
    expect(out.speed).toBe(DEFAULTS.speed)
    expect(out.cardSize).toBe(DEFAULTS.cardSize)
    expect(out.genreRows).toBe(DEFAULTS.genreRows)
    expect(out.autoplayNext).toBe(DEFAULTS.autoplayNext)
    expect(out.skipIntro).toBe(DEFAULTS.skipIntro)
    expect(out.rows.myList).toBe(true)
    expect(out.rows.recent).toBe(false)
  })

  it('never shares the rows object with the defaults', () => {
    const out = normalizeSettings(null)
    out.rows.nextUp = false
    expect(DEFAULTS.rows.nextUp).toBe(true)
  })
})
