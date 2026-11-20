import { useEffect, useRef, useState, type FormEvent } from 'react'
import { findServer, lastServer, login, publicUserImage, publicUsers, rememberServer, saveSession, type PublicUser, type Session } from '../api/jellyfin'
import { usePageTitle } from '../hooks/usePageTitle'
import { hueOf } from '../util/library'

interface Profiles { server: string; users: PublicUser[] }

/** Asks a server who can sign in, for the "Who's watching?" row. A server that doesn't answer like Jellyfin has no profiles. */
async function discoverProfiles(address: string): Promise<Profiles> {
  const found = await findServer(address).catch(() => null)
  if (!found?.info) return { server: '', users: [] }
  return { server: found.server, users: await publicUsers(found.server) }
}

/** The sign-in screen. `notice` is shown above the form, e.g. when the server ended the last session. */
export default function Login({ onLogin, notice }: { onLogin: (s: Session) => void; notice?: string }) {
  usePageTitle('Sign in')
  const [server, setServer] = useState(lastServer)
  const [user, setUser] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [profiles, setProfiles] = useState<Profiles>({ server: '', users: [] })
  const pwRef = useRef<HTMLInputElement>(null)
  const lookups = useRef(0)

  // Only the newest lookup may update the screen: a slow answer for an address you have since changed is dropped.
  // Only the remembered server is checked on its own; a typed address waits until you leave the field,
  // so half-typed addresses never get probed.
  useEffect(() => {
    const remembered = lastServer()
    if (!remembered) return
    const mine = ++lookups.current
    void discoverProfiles(remembered).then(found => { if (mine === lookups.current) setProfiles(found) })
  }, [])

  const lookUp = () => {
    const mine = ++lookups.current
    if (!server.trim()) { setProfiles({ server: '', users: [] }); return }
    void discoverProfiles(server).then(found => { if (mine === lookups.current) setProfiles(found) })
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      const s = await login(server, user, pw)
      rememberServer(s.server)
      saveSession(s)
      onLogin(s)
    } catch (failure) {
      setErr((failure as Error).message) // already worded for the user: what failed, what the server said, what to check
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="login">
      <h1 className="logo">JELLYFLIX</h1>
      {notice && <p className="notice" role="status">{notice}</p>}
      {profiles.users.length > 0 && (
        <div className="profiles" role="group" aria-labelledby="who">
          <h2 id="who">Who's watching?</h2>
          <div className="profile-list">
            {profiles.users.map(u => {
              const img = publicUserImage(profiles.server, u)
              return (
                <button type="button" key={u.Id} data-profile={u.Name} aria-pressed={user === u.Name} className={`profile ${user === u.Name ? 'on' : ''}`}
                  onClick={() => { setUser(u.Name); setTimeout(() => pwRef.current?.focus(), 0) }}>
                  {img ? <img src={img} alt="" /> : <span className="pic" aria-hidden="true" style={{ background: `hsl(${hueOf(u.Name)} 55% 42%)` }}>{u.Name.slice(0, 1).toUpperCase()}</span>}
                  <span className="pname">{u.Name}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
      <form onSubmit={submit}>
        <h2>Sign In</h2>
        <input aria-label="Server address" placeholder="Server (e.g. 192.168.1.10:8096)" value={server} onChange={e => setServer(e.target.value)} onBlur={lookUp}
          type="text" inputMode="url" autoComplete="url" autoCapitalize="none" spellCheck={false} required />
        <input aria-label="Username" placeholder="Username" value={user} onChange={e => setUser(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} required />
        <input ref={pwRef} aria-label="Password" placeholder="Password" type="password" value={pw} onChange={e => setPw(e.target.value)} autoComplete="current-password" />
        {err && <p className="error" role="alert">{err}</p>}
        <button className="btn primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign In'}</button>
      </form>
    </main>
  )
}
