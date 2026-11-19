import { useCallback, useEffect, useMemo, useState } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { api as makeApi, loadSession, saveSession, type Api, type Session } from './api/jellyfin'
import { ThemeProvider } from './theme'
import { SettingsProvider } from './settings'
import { clearFlags } from './userdata'
import NavBar from './components/NavBar'
import Login from './pages/Login'
import Home from './pages/Home'
import Details from './pages/Details'
import Player from './pages/Player'
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

function Shell({ session, api, onLogout }: { session: Session; api: Api; onLogout: () => void }) {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname]) // new page, top of page (changing a sort or filter keeps your place)
  return (
    <>
      <NavBar session={session} api={api} onLogout={onLogout} />
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
        <Route path="*" element={<p className="pad error">That page doesn't exist.</p>} />
      </Routes>
    </>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(loadSession)
  const api = useMemo(() => (session ? makeApi(session) : null), [session])
  // Signing out keeps the server address, so the sign-in screen can offer this server's profiles.
  const logout = useCallback(() => {
    if (session) { try { localStorage.setItem('jellyflix.lastServer', session.server) } catch { /* storage unavailable */ } }
    saveSession(null); clearFlags(); setSession(null)
  }, [session])

  return (
    <ThemeProvider>
      <SettingsProvider>
        {!session || !api ? (
          <Login onLogin={setSession} />
        ) : (
          <HashRouter>
            <Routes>
              <Route path="/play/:id" element={<Player api={api} />} />
              <Route path="*" element={<Shell session={session} api={api} onLogout={logout} />} />
            </Routes>
          </HashRouter>
        )}
      </SettingsProvider>
    </ThemeProvider>
  )
}
