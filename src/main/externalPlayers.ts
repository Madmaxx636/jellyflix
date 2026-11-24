import { ipcMain } from 'electron'
import { spawn } from 'node:child_process'
import { accessSync, constants } from 'node:fs'
import { delimiter, join } from 'node:path'
import { choosePlayer, isOpenableUrl, LOCATIONS, PLAYER_NAMES, playerArgs, type PlayerId, type PlayerInfo } from '../shared/players'

const IDS: PlayerId[] = ['mpv', 'vlc']

const runnable = (path: string) => { try { accessSync(path, constants.X_OK); return true } catch { return false } }
const expand = (path: string) => path.replace(/%([A-Z]+)%/g, (_m, v: string) => process.env[v] ?? '')

/** Where a player is installed, or null. */
function find(id: PlayerId): string | null {
  const where = LOCATIONS[id]
  const platform = process.platform === 'win32' ? 'win32' : process.platform === 'darwin' ? 'darwin' : 'linux'
  for (const path of where[platform]) if (runnable(expand(path))) return expand(path)
  for (const dir of (process.env['PATH'] ?? '').split(delimiter)) {
    for (const name of where.names) if (dir && runnable(join(dir, name))) return join(dir, name)
  }
  return null
}

/** The players that can be started: "Open in external player" in the player, and its choice in Settings. */
export function handleExternalPlayers(isAppUrl: (url: string) => boolean): void {
  const allowed = (event: Electron.IpcMainInvokeEvent) => !!event.senderFrame && isAppUrl(event.senderFrame.url)
  ipcMain.handle('players:list', (event): PlayerInfo[] => {
    if (!allowed(event)) return []
    return IDS.filter(id => find(id)).map(id => ({ id, name: PLAYER_NAMES[id] }))
  })
  ipcMain.handle('players:open', (event, url: unknown, title: unknown, wanted: unknown): string | null => {
    if (!allowed(event)) return 'not allowed'
    if (!isOpenableUrl(url)) return 'That address can not be opened.'
    const installed = IDS.filter(id => find(id))
    const id = choosePlayer(installed, wanted === 'mpv' || wanted === 'vlc' ? wanted : 'auto')
    const path = id && find(id)
    if (!id || !path) return 'No other player was found. Install mpv or VLC.'
    try {
      const child = spawn(path, playerArgs(id, url, typeof title === 'string' ? title : ''), { detached: true, stdio: 'ignore' })
      child.on('error', () => { /* it could not start: nothing more to do */ })
      child.unref()
      return null
    } catch (e) { return (e as Error).message }
  })
}
