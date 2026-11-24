// Other video players the app can hand a title to, and how each is started. Plain data and functions (no Electron in here).

export type PlayerId = 'mpv' | 'vlc'

export interface PlayerInfo { id: PlayerId; name: string }

/** Where each player usually lives, besides the search path. */
export const LOCATIONS: Record<PlayerId, { win32: string[]; darwin: string[]; linux: string[]; names: string[] }> = {
  mpv: {
    win32: ['C:\\Program Files\\mpv\\mpv.exe', 'C:\\Program Files (x86)\\mpv\\mpv.exe', '%LOCALAPPDATA%\\Programs\\mpv\\mpv.exe', '%LOCALAPPDATA%\\Microsoft\\WinGet\\Links\\mpv.exe'],
    darwin: ['/opt/homebrew/bin/mpv', '/usr/local/bin/mpv', '/Applications/mpv.app/Contents/MacOS/mpv'],
    linux: ['/usr/bin/mpv', '/usr/local/bin/mpv', '/snap/bin/mpv'],
    names: ['mpv', 'mpv.exe']
  },
  vlc: {
    win32: ['C:\\Program Files\\VideoLAN\\VLC\\vlc.exe', 'C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe'],
    darwin: ['/Applications/VLC.app/Contents/MacOS/VLC'],
    linux: ['/usr/bin/vlc', '/usr/local/bin/vlc', '/snap/bin/vlc'],
    names: ['vlc', 'vlc.exe']
  }
}

export const PLAYER_NAMES: Record<PlayerId, string> = { mpv: 'mpv', vlc: 'VLC' }

/** Is this something safe to hand to another program as an address to open? Only web addresses are. */
export function isOpenableUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 4000) return false
  try { return ['http:', 'https:'].includes(new URL(value).protocol) } catch { return false }
}

/** The arguments for a player, as a list (never joined into one command line). A title is shown in the window when it can be. */
export function playerArgs(id: PlayerId, url: string, title: string): string[] {
  const name = title.replace(/[\r\n]+/g, ' ').slice(0, 200)
  return id === 'mpv' ? [`--force-media-title=${name}`, '--', url] : [`--meta-title=${name}`, '--', url]
}

/** Which of the installed players to use: the one asked for if it is there, else the first found (mpv before VLC). */
export function choosePlayer(installed: PlayerId[], wanted: 'auto' | PlayerId): PlayerId | null {
  if (wanted !== 'auto' && installed.includes(wanted)) return wanted
  return installed[0] ?? null
}
