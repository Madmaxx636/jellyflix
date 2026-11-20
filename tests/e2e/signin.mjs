// Sign-in checks: the sign-in screen against servers that behave in different ways (Jellyfin 12, an older one, a redirecting
// proxy, something that isn't Jellyfin, nothing at all). Run with `npm run test:e2e:signin`.
import { BASE, check, ev, finish, hasClip, logMark, logSince, logText, ok, shot, sleep, start, skip, waitFor } from './lib/rig.mjs'

const MOCKS = [
  { port: BASE, mode: 'normal' },
  { port: BASE + 1, mode: 'modern' }, // behaves like Jellyfin 12: legacy auth off, old routes gone
  { port: BASE + 2, mode: 'legacy' }, // only understands X-Emby-Authorization (or a proxy that eats Authorization)
  { port: BASE + 3, mode: 'nginx400' }, // plain HTTP sent to an HTTPS port
  { port: BASE + 4, mode: 'notjellyfin' },
  { port: BASE + 5, mode: 'redirect', to: BASE }
]
const at = n => `127.0.0.1:${BASE + n}`
const here = `http://127.0.0.1:${BASE}`

const SCENARIOS = [
  { name: 'ordinary server', server: at(0), expect: 'ok', home: true },
  { name: 'Jellyfin-12-style server (legacy auth off, old routes gone)', server: at(1), expect: 'ok', home: true, play: BASE + 1 },
  { name: 'server behind a 301 redirect', server: at(5), expect: 'ok', saved: here, home: true },
  { name: 'no port typed (falls back to 8096)', server: '127.0.0.1', expect: 'ok', saved: 'http://127.0.0.1:8096', needsDefaultPort: true },
  { name: 'web-UI address pasted', server: `${here}/web/index.html#!/home.html`, expect: 'ok', saved: here },
  { name: 'wrong password', server: at(0), pw: 'nope', expect: /wrong username or password/i },
  { name: 'server that cannot read our Authorization header', server: at(2), expect: /identif|Authorization/i },
  { name: 'plain HTTP sent to an HTTPS port', server: at(3), expect: /couldn.t find|couldn.t reach|https/i },
  { name: 'something that is not Jellyfin', server: at(4), expect: /couldn.t find|not like jellyfin|doesn.t look like/i },
  { name: 'nothing listening', server: '127.0.0.1:9', expect: /couldn.t find|couldn.t reach/i }
]

const J = JSON.stringify
/** Types into a React-controlled input. */
const fill = (sel, v) => ev(`(()=>{const el=document.querySelector(${J(sel)});const d=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');d.set.call(el,${J(v)});el.dispatchEvent(new Event('input',{bubbles:true}))})()`)

async function attempt(server, user, pw) {
  await fill('input[placeholder^="Server"]', server)
  await fill('input[placeholder="Username"]', user)
  await fill('input[type=password]', pw)
  const t0 = Date.now()
  await ev(`document.querySelector('.login form button').click()`)
  await waitFor(`document.querySelector('.nav') || (document.querySelector('.login .error') && !document.querySelector('.login form button').disabled)`, 40000)
  const ms = Date.now() - t0
  if (await ev(`!!document.querySelector('.nav')`)) return { ok: true, ms, saved: await ev(`localStorage.getItem('jellyflix.lastServer')`) }
  return { ok: false, ms, error: await ev(`document.querySelector('.login .error').textContent`) }
}

async function signOut() {
  await ev(`document.querySelector('.avatar').click()`)
  await ev(`document.querySelector('.menu [data-act="signout"]').click()`)
  await waitFor(`document.querySelector('.login')`)
}

const homeLoads = () => ok(`document.querySelectorAll('.row').length >= 10`, 20000)

/** Plays a real clip, leaves, and checks what was sent to the server on the way. */
async function playback(port) {
  await ev(`location.hash='#/play/m4'`)
  await ok(`document.querySelector('.player video') && document.querySelector('.player video').currentTime > 1.5`, 25000)
  const info = await ev(`(()=>{const v=document.querySelector('.player video');return v?{t:+v.currentTime.toFixed(1),w:v.videoWidth,paused:v.paused,err:document.querySelector('.pc-err')?.textContent??null}:null})()`)
  await shot('signin-player')
  const mark = logMark()
  await ev(`location.hash='#/'`) // leaving the page makes the player send its "stopped" report
  await homeLoads(); await sleep(600)
  const text = logText()
  return {
    info,
    master: new RegExp(`\\[${port}\\] GET /Videos/m4/master\\.m3u8\\S* -> (\\d+)`).exec(text)?.[1],
    started: text.includes(`[${port}] POST /Sessions/Playing -> 204`),
    stopped: logSince(mark).includes(`[${port}] POST /Sessions/Playing/Stopped -> 204`) || text.includes(`[${port}] POST /Sessions/Playing/Stopped -> 204`)
  }
}

await start({ tag: process.env.TAG ?? 'signin', mocks: MOCKS, watchSeconds: Number(process.env.WATCH ?? 175) })
let forced = 0
try {
  await waitFor(`document.querySelector('.login')`, 30000)
  for (const s of SCENARIOS) {
    if (s.needsDefaultPort && BASE !== 8096) { skip(s.name, 'needs the mock on the default port 8096'); continue }
    const r = await attempt(s.server, 'demo', s.pw ?? 'demo')
    let pass, detail
    if (s.expect === 'ok') {
      pass = r.ok && (!s.saved || r.saved === s.saved)
      detail = r.ok ? `signed in in ${r.ms} ms, saved address ${r.saved}` : `FAILED: ${r.error}`
      if (r.ok && s.home) { const h = await homeLoads(); pass = pass && h; detail += h ? ', home loaded' : ', HOME DID NOT LOAD' }
      if (r.ok && s.play) {
        if (hasClip) {
          const pb = await playback(s.play)
          pass = pass && !!(pb.master === '200' && pb.info && pb.info.t >= 1.5 && pb.started && pb.stopped)
          detail += `, playback ${JSON.stringify(pb)}`
        } else detail += ', playback skipped (no ffmpeg)'
      }
      if (r.ok) await signOut()
    } else {
      pass = !r.ok && s.expect.test(r.error)
      detail = r.ok ? 'UNEXPECTEDLY SIGNED IN' : `${r.ms} ms — ${r.error}`
      if (r.ok) await signOut()
    }
    check(s.name, pass, detail)
  }
} catch (e) { console.error('RUN ERROR:', e.message); forced = 1 }
process.exit(await finish(forced))
