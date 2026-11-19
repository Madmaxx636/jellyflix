import { useEffect, useRef, useState } from 'react'
import { Link, NavLink as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import type { Api, Session } from '../api/jellyfin'
import { THEMES, useTheme, type NavLink as NavItem } from '../theme'
import { hueOf } from '../util/library'
import Icon from './Icon'

type Menu = 'more' | 'look' | 'profile' | 'burger' | null

/** The top bar. Which links it has, where search lives and what it is called all depend on the look. */
export default function NavBar({ session, api, onLogout }: { session: Session; api: Api; onLogout: () => void }) {
  const { theme, setTheme } = useTheme()
  const nav = useNavigate()
  const loc = useLocation()
  const root = useRef<HTMLElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const [menu, setMenu] = useState<Menu>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const w = theme.words
  const onSearchPage = loc.pathname === '/search'
  const q = onSearchPage ? new URLSearchParams(loc.search).get('q') ?? '' : ''
  const avatar = api.avatar()

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  useEffect(() => { setMenu(null) }, [loc.pathname])
  useEffect(() => {
    const close = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setMenu(null) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])

  const toggle = (m: Exclude<Menu, null>) => setMenu(cur => (cur === m ? null : m))
  const search = (v: string) => nav(`/search?q=${encodeURIComponent(v)}`, { replace: onSearchPage })
  const link = (l: NavItem) => (
    <RouterLink key={l.to} to={l.to} end={l.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
      {theme.navIcons && l.icon && <Icon name={l.icon} size={18} />}<span>{l.label}</span>
    </RouterLink>
  )

  return (
    <nav ref={root} className={`nav ${scrolled ? 'scrolled' : ''}`}>
      <Link to="/" className="logo">{theme.logo}</Link>

      <div className="nav-links">
        {theme.nav.map(link)}
        <div className="nav-menu">
          <button className="nav-more" onClick={() => toggle('more')} aria-expanded={menu === 'more'}>
            <span>{theme.more.label}</span><Icon name="chevron" size={14} />
          </button>
          {menu === 'more' && <div className="menu">{theme.more.links.map(link)}</div>}
        </div>
      </div>

      <div className="nav-right">
        {theme.search === 'icon-expand' && (
          <div className={`nav-search ${searchOpen || q ? 'open' : ''}`}>
            <button aria-label="Search" onClick={() => setSearchOpen(o => !o)}><Icon name="search" size={20} /></button>
            {(searchOpen || q) && (
              <input autoFocus value={q} placeholder={w.searchHint} onChange={e => search(e.target.value)}
                onBlur={() => { if (!q) setSearchOpen(false) }} onKeyDown={e => { if (e.key === 'Escape') setSearchOpen(false) }} />
            )}
          </div>
        )}
        {theme.search === 'bar' && (
          <div className="nav-search bar">
            <Icon name="search" size={16} />
            <input value={q} placeholder={w.searchHint} onChange={e => search(e.target.value)} />
          </div>
        )}
        {theme.search === 'page' && theme.id !== 'disney' && (
          <Link className="nav-iconlink" to="/search" aria-label="Search"><Icon name="search" size={20} /></Link>
        )}

        <div className="nav-menu look">
          <button className="look-btn" onClick={() => toggle('look')} aria-expanded={menu === 'look'} aria-label="Change look">
            <span>{theme.label}</span><Icon name="chevron" size={14} />
          </button>
          {menu === 'look' && (
            <div className="menu right">
              {THEMES.map(t => (
                <button key={t.id} data-look={t.id} className={t.id === theme.id ? 'on' : ''} onClick={() => { setTheme(t.id); setMenu(null) }}>{t.label}</button>
              ))}
            </div>
          )}
        </div>

        <div className="nav-menu profile">
          <button className="avatar" onClick={() => toggle('profile')} aria-expanded={menu === 'profile'} aria-label="Profile">
            {avatar
              ? <img src={avatar} alt="" />
              : <span style={{ background: `hsl(${hueOf(session.userName)} 55% 42%)` }}>{session.userName.slice(0, 1).toUpperCase()}</span>}
          </button>
          {menu === 'profile' && (
            <div className="menu right">
              <div className="menu-head">{session.userName}</div>
              <Link to="/settings" data-act="settings"><Icon name="sliders" size={16} />{w.settings}</Link>
              <Link to="/mylist"><Icon name="plus" size={16} />{w.myList}</Link>
              <button onClick={onLogout} data-act="switch"><Icon name="user" size={16} />{w.switchProfile}</button>
              <button onClick={onLogout} data-act="signout">Sign out</button>
            </div>
          )}
        </div>

        <button className="nav-burger" onClick={() => toggle('burger')} aria-label="Menu" aria-expanded={menu === 'burger'}><Icon name="menu" size={22} /></button>
      </div>

      {menu === 'burger' && (
        <div className="burger-panel">
          {[...theme.nav, ...theme.more.links, { to: '/settings', label: w.settings }].map(link)}
          {theme.search !== 'page' && <Link to="/search">Search</Link>}
        </div>
      )}
    </nav>
  )
}
