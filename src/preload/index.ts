import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  checkLdPath: (path: string) => ipcRenderer.invoke('check-ld-path', path),
  sendLocate: (params: any) => ipcRenderer.invoke('send-locate', params),
  launchEmulator: (params: any) => ipcRenderer.invoke('launch-emulator', params),
  startSimulation: (params: any) => ipcRenderer.invoke('start-simulation', params),
  pauseSimulation: () => ipcRenderer.send('pause-simulation'),
  resumeSimulation: () => ipcRenderer.send('resume-simulation'),
  stopSimulation: () => ipcRenderer.send('stop-simulation'),
  onSimProgress: (callback: any) => ipcRenderer.on('sim-progress', (_, data) => callback(data)),
  onSimDone: (callback: any) => ipcRenderer.on('sim-done', () => callback()),
  onSimStopped: (callback: any) => ipcRenderer.on('sim-stopped', () => callback()),
  onSimError: (callback: any) => ipcRenderer.on('sim-error', (_, err) => callback(err))
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
