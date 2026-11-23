// A server with a certificate it made itself: the app has to be able to sign in to it once the user has trusted it. (The real
// question is a native window, so this run says yes by itself with JELLYFLIX_AUTO_TRUST, which only an unpackaged app honours.)
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { check, ev, finish, ok, sleep, start, typeInto, waitFor } from './lib/rig.mjs'

const PORT = 9811
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jellyflix-tls-'))
const made = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', path.join(dir, 'key.pem'), '-out', path.join(dir, 'cert.pem'), '-subj', '/CN=127.0.0.1', '-days', '2', '-addext', 'subjectAltName=IP:127.0.0.1'], { stdio: 'ignore' })
if (made.status !== 0) { console.log('SKIP  https: openssl is not installed'); process.exit(0) }
const mock = spawn(process.execPath, [fileURLToPath(new URL('./lib/mock-jellyfin.mjs', import.meta.url))], {
  env: { ...process.env, PORT: String(PORT), MOCK_MODE: 'normal', MOCK_TLS_KEY: path.join(dir, 'key.pem'), MOCK_TLS_CERT: path.join(dir, 'cert.pem') }, stdio: 'ignore'
})
await sleep(800)

await start({ tag: 'https', watchSeconds: 120, mocks: [], env: { JELLYFLIX_AUTO_TRUST: '1' } })
try {
  await waitFor(`document.querySelector('.login')`, 30000)
  await typeInto('input[placeholder^="Server"]', `https://127.0.0.1:${PORT}`)
  await typeInto('input[placeholder="Username"]', 'demo')
  await typeInto('input[type=password]', 'demo')
  await ev(`document.querySelector('.login form button').click()`)
  check('https: signing in to a server with its own certificate works once it is trusted', await ok(`document.querySelector('.nav')`, 30000), (await ev(`document.querySelector('.login .error')?.textContent ?? ''`)) ?? '')
  check('https: the server is remembered as trusted', JSON.stringify(await ev(`window.jellyflix.certificates.list()`)) === JSON.stringify([`127.0.0.1:${PORT}`]))
  await ev(`location.hash = '#/settings'`)
  check('https: Settings lists it', await ok(`document.querySelector('[data-setting="trusted"]')?.textContent.includes('127.0.0.1:${PORT}')`, 10000))
  await ev(`document.querySelector('[data-act="forget-cert"]').click()`)
  check('https: and can forget it', await ok(`!document.querySelector('[data-setting="trusted"]')`, 5000) && (await ev(`window.jellyflix.certificates.list()`)).length === 0)
} catch (e) { check('https: ran to the end', false, e.message.split('\n')[0]) }
mock.kill()
fs.rmSync(dir, { recursive: true, force: true })
process.exit(await finish(0))
