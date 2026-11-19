import { useEffect, useRef, useState } from 'react'
import { findServer, login, publicUserImage, publicUsers, saveSession, type PublicUser, type Session } from '../api/jellyfin'
import { hueOf } from '../util/library'

export default function Login({ onLogin }: { onLogin: (s: Session) => void }) {
  const [server, setServer] = useState(localStorage.getItem('jellyflix.lastServer') ?? '')
  const [user, setUser] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [users, setUsers] = useState<PublicUser[]>([])
  const [base, setBase] = useState('')
  const pwRef = useRef<HTMLInputElement>(null)

  /** If the server lists its profiles, show them to pick from, like a "Who's watching?" screen. */
  async function lookup(addr: string) {
    if (!addr.trim()) { setUsers([]); return }
    const found = await findServer(addr).catch(() => null)
    if (!found?.info) { setUsers([]); return }
    setBase(found.server)
    setUsers(await publicUsers(found.server))
  }
  // Only the remembered server is checked on its own; a typed address waits until you leave the field,
  // so half-typed addresses never get probed.
  useEffect(() => { if (server) lookup(server) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      const s = await login(server, user, pw)
      localStorage.setItem('jellyflix.lastServer', s.server)
      saveSession(s)
      onLogin(s)
    } catch (e) {
      setErr((e as Error).message) // already worded for the user: what failed, what the server said, what to check
    } finally { setBusy(false) }
  }

  return (
    <div className="login">
      <h1 className="logo">JELLYFLIX</h1>
      {users.length > 0 && (
        <div className="profiles" role="group" aria-label="Who's watching?">
          <h2>Who's watching?</h2>
          <div className="profile-list">
            {users.map(u => {
              const img = publicUserImage(base, u)
              return (
                <button type="button" key={u.Id} data-profile={u.Name} className={`profile ${user === u.Name ? 'on' : ''}`}
                  onClick={() => { setUser(u.Name); setTimeout(() => pwRef.current?.focus(), 0) }}>
                  {img ? <img src={img} alt="" /> : <span className="pic" style={{ background: `hsl(${hueOf(u.Name)} 55% 42%)` }}>{u.Name.slice(0, 1).toUpperCase()}</span>}
                  <span className="pname">{u.Name}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
      <form onSubmit={submit}>
        <h2>Sign In</h2>
        <input placeholder="Server (e.g. 192.168.1.10:8096)" value={server} onChange={e => setServer(e.target.value)} onBlur={() => lookup(server)} required />
        <input placeholder="Username" value={user} onChange={e => setUser(e.target.value)} required autoFocus />
        <input ref={pwRef} placeholder="Password" type="password" value={pw} onChange={e => setPw(e.target.value)} />
        {err && <p className="error">{err}</p>}
        <button className="btn primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign In'}</button>
      </form>
    </div>
  )
}
