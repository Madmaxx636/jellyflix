import { useState } from 'react'
import { login, saveSession, Session } from '../api/jellyfin'

export default function Login({ onLogin }: { onLogin: (s: Session) => void }) {
  const [server, setServer] = useState(localStorage.getItem('jellyflix.lastServer') ?? '')
  const [user, setUser] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

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
      <form onSubmit={submit}>
        <h2>Sign In</h2>
        <input placeholder="Server (e.g. 192.168.1.10:8096)" value={server} onChange={e => setServer(e.target.value)} required />
        <input placeholder="Username" value={user} onChange={e => setUser(e.target.value)} required autoFocus />
        <input placeholder="Password" type="password" value={pw} onChange={e => setPw(e.target.value)} />
        {err && <p className="error">{err}</p>}
        <button className="btn primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign In'}</button>
      </form>
    </div>
  )
}
