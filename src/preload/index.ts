import { contextBridge, ipcRenderer } from 'electron'
import type { UpdateInfo } from '../shared/updates'

// The only door between the page and the main process: what the page may ask about updates.
contextBridge.exposeInMainWorld('jellyflix', {
  certificates: {
    list: (): Promise<string[]> => ipcRenderer.invoke('certificates:list'),
    forget: (host: string): Promise<string[]> => ipcRenderer.invoke('certificates:forget', host)
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
