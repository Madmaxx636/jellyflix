import { useEffect, useRef, useState } from 'react'
import { Link, NavLink as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import type { Api, Session } from '../api/jellyfin'
import { THEMES, useTheme, type NavLink as NavItem } from '../theme'
import Avatar from './Avatar'
import Icon from './Icon'

type Menu = 'more' | 'look' | 'profile' | 'burger'

/** The top bar. Which links it has, where search lives and what it is called all depend on the look. */
export default function NavBar({ session, api, onLogout }: { session: Session; api: Api; onLogout: () => void }) {
  const { theme, setTheme } = useTheme()
  const nav = useNavigate()
  const loc = useLocation()
  const root = useRef<HTMLElement>(null)
  const searchBox = useRef<HTMLInputElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const [menu, setMenu] = useState<Menu | null>(null)
  // Moving to another page closes an open menu. (Reset here, while rendering, rather than in an effect: nothing is drawn
  // with the stale value, and the menu can't come back when you return to the page it was opened on.)
  const [pageKey, setPageKey] = useState(loc.key)
  if (pageKey !== loc.key) { setPageKey(loc.key); setMenu(null) }
  const [searchOpen, setSearchOpen] = useState(false)
  const w = theme.words
  const onSearchPage = loc.pathname === '/search'
  const q = onSearchPage ? new URLSearchParams(loc.search).get('q') ?? '' : ''

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  // While a menu is open: clicking or tabbing away closes it, and Esc closes it and hands focus back to the button that opened it.
  useEffect(() => {
    if (!menu) return
    const leave = (e: Event) => { if (!root.current?.contains(e.target as Node)) setMenu(null) }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      root.current?.querySelector<HTMLElement>('[aria-expanded="true"]')?.focus()
      setMenu(null)
    }
    document.addEventListener('pointerdown', leave)
    document.addEventListener('focusin', leave)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', leave)
      document.removeEventListener('focusin', leave)
      document.removeEventListener('keydown', onKey)
    }
  }, [menu])
  useEffect(() => { if (searchOpen) searchBox.current?.focus() }, [searchOpen])

  const toggle = (m: Menu) => setMenu(menu === m ? null : m)
  const search = (v: string) => nav(`/search?q=${encodeURIComponent(v)}`, { replace: onSearchPage })
  const link = (l: NavItem) => (
    <RouterLink key={l.to} to={l.to} end={l.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
      {theme.navIcons && l.icon && <Icon name={l.icon} size={18} />}<span>{l.label}</span>
    </RouterLink>
  )

  return (
    <nav ref={root} aria-label="Main" className={`nav ${scrolled ? 'scrolled' : ''}`}>
      <Link to="/" className="logo">{theme.logo}</Link>

      <div className="nav-links">
        {theme.nav.map(l => link(l))}
        <div className="nav-menu">
          <button className="nav-more" onClick={() => toggle('more')} aria-expanded={menu === 'more'}>
            <span>{theme.more.label}</span><Icon name="chevron" size={14} />
          </button>
          {menu === 'more' && <div className="menu">{theme.more.links.map(l => link(l))}</div>}
        </div>
      </div>

      <div className="nav-right">
        {theme.search === 'icon-expand' && (
          <div className={`nav-search ${searchOpen || q ? 'open' : ''}`}>
            <button aria-label="Search" aria-expanded={searchOpen || !!q} onClick={() => setSearchOpen(o => !o)}><Icon name="search" size={20} /></button>
            {(searchOpen || q) && (
              <input ref={searchBox} value={q} placeholder={w.searchHint} aria-label="Search" onChange={e => search(e.target.value)}
                onBlur={() => { if (!q) setSearchOpen(false) }} onKeyDown={e => { if (e.key === 'Escape') setSearchOpen(false) }} />
            )}
          </div>
        )}
        {theme.search === 'bar' && (
          <div className="nav-search bar">
            <Icon name="search" size={16} />
            <input value={q} placeholder={w.searchHint} aria-label="Search" onChange={e => search(e.target.value)} />
          </div>
        )}
        {theme.search === 'page' && theme.id !== 'disney' && (
          <Link className="nav-iconlink" to="/search" aria-label="Search"><Icon name="search" size={20} /></Link>
        )}

        <div className="nav-menu look">
          <button className="look-btn" onClick={() => toggle('look')} aria-expanded={menu === 'look'} aria-label={`Change look (now ${theme.label})`}>
            <span>{theme.label}</span><Icon name="chevron" size={14} />
          </button>
          {menu === 'look' && (
            <div className="menu right">
              {THEMES.map(t => (
                <button key={t.id} aria-pressed={t.id === theme.id} data-look={t.id} className={t.id === theme.id ? 'on' : ''}
                  onClick={() => { setTheme(t.id); setMenu(null) }}>{t.label}</button>
              ))}
            </div>
          )}
        </div>

        <div className="nav-menu profile">
          <button className="avatar" onClick={() => toggle('profile')} aria-expanded={menu === 'profile'} aria-label={`Profile: ${session.userName}`}>
            <Avatar api={api} name={session.userName} />
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
          {[...theme.nav, ...theme.more.links, { to: '/settings', label: w.settings }].map(l => link(l))}
          {theme.search !== 'page' && <Link to="/search">Search</Link>}
        </div>
      )}
    </nav>
  )
}
