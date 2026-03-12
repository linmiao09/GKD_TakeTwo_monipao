import { ElectronAPI } from '@electron-toolkit/preload'

interface Api {
  checkLdPath: (path: string) => Promise<boolean>;
  sendLocate: (params: any) => Promise<boolean>;
  launchEmulator: (params: any) => Promise<boolean>;
  startSimulation: (params: any) => Promise<void>;
  pauseSimulation: () => void;
  resumeSimulation: () => void;
  stopSimulation: () => void;
  onSimProgress: (callback: (data: any) => void) => void;
  onSimDone: (callback: () => void) => void;
  onSimStopped: (callback: () => void) => void;
  onSimError: (callback: (err: string) => void) => void;
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
