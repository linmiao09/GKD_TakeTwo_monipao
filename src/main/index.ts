import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { execFile, spawn } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'

const execFileAsync = promisify(execFile)

let mainWindow: BrowserWindow | null = null
let simulationInterval: NodeJS.Timeout | null = null
let isPaused = false
let stopRequested = false

function findConsoleExe(ldPath: string): string | null {
  if (!ldPath) return null
  const dnPath = join(ldPath, 'dnconsole.exe')
  if (fs.existsSync(dnPath)) return dnPath
  const ldConsolePath = join(ldPath, 'ldconsole.exe')
  if (fs.existsSync(ldConsolePath)) return ldConsolePath
  return null
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 900,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// --- IPC Handlers ---

ipcMain.handle('check-ld-path', async (_event, pathStr: string) => {
  return findConsoleExe(pathStr) !== null
})

ipcMain.handle('send-locate', async (_event, params: any) => {
  try {
    const consoleExe = findConsoleExe(params.ldPath)
    if (!consoleExe) throw new Error('Console exe not found')
    const lliArg = `${params.lng},${params.lat}`
    await execFileAsync(consoleExe, ['locate', '--index', params.index.toString(), '--LLI', lliArg], { 
      windowsHide: true,
      shell: true 
    })
    return true
  } catch (err: any) {
    console.error('send-locate error:', err)
    throw err
  }
})

ipcMain.handle('launch-emulator', async (_event, params: any) => {
  try {
    const consoleExe = findConsoleExe(params.ldPath)
    if (!consoleExe) throw new Error('Console exe not found')
    
    // Check if file exists and is not a directory
    const stats = fs.statSync(consoleExe)
    if (!stats.isFile()) throw new Error('Target is not a file')

    const child = spawn(consoleExe, ['launch', '--index', params.index.toString()], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      shell: true
    })
    
    child.on('error', (err) => {
      console.error('Child spawn error:', err)
      if (mainWindow) mainWindow.webContents.send('sim-error', `Spawn error: ${err.message}`)
    })

    child.unref()
    return true
  } catch (err: any) {
    console.error('launch-emulator error:', err)
    throw err
  }
})

ipcMain.handle('start-simulation', async (_event, params: any) => {
  stopRequested = false
  isPaused = false
  const consoleExe = findConsoleExe(params.ldPath)
  if (!consoleExe) {
    if (mainWindow) mainWindow.webContents.send('sim-error', 'Console exe not found')
    return
  }

  let currentIndex = 0
  const totalPoints = params.points.length
  let currentTargetPace = params.baseDelayMs
  let currentActualDelay = params.baseDelayMs

  const runTick = async (): Promise<void> => {
    if (stopRequested) {
      mainWindow?.webContents.send('sim-stopped')
      return
    }
    if (isPaused) {
      simulationInterval = setTimeout(runTick, 500)
      return
    }
    if (currentIndex >= totalPoints) {
      mainWindow?.webContents.send('sim-done')
      return
    }

    const currentItem = params.points[currentIndex]
    let { latitude: finalLat, longitude: finalLng } = currentItem.point

    if (params.useRandomOffset && Math.random() < params.randomChance) {
      const offsetMeters = (Math.random() * 2 - 1) * params.randomRange
      const approxDegreeOffset = offsetMeters / 111111
      const latRad = ((currentItem.bearing + 90) % 360) * (Math.PI / 180)
      finalLat += Math.cos(latRad) * approxDegreeOffset
      finalLng += Math.sin(latRad) * approxDegreeOffset
    }

    try {
      await execFileAsync(consoleExe, ['locate', '--index', params.index.toString(), '--LLI', `${finalLng},${finalLat}`], { 
        windowsHide: true,
        shell: true 
      })
    } catch (e: any) {
      console.error('Tick exec error:', e)
      if (mainWindow) mainWindow.webContents.send('sim-error', `Exec error: ${e.message}`)
      // Optionally stop on error
      // stopRequested = true; return;
    }

    if (mainWindow && currentIndex % 10 === 0) {
      mainWindow.webContents.send('sim-progress', { current: currentIndex + 1, total: totalPoints, lat: finalLat, lng: finalLng })
    }

    currentIndex++
    let nextDelay = params.baseDelayMs
    if (params.useSmooth && params.minPace && params.maxPace) {
      if (currentIndex % 15 === 0) {
        const nextPaceMinKm = params.minPace + Math.random() * (params.maxPace - params.minPace)
        currentTargetPace = (params.stepMeters / (1000.0 / (nextPaceMinKm * 60.0))) * 1000
      }
      currentActualDelay = currentActualDelay * 0.9 + currentTargetPace * 0.1
      nextDelay = currentActualDelay
    }
    simulationInterval = setTimeout(runTick, nextDelay)
  }
  
  // Wrap the initial call to catch sync errors (like EACCES if shell:true is not enough or works differently)
  try {
    runTick()
  } catch (err: any) {
    if (mainWindow) mainWindow.webContents.send('sim-error', `Start error: ${err.message}`)
  }
})

ipcMain.on('pause-simulation', () => { isPaused = true })
ipcMain.on('resume-simulation', () => { isPaused = false })
ipcMain.on('stop-simulation', () => { 
  stopRequested = true
  if (simulationInterval) {
    clearTimeout(simulationInterval)
    simulationInterval = null
  }
})
