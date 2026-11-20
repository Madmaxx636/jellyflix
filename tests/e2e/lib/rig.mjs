// The test rig. It starts mock Jellyfin servers and the built app (offscreen, so no window ever appears on the desktop),
// then drives the app over the Chrome DevTools protocol. Shared by features.mjs and signin.mjs.
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureClip } from './clip.mjs'

export const ROOT = fileURLToPath(new URL('../../../', import.meta.url))
const E2E = path.join(ROOT, 'tests/e2e')
export const OUT = path.join(E2E, '.out')
/** The mock servers listen on BASE, BASE+1, ... so two runs can go side by side when given different BASE and CDP values. */
export const BASE = Number(process.env.BASE ?? 8096)
const CDP_PORT = Number(process.env.CDP ?? 9333)
export const sleep = ms => new Promise(r => setTimeout(r, ms))
export const J = JSON.stringify

let ws, nextId = 0, logPath = '', profile = '', procs = [], app = null
const pending = new Map()
/** Exceptions and console errors the page produced, reported at the end. */
export const problems = new Set()
/** Whether a real video clip is available (needs ffmpeg). */
export let hasClip = false

// ---------- start and stop ----------

/** Starts the mock servers and the app, and connects to the app. `mocks` is [{ port, mode, to? }]. */
export async function start({ tag, mocks, watchSeconds = 560 }) {
  fs.mkdirSync(OUT, { recursive: true })
  logPath = path.join(OUT, `${tag}.log`)
  const log = fs.openSync(logPath, 'w')
  const media = ensureClip()
  hasClip = media !== ''
  procs = mocks.map(m => spawn(process.execPath, [path.join(E2E, 'lib/mock-jellyfin.mjs')], {
    env: { ...process.env, PORT: String(m.port), MOCK_MODE: m.mode, MOCK_REDIRECT_TO: String(m.to ?? ''), MOCK_MEDIA: media },
    stdio: ['ignore', log, log]
  }))
  profile = fs.mkdtempSync(path.join(os.tmpdir(), 'jellyflix-e2e-'))
  const electron = createRequire(import.meta.url)('electron') // the package exports the path of the binary
  app = spawn(electron, ['--no-sandbox', `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profile}`, ROOT], {
    cwd: ROOT, env: { ...process.env, JELLYFLIX_HIDDEN: '1' }, stdio: ['ignore', log, log]
  })
  setTimeout(async () => { console.error('WATCHDOG: the run took too long'); process.exit(await finish(2)) }, watchSeconds * 1000).unref()
  await connect(mocks)
}

/** Prints the summary, stops everything and returns the exit code (0 when every check passed). */
export async function finish(forced = 0) {
  const failed = summary()
  for (const p of [...procs, app]) { try { p?.kill('SIGKILL') } catch { /* already gone */ } }
  await sleep(500) // let Electron stop writing to its profile before it is removed
  try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }) } catch { /* a temp folder, harmless */ }
  return forced || (failed ? 1 : 0)
}

async function connect(mocks) {
  for (const m of mocks) for (let i = 0; i < 60; i++) { try { await fetch(`http://127.0.0.1:${m.port}/__state`); break } catch { await sleep(100) } }
  let target
  for (let i = 0; i < 100 && !target; i++) {
    try { target = (await (await fetch(`http://127.0.0.1:${CDP_PORT}/json`)).json()).find(t => t.type === 'page') } catch { /* still starting */ }
    if (!target) await sleep(200)
  }
  if (!target) throw new Error('Electron never exposed a page target')
  ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise(r => ws.addEventListener('open', r, { once: true }))
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data)
    if (m.id && pending.has(m.id)) {
      const { res, rej } = pending.get(m.id)
      pending.delete(m.id)
      if (m.error) rej(new Error(J(m.error))); else res(m.result)
    } else if (m.method === 'Runtime.exceptionThrown') {
      problems.add('exception: ' + (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).slice(0, 300))
    } else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
      problems.add('console.error: ' + m.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 300))
    }
  })
  await send('Page.enable')
  await send('Runtime.enable')
  await viewport(1440, 900)
}

export const viewport = (width, height) => send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false })

// ---------- DevTools protocol ----------

export const send = (method, params = {}) => new Promise((res, rej) => {
  const id = ++nextId
  const t = setTimeout(() => { pending.delete(id); rej(new Error(`DevTools call timed out: ${method}`)) }, 20000)
  pending.set(id, { res: v => { clearTimeout(t); res(v) }, rej: e => { clearTimeout(t); rej(e) } })
  ws.send(J({ id, method, params }))
})

/** Evaluates an expression in the page and returns its value. */
export async function ev(expression) {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) throw new Error('eval failed: ' + (r.exceptionDetails.exception?.description ?? r.exceptionDetails.text) + '\n' + expression.slice(0, 200))
  return r.result.value
}
export async function waitFor(expr, timeout = 15000) {
  const t0 = Date.now()
  for (;;) {
    try { if (await ev(`!!(${expr})`)) return } catch { /* the page is busy */ }
    if (Date.now() - t0 > timeout) throw new Error('timeout waiting for: ' + expr.slice(0, 160))
    await sleep(120)
  }
}
/** waitFor that answers true or false instead of throwing. */
export const ok = (expr, t = 15000) => waitFor(expr, t).then(() => true, () => false)

// ---------- results ----------

const results = []
const shots = []
export function check(name, pass, extra = '') {
  results.push({ pass: !!pass, line: `${pass ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}` })
  console.log(results.at(-1).line)
}
export function skip(name, why) {
  results.push({ pass: true, skipped: true, line: `SKIP  ${name} — ${why}` })
  console.log(results.at(-1).line)
}
function summary() {
  const failed = results.filter(r => !r.pass)
  const skipped = results.filter(r => r.skipped).length
  console.log(`\n===== ${results.length - failed.length - skipped}/${results.length - skipped} checks passed${skipped ? ` (${skipped} skipped)` : ''} =====`)
  if (failed.length) console.log('FAILED:\n' + failed.map(f => f.line).join('\n'))
  if (shots.length) console.log(`\n${shots.length} screenshots in ${path.relative(ROOT, OUT)}`)
  if (problems.size) console.log('\nPAGE PROBLEMS (' + problems.size + '):\n' + [...problems].join('\n'))
  return failed.length
}
export async function shot(name) {
  const { data } = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(data, 'base64'))
  shots.push(name)
}

// ---------- the mock servers, straight from the test ----------

const AUTH = 'MediaBrowser Client="test", Device="test", DeviceId="test", Version="1", Token="tok-demo"'
export const mock = async (p, port = BASE) => (await fetch(`http://127.0.0.1:${port}${p}`, { headers: { Authorization: AUTH } })).json()
export const mockPost = (p, method = 'POST', port = BASE) => fetch(`http://127.0.0.1:${port}${p}`, { method, headers: { Authorization: AUTH } })
/** What the mock has recorded for an item: favourite and watched flags, and the position the player last reported. */
export const state = async (id, port = BASE) => (await fetch(`http://127.0.0.1:${port}/__state?id=${id}`)).json()
export const reset = (port = BASE) => fetch(`http://127.0.0.1:${port}/__reset`)
/** Makes signed-in requests whose path contains `match` fail with `status` until `heal` (match '' means all of them, like a revoked token). */
export const fail = (match, status, port = BASE) => fetch(`http://127.0.0.1:${port}/__fail?match=${encodeURIComponent(match)}&status=${status}`)
export const heal = (match, port = BASE) => fetch(`http://127.0.0.1:${port}/__fail?match=${encodeURIComponent(match)}`)
export const logText = () => fs.readFileSync(logPath, 'utf8')
export const logMark = () => fs.statSync(logPath).size
export const logSince = mark => logText().slice(mark)
export async function pollLog(mark, re, tries = 40) {
  for (let i = 0; i < tries; i++) { if (re.test(logSince(mark))) return true; await sleep(150) }
  return false
}
export async function pollState(id, pred, tries = 20, port = BASE) {
  for (let i = 0; i < tries; i++) { if (pred(await state(id, port))) return true; await sleep(150) }
  return false
}

// ---------- driving the page ----------

export const count = sel => ev(`document.querySelectorAll(${J(sel)}).length`)
export const exists = async sel => (await count(sel)) > 0
export const textOf = sel => ev(`document.querySelector(${J(sel)})?.textContent?.trim() ?? null`)
export const texts = sel => ev(`[...document.querySelectorAll(${J(sel)})].map(e => e.textContent.trim())`)
export const click = sel => ev(`(()=>{const e=document.querySelector(${J(sel)});if(!e)return false;e.click();return true})()`)
export const clickText = (sel, t) => ev(`(()=>{const e=[...document.querySelectorAll(${J(sel)})].find(x=>x.textContent.trim()===${J(t)});if(!e)return false;e.click();return true})()`)
/** Types into a React-controlled input. */
export const typeInto = (sel, v) => ev(`(()=>{const el=document.querySelector(${J(sel)});const d=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');d.set.call(el,${J(v)});el.dispatchEvent(new Event('input',{bubbles:true}))})()`)
export const setSelect = (sel, v) => ev(`(()=>{const el=document.querySelector(${J(sel)});const d=Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value');d.set.call(el,${J(v)});el.dispatchEvent(new Event('change',{bubbles:true}))})()`)
export const hash = () => ev('location.hash')
/** Navigates inside the app and, if `ready` is given, waits for that expression to become true. */
export async function goto(to, ready, timeout = 20000) {
  await ev(`location.hash=${J(to)}`)
  return ready ? ok(ready, timeout) : true
}
const inView = `[...document.images].filter(i=>{const r=i.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth}).every(i=>i.complete&&i.naturalWidth>0)`
/** Waits for the pictures on screen to load. */
export async function settle() { await ok(inView, 15000); await sleep(450) }
