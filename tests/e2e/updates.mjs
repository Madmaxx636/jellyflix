// Update checks: the app is pointed at a fake release server (that is only allowed for an app that is not packaged) which
// has a newer version, and has to notice it, download it, check it and offer the restart. Run with `npm run test:e2e:updates`.
import crypto from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { BASE, check, count, ev, exists, finish, ok, reset, send, sleep, start, textOf, waitFor } from './lib/rig.mjs'
import { signInTo } from './lib/app.mjs'

const NAME = 'Jellyflix-9.9.9-linux-x86_64.AppImage'
const payload = crypto.randomBytes(300_000) // stands in for the new version
const sha512 = crypto.createHash('sha512').update(payload).digest('base64')
const manifest = `version: 9.9.9\nfiles:\n  - url: ${NAME}\n    sha512: ${sha512}\n    size: ${payload.length}\npath: ${NAME}\nsha512: ${sha512}\nreleaseDate: '2026-11-23T00:00:00.000Z'\n`
const asked = []
const feed = http.createServer((req, res) => {
  asked.push(req.url)
  if (req.url.startsWith('/latest')) { res.writeHead(200, { 'Content-Type': 'text/yaml' }); return res.end(manifest) }
  if (req.url.includes('9.9.9')) { res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': payload.length }); return res.end(payload) }
  res.writeHead(404); res.end()
})
await new Promise(r => feed.listen(0, '127.0.0.1', r))
const url = `http://127.0.0.1:${feed.address().port}`
// The Linux updater replaces the AppImage it was started from, so it wants to know which file that is.
const appImageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jellyflix-appimage-'))
const appImage = path.join(appImageDir, 'Jellyflix-0.0.1-linux-x86_64.AppImage')
fs.writeFileSync(appImage, crypto.randomBytes(50_000))

await start({ tag: 'updates', watchSeconds: 150, mocks: [{ port: BASE, mode: 'normal' }], env: { JELLYFLIX_UPDATE_FEED: url, APPIMAGE: appImage } })
try {
  await waitFor(`document.querySelector('.login')`, 30000)
  check('updates: a newer version is found, downloaded and offered', await ok(`document.querySelector('.update-banner')?.textContent.includes('9.9.9 is ready to install')`, 30000), (await textOf('.update-banner')) ?? '')
  check('updates: the offer has a restart button', await exists('.update-banner [data-act="restart-update"]'))
  check('updates: the app asked the server for the list and then the file', asked.some(u => u.startsWith('/latest')) && asked.some(u => u.includes('9.9.9')), JSON.stringify(asked))
  await send('Runtime.evaluate', { expression: `document.querySelector('.update-banner [data-act="later"]').click()` })
  check('updates: "Later" puts it away', await ok(`!document.querySelector('.update-banner')`, 3000))

  await reset(); await signInTo(BASE)
  await ev(`location.hash = '#/settings'`)
  await waitFor(`document.querySelector('[data-setting="updates"]')`, 15000)
  check('updates: Settings says a version is ready', await ok(`document.querySelector('[data-setting="updates"] .set-value')?.textContent.includes('9.9.9 is ready')`, 10000), (await textOf('[data-setting="updates"] .set-value')) ?? '')
  check('updates: automatic checking starts on', await ev(`document.querySelector('[data-setting="autoUpdate"] input').checked`))
  await ev(`document.querySelector('[data-setting="autoUpdate"] input').click()`); await sleep(400)
  await send('Page.reload'); await waitFor(`document.querySelector('[data-setting="autoUpdate"]')`, 20000)
  check('updates: turning it off is remembered', (await ev(`document.querySelector('[data-setting="autoUpdate"] input').checked`)) === false)
  check('updates: "Check now" is there', (await count('[data-act="check-updates"]')) === 1)
} catch (e) { check('updates: ran to the end', false, e.message.split('\n')[0]) }
feed.close()
fs.rmSync(appImageDir, { recursive: true, force: true })
process.exit(await finish(0))
