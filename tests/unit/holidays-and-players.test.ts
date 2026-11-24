import { describe, expect, it } from 'vitest'
import { matchesClassic, matchesEpisode, qualifies, score } from '../../src/renderer/src/api/seasonal'
import { deviceProfile, playbackRequest } from '../../src/renderer/src/api/playback'
import { NeedsConversion } from '../../src/renderer/src/api/conversion'
import { plainName, HOLIDAY_DATA } from '../../src/renderer/src/util/holidayData'
import { seasonsFor, thanksgivingDay } from '../../src/renderer/src/util/seasons'
import { choosePlayer, isOpenableUrl, playerArgs } from '../../src/shared/players'
import { normalizeSettings } from '../../src/renderer/src/settingsModel'
import type { Item } from '../../src/renderer/src/api/types'

const movie = (over: Partial<Item>): Item => ({ Id: 'x', Name: 'X', Type: 'Movie', ...over }) as Item

describe('holiday seasons by date', () => {
  it('finds Thanksgiving as the fourth Thursday of November', () => {
    expect(thanksgivingDay(2026)).toBe(26)
    expect(thanksgivingDay(2025)).toBe(27)
    expect(thanksgivingDay(2024)).toBe(28)
  })
  it('mixes Thanksgiving and Christmas in late November, then only Christmas', () => {
    expect(seasonsFor(new Date(2026, 10, 24)).map(s => s.id)).toEqual(['thanksgiving', 'christmas'])
    expect(seasonsFor(new Date(2026, 10, 27)).map(s => s.id)).toEqual(['christmas'])
    expect(seasonsFor(new Date(2026, 10, 3))).toEqual([])
    expect(seasonsFor(new Date(2026, 11, 20)).map(s => s.id)).toEqual(['christmas'])
    expect(seasonsFor(new Date(2027, 0, 5))).toEqual([])
  })
})

describe('telling a classic from a bad film with the right word in its tags', () => {
  it('matches titles by name, tolerating articles, punctuation and a year off by one', () => {
    expect(plainName('The Muppet Christmas Carol')).toBe('muppet christmas carol')
    expect(matchesClassic(movie({ Name: "It's a Wonderful Life", ProductionYear: 1946 }), { title: "It's a Wonderful Life", year: 1946 })).toBe(true)
    expect(matchesClassic(movie({ Name: 'Home Alone', ProductionYear: 1991 }), { title: 'Home Alone', year: 1990 })).toBe(true)
    expect(matchesClassic(movie({ Name: 'Home Alone', ProductionYear: 2021 }), { title: 'Home Alone', year: 1990 })).toBe(false)
    expect(matchesClassic(movie({ Name: 'Home Alone 2: Lost in New York', ProductionYear: 1992 }), { title: 'Home Alone', year: 1990 })).toBe(false)
  })
  it('matches an episode only in its own series', () => {
    const ep = { Id: 'e', Name: 'The Night of the Meek', Type: 'Episode', SeriesName: 'The Twilight Zone' } as Item
    expect(matchesEpisode(ep, { series: 'The Twilight Zone', title: 'The Night of the Meek' })).toBe(true)
    expect(matchesEpisode(ep, { series: 'Seinfeld', title: 'The Night of the Meek' })).toBe(false)
  })
  it('keeps well-rated family films and drops the rest', () => {
    const christmas = { horror: false }
    expect(qualifies(movie({ CommunityRating: 7.8, OfficialRating: 'PG', Genres: ['Comedy', 'Family'] }), christmas)).toBe(true)
    expect(qualifies(movie({ CommunityRating: 4.2, OfficialRating: 'PG', Genres: ['Comedy'] }), christmas)).toBe(false) // badly rated
    expect(qualifies(movie({ CommunityRating: 8.5, OfficialRating: 'R', Genres: ['Comedy'] }), christmas)).toBe(false) // adult
    expect(qualifies(movie({ CommunityRating: 7.5, OfficialRating: 'TV-MA' }), christmas)).toBe(false)
    expect(qualifies(movie({ CommunityRating: 7.5, Genres: ['Horror'] }), christmas)).toBe(false) // a Christmas horror film is not a holiday pick
    expect(qualifies(movie({ CommunityRating: 7.5, Genres: ['Horror'] }), { horror: true })).toBe(true)
    expect(qualifies(movie({ CommunityRating: 5.5, Genres: ['Horror'] }), { horror: true })).toBe(false) // but not an awful one
  })
  it('trusts only older titles that have no rating', () => {
    expect(qualifies(movie({ ProductionYear: 1947 }), { horror: false })).toBe(true)
    expect(qualifies(movie({ ProductionYear: 2014 }), { horror: false })).toBe(false)
  })
  it('puts a well-liked, family, older title first', () => {
    const a = movie({ CommunityRating: 7.9, OfficialRating: 'G', ProductionYear: 1965 })
    const b = movie({ CommunityRating: 7.9, OfficialRating: 'PG-13', ProductionYear: 2015 })
    expect(score(a)).toBeGreaterThan(score(b))
  })
  it('has a list for every season, with the Twilight Zone Christmas episode in it', () => {
    for (const id of ['christmas', 'thanksgiving', 'halloween', 'valentines']) expect(HOLIDAY_DATA[id].movies.length).toBeGreaterThan(15)
    expect(HOLIDAY_DATA['christmas'].episodes.some(e => e.series === 'The Twilight Zone' && /Meek/.test(e.title))).toBe(true)
  })
})

describe('what is asked of the server', () => {
  it('lists only the codecs the device has', () => {
    const p = deviceProfile({ video: ['h264', 'hevc'], audio: ['aac', 'ac3'] })
    expect(p.DirectPlayProfiles[0].VideoCodec).toBe('h264,hevc')
    expect(p.DirectPlayProfiles[0].AudioCodec).toBe('aac,ac3')
    expect(deviceProfile({ video: ['h264'], audio: ['aac'] }).DirectPlayProfiles[0].VideoCodec).toBe('h264')
  })
  it('does not allow converting when it is switched off, but still allows copying into a stream', () => {
    const off = playbackRequest('u', { convert: false })
    expect(off.EnableTranscoding).toBe(false)
    expect(off.EnableDirectStream).toBe(true)
    expect(off.AllowVideoStreamCopy).toBe(true)
    expect(playbackRequest('u', {}).EnableTranscoding).toBe(true)
  })
  it('says what is inside a file that needs converting', () => {
    const e = new NeedsConversion('http://s/f', 'mkv', ['hevc', 'dts', 'dts'])
    expect(e.message).toContain('hevc, dts in mkv')
    expect(e.fileUrl).toBe('http://s/f')
  })
})

describe('other players', () => {
  it('only opens web addresses', () => {
    expect(isOpenableUrl('http://192.168.1.2:8096/Videos/1/stream')).toBe(true)
    expect(isOpenableUrl('https://x.example/y')).toBe(true)
    expect(isOpenableUrl('file:///etc/passwd')).toBe(false)
    expect(isOpenableUrl('javascript:alert(1)')).toBe(false)
    expect(isOpenableUrl('--script=evil')).toBe(false)
    expect(isOpenableUrl(42)).toBe(false)
  })
  it('gives each player its arguments as a list, with the address after "--"', () => {
    expect(playerArgs('mpv', 'http://s/v', 'My Movie')).toEqual(['--force-media-title=My Movie', '--', 'http://s/v'])
    expect(playerArgs('vlc', 'http://s/v', 'A\nB')).toEqual(['--meta-title=A B', '--', 'http://s/v'])
  })
  it('uses the player asked for when it is there, else the first found', () => {
    expect(choosePlayer(['mpv', 'vlc'], 'vlc')).toBe('vlc')
    expect(choosePlayer(['mpv', 'vlc'], 'auto')).toBe('mpv')
    expect(choosePlayer(['vlc'], 'mpv')).toBe('vlc')
    expect(choosePlayer([], 'auto')).toBeNull()
  })
})

describe('new settings', () => {
  it('start never converting, and keep only sensible saved values', () => {
    expect(normalizeSettings(null).convert).toBe('never')
    expect(normalizeSettings({ convert: 'allow', controlsScale: 1.5, hoverControls: 'always', subSize: 'huge' })).toMatchObject({ convert: 'allow', controlsScale: 1.5, hoverControls: 'always', subSize: 'huge' })
    expect(normalizeSettings({ convert: 'sometimes', controlsScale: 99, controlsHide: -4 })).toMatchObject({ convert: 'never', controlsScale: 1, controlsHide: 3 })
  })
})
