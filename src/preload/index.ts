import { contextBridge, ipcRenderer, webFrame } from 'electron'
import type { UpdateInfo } from '../shared/updates'
import type { ZoomKey } from '../shared/zoom'

// The only door between the page and the main process: what the page may ask about updates.
contextBridge.exposeInMainWorld('jellyflix', {
  certificates: {
    list: (): Promise<string[]> => ipcRenderer.invoke('certificates:list'),
    forget: (host: string): Promise<string[]> => ipcRenderer.invoke('certificates:forget', host)
  },
  view: {
    /** Scales the whole page (1 is normal). */
    setScale: (factor: number): void => { if (Number.isFinite(factor)) webFrame.setZoomFactor(Math.min(3, Math.max(0.5, factor))) },
    /** Called when Ctrl or Cmd with + - 0 is pressed (the app handles those keys itself, so the scale stays one setting). */
    onZoomKey: (listener: (key: ZoomKey) => void): (() => void) => {
      const handler = (_event: unknown, key: ZoomKey) => listener(key)
      ipcRenderer.on('view:zoom', handler)
      return () => ipcRenderer.removeListener('view:zoom', handler)
    }
  },
  updates: {
    info: (): Promise<UpdateInfo> => ipcRenderer.invoke('updates:info'),
    check: (): Promise<UpdateInfo> => ipcRenderer.invoke('updates:check'),
    install: (): Promise<void> => ipcRenderer.invoke('updates:install'),
    setAuto: (on: boolean): Promise<UpdateInfo> => ipcRenderer.invoke('updates:auto', on),
    onChange: (listener: (info: UpdateInfo) => void): (() => void) => {
      const handler = (_event: unknown, info: UpdateInfo) => listener(info)
      ipcRenderer.on('updates:changed', handler)
      return () => ipcRenderer.removeListener('updates:changed', handler)
    }
  }
})
