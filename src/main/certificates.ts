import { app, dialog, ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from 'electron'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { decideTrust } from '../shared/certs'

const file = () => join(app.getPath('userData'), 'trusted-certificates.json')
const load = (): Record<string, string> => {
  try {
    const raw: unknown = JSON.parse(readFileSync(file(), 'utf8'))
    return raw && typeof raw === 'object' ? Object.fromEntries(Object.entries(raw).filter(([, v]) => typeof v === 'string')) as Record<string, string> : {}
  } catch { return {} }
}
const save = (trusted: Record<string, string>) => { try { writeFileSync(file(), JSON.stringify(trusted, null, 2)) } catch { /* it will be asked again next time */ } }

/**
 * Home servers often use a certificate they made themselves. Instead of refusing them, the first time a server shows one the
 * user is asked whether to trust it; the choice is remembered for that server, for that exact certificate. (A test run, which is
 * not packaged, can set JELLYFLIX_AUTO_TRUST=1 to say yes without a window.)
 */
export function handleCertificates(isAppUrl: (url: string) => boolean, parent: () => BrowserWindow | undefined): void {
  const asking = new Map<string, Promise<boolean>>()
  const autoTrust = !app.isPackaged && process.env['JELLYFLIX_AUTO_TRUST'] === '1'

  app.on('certificate-error', (event, _contents, url, error, certificate, callback) => {
    event.preventDefault()
    let host: string
    try { host = new URL(url).host } catch { return callback(false) }
    if (isAppUrl(url)) return callback(false)
    const trusted = load()
    const decision = decideTrust(trusted, host, certificate.fingerprint)
    if (decision === 'trusted') return callback(true)

    const key = `${host}|${certificate.fingerprint}`
    let answer = asking.get(key)
    if (!answer) {
      answer = (async () => {
        const yes = autoTrust || (await dialog.showMessageBox(parent() ?? ({} as BrowserWindow), {
          type: 'warning',
          title: 'Certificate not trusted',
          message: decision === 'ask-changed' ? `${host} now shows a different certificate than the one you trusted.` : `${host} shows a certificate this computer doesn't trust (${error}).`,
          detail: `Issued to: ${certificate.subjectName}\nIssued by: ${certificate.issuerName}\nFingerprint: ${certificate.fingerprint}\n\nOnly continue if this is your own server. A changed certificate can also mean someone is in between.`,
          buttons: ['Trust this server', 'Cancel'], defaultId: 1, cancelId: 1, noLink: true
        })).response === 0
        if (yes) save({ ...load(), [host]: certificate.fingerprint })
        return yes
      })().finally(() => asking.delete(key))
      asking.set(key, answer)
    }
    void answer.then(callback)
  })

  const trustedOnly = (e: IpcMainInvokeEvent) => { if (!e.senderFrame || !isAppUrl(e.senderFrame.url)) throw new Error('not allowed') }
  ipcMain.handle('certificates:list', e => { trustedOnly(e); return Object.keys(load()) })
  ipcMain.handle('certificates:forget', (e, host: unknown) => {
    trustedOnly(e)
    const trusted = load()
    if (typeof host === 'string') delete trusted[host]
    save(trusted)
    return Object.keys(trusted)
  })
}
