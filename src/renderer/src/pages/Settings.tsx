import { useEffect, useState } from 'react'
import { APP_VERSION, type Api, type Session } from '../api/jellyfin'
import { useLoad } from '../hooks/useLoad'
import { usePageTitle } from '../hooks/usePageTitle'
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
export default function SettingsPage({ api, session, onLogout }: { api: Api; session: Session; onLogout: () => void }) {
  const { settings: st, set, setRow, reset } = useSettings()
  const { theme, setTheme } = useTheme()
  const w = theme.words
  usePageTitle(w.settings)
  const { data: info } = useLoad(api, 'info', a => a.publicInfo())
  const [confirmReset, setConfirmReset] = useState(false)

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
            <SettingRow id="serverInfo" label="Server software">
              <span className="set-value">{info ? `${info.ServerName ?? 'Jellyfin'} · ${info.ProductName ?? 'Jellyfin Server'} ${info.Version ?? ''}` : 'Checking…'}</span>
            </SettingRow>
          </section>
        </div>
      </div>
    </div>
  )
}
