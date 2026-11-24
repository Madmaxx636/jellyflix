import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { HashRouter, Link, Route, Routes } from 'react-router-dom'
import { createApi, loadSession, rememberServer, saveSession, setUnauthorizedHandler, type Api, type Session } from './api/jellyfin'
import { forgetAll } from './hooks/memory'
import { useScrollRestoration } from './hooks/useScrollRestoration'
import { useInputMode } from './inputMode'
import { SettingsProvider, useSettings } from './settings'
import { ThemeProvider } from './theme'
import { clearFlags } from './userdata'
import { useAppScale } from './hooks/useAppScale'
import BackGestures from './components/BackGestures'
import ErrorBoundary from './components/ErrorBoundary'
import NavBar from './components/NavBar'
import ToastHost from './components/Toast'
import UpdateBanner from './components/UpdateBanner'
import Login from './pages/Login'
import Home from './pages/Home'
import Details from './pages/Details'
import Search from './pages/Search'
import Catalog from './pages/Catalog'
import Libraries from './pages/Libraries'
import Library from './pages/Library'
import { Genre, Genres } from './pages/Genres'
import MyList from './pages/MyList'
import NewPopular from './pages/NewPopular'
import Collections from './pages/Collections'
import PersonPage from './pages/Person'
import SettingsPage from './pages/Settings'

// The player brings the video library (hls.js, more than half of the app's code), so it is only loaded when something plays.
const Player = lazy(() => import('./pages/Player'))

/** Keeps the page's touch or mouse mode current. */
function InputModeSync() {
  useInputMode(useSettings().settings.touchMode)
  return null
}

/** Applies the interface size from Settings, and its keyboard and pinch shortcuts. */
function ScaleSync() {
  const { settings, set } = useSettings()
  useAppScale(settings.scale, scale => set({ scale }))
  return null
}

function Shell({ session, api, onLogout }: { session: Session; api: Api; onLogout: () => void }) {
  useScrollRestoration()
  return (
    <>
      {/* A button, not a link: with hash-based addresses a "#main" link would be read as a page to go to. */}
      <button className="skip-link" onClick={() => document.getElementById('main')?.focus()}>Skip to content</button>
      <NavBar session={session} api={api} onLogout={onLogout} />
      <main id="main" tabIndex={-1}>
        <Routes>
          <Route path="/" element={<Home api={api} session={session} />} />
          <Route path="/title/:id" element={<Details api={api} />} />
          <Route path="/search" element={<Search api={api} />} />
          <Route path="/movies" element={<Catalog api={api} kind="movies" />} />
          <Route path="/shows" element={<Catalog api={api} kind="shows" />} />
          <Route path="/libraries" element={<Libraries api={api} />} />
          <Route path="/library/:id" element={<Library api={api} />} />
          <Route path="/genres" element={<Genres api={api} />} />
          <Route path="/genre/:name" element={<Genre api={api} />} />
          <Route path="/mylist" element={<MyList api={api} />} />
          <Route path="/new" element={<NewPopular api={api} />} />
          <Route path="/collections" element={<Collections api={api} />} />
          <Route path="/person/:id" element={<PersonPage api={api} />} />
          <Route path="/settings" element={<SettingsPage api={api} session={session} onLogout={onLogout} />} />
          <Route path="*" element={<div className="page"><p className="empty">That page doesn't exist. <Link to="/">Go to Home</Link></p></div>} />
        </Routes>
      </main>
    </>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(loadSession)
  const [notice, setNotice] = useState('')
  const api = useMemo(() => (session ? createApi(session) : null), [session])

  // Signing out keeps the server address, so the sign-in screen can offer this server's profiles.
  const endSession = useCallback((why: string) => {
    if (session) rememberServer(session.server)
    saveSession(null)
    clearFlags()
    forgetAll()
    setNotice(why)
    setSession(null)
  }, [session])
  const logout = useCallback(() => endSession(''), [endSession])

  // When the server says the sign-in is over (the token was revoked, the user removed, the server reset) there is nothing
  // to do but start again: go back to the sign-in screen and say why, instead of leaving every page showing errors.
  useEffect(() => {
    setUnauthorizedHandler(session ? () => endSession('The server ended your session, so you were signed out. Please sign in again.') : null)
    return () => setUnauthorizedHandler(null)
  }, [session, endSession])

  return (
    <ThemeProvider>
      <SettingsProvider>
        <InputModeSync />
        <ScaleSync />
        <ErrorBoundary>
          {!session || !api ? (
            <Login onLogin={s => { setNotice(''); setSession(s) }} notice={notice} />
          ) : (
            <HashRouter>
              <BackGestures />
              <Routes>
                <Route path="/play/:id" element={<Suspense fallback={<main className="player-frame"><p className="pc-loading" role="status">Loading…</p></main>}><Player api={api} /></Suspense>} />
                <Route path="*" element={<Shell session={session} api={api} onLogout={logout} />} />
              </Routes>
            </HashRouter>
          )}
          <ToastHost />
          <UpdateBanner />
        </ErrorBoundary>
      </SettingsProvider>
    </ThemeProvider>
  )
}
