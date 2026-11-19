import { useEffect, useMemo, useState } from 'react'
import { HashRouter, Link, Route, Routes, useNavigate } from 'react-router-dom'
import { api as makeApi, loadSession, saveSession, Session } from './api/jellyfin'
import Login from './pages/Login'
import Home from './pages/Home'
import Details from './pages/Details'
import Player from './pages/Player'
import Search from './pages/Search'
import { THEMES, ThemeProvider, useTheme } from './theme'

function NavBar({ name, onLogout }: { name: string; onLogout: () => void }) {
  const nav = useNavigate()
  const { theme, setTheme } = useTheme()
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <nav className={`nav ${scrolled ? 'scrolled' : ''}`}>
      <Link to="/" className="logo">{theme.logo}</Link>
      <div className="switcher" role="tablist" aria-label="Look">
        {THEMES.map(t => (
          <button key={t.id} role="tab" aria-selected={t.id === theme.id} className={t.id === theme.id ? 'on' : ''} onClick={() => setTheme(t.id)}>{t.label}</button>
        ))}
      </div>
      <input className="search" placeholder="Titles, genres…" onChange={e => nav(`/search?q=${encodeURIComponent(e.target.value)}`, { replace: true })} />
      <span className="user">{name}</span>
      <button className="btn small" onClick={onLogout}>Sign out</button>
    </nav>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(loadSession)
  const api = useMemo(() => (session ? makeApi(session) : null), [session])
  if (!session || !api) return <ThemeProvider><Login onLogin={setSession} /></ThemeProvider>
  const logout = () => { saveSession(null); setSession(null) }
  return (
    <ThemeProvider>
    <HashRouter>
      <Routes>
        <Route path="/play/:id" element={<Player api={api} />} />
        <Route path="*" element={
          <>
            <NavBar name={session.userName} onLogout={logout} />
            <Routes>
              <Route path="/" element={<Home api={api} />} />
              <Route path="/title/:id" element={<Details api={api} />} />
              <Route path="/search" element={<Search api={api} />} />
            </Routes>
          </>
        } />
      </Routes>
    </HashRouter>
    </ThemeProvider>
  )
}
