import { useEffect, useState } from 'react'
import { SCALE_STEPS, nearestStep } from '../../../shared/zoom'
import { APP_VERSION, type Api, type Session } from '../api/jellyfin'
import { useLoad } from '../hooks/useLoad'
import { usePageTitle } from '../hooks/usePageTitle'
import { describeUpdate, useUpdates } from '../hooks/useUpdates'
import { LANGUAGES, type Settings } from '../settingsModel'
import { useSettings } from '../settings'
import { THEMES, useTheme, type ThemeId } from '../theme'
import { toast } from '../toast'
import { Select, SettingRow, Toggle } from '../components/Fields'

const SECTIONS = [
  { id: 'playback', label: 'Playback' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'home', label: 'Home screen' },
  { id: 'account', label: 'Account' },
  { id: 'about', label: 'About' }
]

const LANG_OPTIONS = LANGUAGES.map(l => ({ value: l.code, label: l.label }))
const CONFIRM_FOR_MS = 5000

/** Settings / Account / App Settings. Every control here changes something the app really does. */
const CONTROL_SIZES = [0.8, 1, 1.25, 1.5, 1.75, 2]
const nearestOf = (list: number[], value: number) => list.reduce((best, v) => (Math.abs(v - value) < Math.abs(best - value) ? v : best), list[0])

export default function SettingsPage({ api, session, onLogout }: { api: Api; session: Session; onLogout: () => void }) {
  const { settings: st, set, setRow, reset } = useSettings()
  const { theme, setTheme } = useTheme()
  const w = theme.words
  usePageTitle(w.settings)
  const { data: info } = useLoad(api, 'info', a => a.publicInfo())
  const [confirmReset, setConfirmReset] = useState(false)
  const updates = useUpdates()
  const [trusted, setTrusted] = useState<string[]>([])
  useEffect(() => { void window.jellyflix?.certificates.list().then(setTrusted, () => { /* none shown */ }) }, [])

  // The second click has to come soon after the first, or the question lapses.
  useEffect(() => {
    if (!confirmReset) return
    const timer = setTimeout(() => setConfirmReset(false), CONFIRM_FOR_MS)
    return () => clearTimeout(timer)
  }, [confirmReset])

  const go = (id: string) => document.getElementById(`set-${id}`)?.scrollIntoView({ behavior: st.reduceMotion ? 'auto' : 'smooth', block: 'start' })

  return (
    <div className={`page settings settings-${theme.settings}`}>
      <h1 className="page-title">{w.settings}</h1>
      <div className="set-layout">
        <nav className="set-nav" aria-label="Sections">
          {SECTIONS.map(s => <button key={s.id} onClick={() => go(s.id)}>{s.label}</button>)}
        </nav>

        <div className="set-body">
          <section id="set-playback" className="set-section" data-section="playback">
            <h2>Playback</h2>
            <SettingRow id="autoplayNext" label="Autoplay next episode" hint="Start the next episode when one ends, after a short countdown.">
              <Toggle label="Autoplay next episode" checked={st.autoplayNext} onChange={v => set({ autoplayNext: v })} />
            </SettingRow>
            <SettingRow id="skipIntro" label="Skip intros" hint="Uses the intro and credits markers Jellyfin has for a title.">
              <Select<Settings['skipIntro']> label="Skip intros" value={st.skipIntro} onChange={v => set({ skipIntro: v })}
                options={[{ value: 'button', label: 'Show a Skip button' }, { value: 'auto', label: 'Skip automatically' }, { value: 'off', label: 'Never' }]} />
            </SettingRow>
            <SettingRow id="audioLang" label="Preferred audio language" hint="Used whenever a title has that language.">
              <Select label="Preferred audio language" value={st.audioLang} onChange={v => set({ audioLang: v })}
                options={[{ value: '', label: 'Whatever the file starts with' }, ...LANG_OPTIONS]} />
            </SettingRow>
            <SettingRow id="subtitleMode" label="Subtitles">
              <Select<Settings['subtitleMode']> label="Subtitles" value={st.subtitleMode} onChange={v => set({ subtitleMode: v })}
                options={[{ value: 'off', label: 'Off' }, { value: 'foreign', label: "Only when the audio isn't my language" }, { value: 'always', label: 'Always on' }]} />
            </SettingRow>
            <SettingRow id="subtitleLang" label="Subtitle language">
              <Select label="Subtitle language" value={st.subtitleLang} onChange={v => set({ subtitleLang: v })} options={LANG_OPTIONS} />
            </SettingRow>
            <SettingRow id="quality" label="Streaming quality" hint="Lower quality uses less bandwidth. Auto lets the server decide.">
              <Select<Settings['quality']> label="Streaming quality" value={st.quality} onChange={v => set({ quality: v })}
                options={[{ value: 'auto', label: 'Auto' }, { value: '1080', label: '1080p (8 Mbps)' }, { value: '720', label: '720p (4 Mbps)' }, { value: '480', label: '480p (1.5 Mbps)' }]} />
            </SettingRow>
            <SettingRow id="speed" label="Default playback speed">
              <Select<number> label="Default playback speed" value={st.speed} onChange={v => set({ speed: v })}
                options={[0.75, 1, 1.25, 1.5, 2].map(v => ({ value: v, label: `${v}×` }))} />
            </SettingRow>
            <SettingRow id="convert" label="Converting on the server" hint="Never plays files as they are, or copied into a stream, and never has the server re-encode them. A file this app can't play then opens in another player (mpv or VLC) instead.">
              <Select<Settings['convert']> label="Converting on the server" value={st.convert} onChange={v => set({ convert: v })}
                options={[{ value: 'never', label: 'Never' }, { value: 'allow', label: 'When a file needs it' }]} />
            </SettingRow>
            <SettingRow id="externalPlayer" label="Other player" hint="Used by Open in external player, for files this app can't play.">
              <Select<Settings['externalPlayer']> label="Other player" value={st.externalPlayer} onChange={v => set({ externalPlayer: v })}
                options={[{ value: 'auto', label: 'Whichever is installed' }, { value: 'mpv', label: 'mpv' }, { value: 'vlc', label: 'VLC' }]} />
            </SettingRow>
            <SettingRow id="hoverControls" label="Show controls when the mouse is over the video" hint="In a narrow window (half the screen) the controls stay while the mouse is over the video and go when it leaves.">
              <Select<Settings['hoverControls']> label="Show controls when the mouse is over the video" value={st.hoverControls} onChange={v => set({ hoverControls: v })}
                options={[{ value: 'narrow', label: 'In narrow windows' }, { value: 'always', label: 'Always' }, { value: 'off', label: 'Never' }]} />
            </SettingRow>
            <SettingRow id="controlsHide" label="Hide the controls after" hint="While playing, with the mouse still.">
              <Select<number> label="Hide the controls after" value={st.controlsHide} onChange={v => set({ controlsHide: v })}
                options={[{ value: 2, label: '2 seconds' }, { value: 3, label: '3 seconds' }, { value: 5, label: '5 seconds' }, { value: 10, label: '10 seconds' }, { value: 0, label: 'Never' }]} />
            </SettingRow>
            <SettingRow id="controlsScale" label="Player controls size" hint="Makes the buttons and bar on the video bigger or smaller, on top of the interface size.">
              <Select<number> label="Player controls size" value={nearestOf(CONTROL_SIZES, st.controlsScale)} onChange={v => set({ controlsScale: v })}
                options={CONTROL_SIZES.map(v => ({ value: v, label: `${Math.round(v * 100)}%` }))} />
            </SettingRow>
            <SettingRow id="rememberVolume" label="Remember the volume" hint="Start each video at the volume you left the last one at.">
              <Toggle label="Remember the volume" checked={st.rememberVolume} onChange={v => set({ rememberVolume: v })} />
            </SettingRow>
            <SettingRow id="subSize" label="Subtitle size">
              <Select<Settings['subSize']> label="Subtitle size" value={st.subSize} onChange={v => set({ subSize: v })}
                options={[{ value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' }, { value: 'huge', label: 'Huge' }]} />
            </SettingRow>
            <SettingRow id="subColor" label="Subtitle colour">
              <Select<Settings['subColor']> label="Subtitle colour" value={st.subColor} onChange={v => set({ subColor: v })}
                options={[{ value: 'white', label: 'White' }, { value: 'yellow', label: 'Yellow' }, { value: 'cyan', label: 'Cyan' }, { value: 'green', label: 'Green' }]} />
            </SettingRow>
            <SettingRow id="subBackground" label="Subtitle background">
              <Select<Settings['subBackground']> label="Subtitle background" value={st.subBackground} onChange={v => set({ subBackground: v })}
                options={[{ value: 'shadow', label: 'Outline' }, { value: 'dark', label: 'Dark box' }, { value: 'solid', label: 'Black box' }, { value: 'none', label: 'None' }]} />
            </SettingRow>
          </section>

          <section id="set-appearance" className="set-section" data-section="appearance">
            <h2>Appearance</h2>
            <SettingRow id="look" label="Look" hint="Switch the whole app between the four styles.">
              <Select<ThemeId> label="Look" value={theme.id} onChange={setTheme} options={THEMES.map(t => ({ value: t.id, label: t.label }))} />
            </SettingRow>
            <SettingRow id="cardSize" label="Poster size">
              <Select<Settings['cardSize']> label="Poster size" value={st.cardSize} onChange={v => set({ cardSize: v })}
                options={[{ value: 'small', label: 'Small' }, { value: 'medium', label: 'Medium' }, { value: 'large', label: 'Large' }]} />
            </SettingRow>
            <SettingRow id="touchMode" label="Touch controls" hint="Bigger buttons, and tap and swipe gestures. Auto switches when you touch the screen, and back when you use a mouse.">
              <Select<Settings['touchMode']> label="Touch controls" value={st.touchMode} onChange={v => set({ touchMode: v })}
                options={[{ value: 'auto', label: 'Auto' }, { value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]} />
            </SettingRow>
            <SettingRow id="scale" label="Interface size" hint="Makes everything bigger or smaller. Ctrl and + or −, or pinching a trackpad, does the same; Ctrl and 0 goes back to normal.">
              <Select<number> label="Interface size" value={nearestStep(st.scale)} onChange={v => set({ scale: v })}
                options={SCALE_STEPS.map(v => ({ value: v, label: `${Math.round(v * 100)}%` }))} />
            </SettingRow>
            <SettingRow id="showHero" label="Featured banner" hint="The big banner at the top of Home.">
              <Toggle label="Featured banner" checked={st.showHero} onChange={v => set({ showHero: v })} />
            </SettingRow>
            <SettingRow id="rotateHero" label="Rotate featured titles" hint="Only in looks that have a carousel.">
              <Toggle label="Rotate featured titles" checked={st.rotateHero} onChange={v => set({ rotateHero: v })} />
            </SettingRow>
            <SettingRow id="reduceMotion" label="Reduce motion" hint="No hover zoom or automatic rotation. Starts out following your system's setting.">
              <Toggle label="Reduce motion" checked={st.reduceMotion} onChange={v => set({ reduceMotion: v })} />
            </SettingRow>
          </section>

          <section id="set-home" className="set-section" data-section="home">
            <h2>Home screen</h2>
            <SettingRow id="row-continueWatching" label="Continue watching">
              <Toggle label="Continue watching" checked={st.rows.continueWatching} onChange={v => setRow('continueWatching', v)} />
            </SettingRow>
            <SettingRow id="row-nextUp" label={w.nextUp}>
              <Toggle label={w.nextUp} checked={st.rows.nextUp} onChange={v => setRow('nextUp', v)} />
            </SettingRow>
            <SettingRow id="row-myList" label={w.myList}>
              <Toggle label={w.myList} checked={st.rows.myList} onChange={v => setRow('myList', v)} />
            </SettingRow>
            <SettingRow id="row-seasonal" label="Seasonal banner" hint="In the weeks around Valentine's Day, Halloween and Christmas, the featured banner shows that holiday's movies.">
              <Toggle label="Seasonal banner" checked={st.rows.seasonal} onChange={v => setRow('seasonal', v)} />
            </SettingRow>
            <SettingRow id="seasonalStyle" label="Holiday picks" hint="Classics: well-liked, family-friendly favourites (a small list of known classics plus anything in your library that rates well). Everything: any title that matches the holiday.">
              <Select<Settings['seasonalStyle']> label="Holiday picks" value={st.seasonalStyle} onChange={v => set({ seasonalStyle: v })}
                options={[{ value: 'classics', label: 'Classics' }, { value: 'all', label: 'Everything' }]} />
            </SettingRow>
            <SettingRow id="row-recommended" label="Recommendations" hint={`Rows like “${w.becauseYouWatched('a title')}”.`}>
              <Toggle label="Recommendations" checked={st.rows.recommended} onChange={v => setRow('recommended', v)} />
            </SettingRow>
            <SettingRow id="row-recent" label="Recently added">
              <Toggle label="Recently added" checked={st.rows.recent} onChange={v => setRow('recent', v)} />
            </SettingRow>
            <SettingRow id="row-topRated" label={w.topRated}>
              <Toggle label={w.topRated} checked={st.rows.topRated} onChange={v => setRow('topRated', v)} />
            </SettingRow>
            <SettingRow id="genreRows" label="Genre rows" hint="How many genres to show as rows.">
              <Select<number> label="Genre rows" value={st.genreRows} onChange={v => set({ genreRows: v })}
                options={[0, 3, 6, 9, 12].map(v => ({ value: v, label: v === 0 ? 'None' : String(v) }))} />
            </SettingRow>
          </section>

          <section id="set-account" className="set-section" data-section="account">
            <h2>Account</h2>
            <SettingRow id="user" label="Signed in as"><span className="set-value">{session.userName}</span></SettingRow>
            <SettingRow id="server" label="Server"><span className="set-value">{session.server}</span></SettingRow>
            <SettingRow id="session" label={w.switchProfile} hint="Go back to the sign-in screen.">
              <button className="btn" data-act="switch" onClick={onLogout}>{w.switchProfile}</button>
            </SettingRow>
            <SettingRow id="signout" label="Sign out">
              <button className="btn" data-act="signout" onClick={onLogout}>Sign out</button>
            </SettingRow>
            <SettingRow id="reset" label="Reset these settings" hint="Puts every option on this page back to how it started.">
              {confirmReset
                ? <button className="btn danger" data-act="reset-confirm" onClick={() => { reset(); setConfirmReset(false); toast('Settings are back to how they started.') }}>Click again to confirm</button>
                : <button className="btn" data-act="reset" onClick={() => setConfirmReset(true)}>Reset</button>}
            </SettingRow>
          </section>

          <section id="set-about" className="set-section" data-section="about">
            <h2>About</h2>
            <SettingRow id="app" label="Jellyflix"><span className="set-value">Version {APP_VERSION}</span></SettingRow>
            {updates.info && (
              <>
                <SettingRow id="updates" label="Updates">
                  <span className="set-value">{describeUpdate(updates.info)}</span>
                  {updates.info.state.kind !== 'off' && <button className="btn" data-act="check-updates" onClick={updates.check}>Check now</button>}
                </SettingRow>
                {updates.info.state.kind !== 'off' && (
                  <SettingRow id="autoUpdate" label="Check for updates automatically" hint="Asks GitHub for the newest release when the app starts, and every few hours.">
                    <Toggle label="Check for updates automatically" checked={updates.info.auto} onChange={updates.setAuto} />
                  </SettingRow>
                )}
              </>
            )}
            {trusted.length > 0 && (
              <SettingRow id="trusted" label="Servers you chose to trust" hint="Servers whose certificate this computer doesn't trust, which you allowed.">
                <div className="set-trusted">
                  {trusted.map(host => (
                    <span key={host} className="set-value">{host} <button className="btn small" data-act="forget-cert" onClick={() => { void window.jellyflix?.certificates.forget(host).then(setTrusted) }}>Forget</button></span>
                  ))}
                </div>
              </SettingRow>
            )}
            <SettingRow id="serverInfo" label="Server software">
              <span className="set-value">{info ? `${info.ServerName ?? 'Jellyfin'} · ${info.ProductName ?? 'Jellyfin Server'} ${info.Version ?? ''}` : 'Checking…'}</span>
            </SettingRow>
          </section>
        </div>
      </div>
    </div>
  )
}
