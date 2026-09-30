import { app, BrowserWindow, ipcMain, dialog, shell, Notification, Tray, Menu, nativeImage, globalShortcut, screen, powerMonitor, session, webRequest } from 'electron'

function stripFunctions(obj: any): any {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'function') return undefined
  if (Array.isArray(obj)) return obj.map(stripFunctions).filter(v => v !== undefined)
  if (typeof obj === 'object') {
    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      const stripped = stripFunctions(value)
      if (stripped !== undefined) result[key] = stripped
    }
    return result
  }
  return obj
}

function wrapHandler(handler: (...args: any[]) => Promise<any>) {
  return async (...args: any[]) => {
    const result = await handler(...args)
    return stripFunctions(result)
  }
}

import path from 'path'
import fs from 'fs'
import Store from 'electron-store'
import { spawn, execFile } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const store = new Store()
let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

const isDev = !app.isPackaged
const userDataPath = app.getPath('userData')
const cacheDir = path.join(userDataPath, 'cache')
const downloadsDir = path.join(userDataPath, 'downloads')

async function initializeDatabase() {
  console.log('Music app - using localStorage for persistence (no database needed)')
}

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize

  let windowIcon: Electron.NativeImage
  const iconPath = path.join(__dirname, '../public/icon.ico')
  
  if (fs.existsSync(iconPath)) {
    windowIcon = nativeImage.createFromPath(iconPath)
  } else {
    windowIcon = createDefaultIcon()
  }

  mainWindow = new BrowserWindow({
    width: Math.min(1600, width - 100),
    height: Math.min(1000, height - 100),
    minWidth: 1200,
    minHeight: 800,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
    show: false,
    title: 'MFY Emulator',
    icon: windowIcon,
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    // Initialize database after window is shown
    initializeDatabase()
  })

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  setupAdBlocker(mainWindow)
}

function setupAdBlocker(window: BrowserWindow) {
  const adDomains = [
    'doubleclick.net',
    'googlesyndication.com',
    'googleadservices.com',
    'adservice.google.com',
    'pagead2.googlesyndication.com',
    'ads.youtube.com',
    'youtube.com/api/stats/ads',
    'youtube.com/api/stats/watchtime',
    's.youtube.com/api/stats/ads',
    'googleads.g.doubleclick.net',
    'static.doubleclick.net',
    'ad.doubleclick.net',
    'securepubads.g.doubleclick.net',
    'pubads.g.doubleclick.net',
    'ads.pubmatic.com',
    'ads.rubiconproject.com',
    'ads.yahoo.com',
    'ads.adroll.com',
    'ads.tremorhub.com',
    'ads.undertone.com',
    'adserver.adtech.de',
    'adserver.adtechus.com',
    'advertising.com',
    'atdmt.com',
    'bidvertiser.com',
    'casalemedia.com',
    'clickbank.net',
    'clicksor.com',
    'connexity.net',
    'cpxcenter.com',
    'edge.quantserve.com',
    'fastclick.net',
    'images.asian-ad.com',
    'interclick.com',
    'ljtags.com',
    'media6degrees.com',
    'mediaplex.com',
    'openx.net',
    'pixel.quantserve.com',
    'realmedia.com',
    'revenue.net',
    'richmedia.yahoo.com',
    'serving-sys.com',
    'specificclick.net',
    'tribalfusion.com',
    'valueclick.com',
    'w55c.net',
    'yieldmanager.com',
    'zedo.com',
    'adnxs.com',
    'adsrvr.org',
    'adsafeprotected.com',
    'advertising.com',
    'atwola.com',
    'bidr.io',
    'bttrack.com',
    'casalemedia.com',
    'contextweb.com',
    'crwdcntrl.net',
    'ctnsnet.com',
    'demdex.net',
    'dmtracker.com',
    'dotomi.com',
    'ebdrink.com',
    'everesttech.net',
    'exelator.com',
    'eyeota.net',
    'exponential.com',
    'fmpub.net',
    'freewheel.com',
    'googletagmanager.com',
    'googletagservices.com',
    'gumgum.com',
    'heapanalytics.com',
    'hotjar.com',
    'imrworldwide.com',
    'insightexpressai.com',
    'invitemedia.com',
    'ixnp.com',
    'klaviyo.com',
    'krxd.net',
    'lijit.com',
    'liveintent.com',
    'liveramp.com',
    'ljtags.com',
    'lotame.com',
    'mathtag.com',
    'media.net',
    'medianetwork.com',
    'mookie1.com',
    'mookie4.com',
    'moatads.com',
    'mopub.com',
    'nrich.io',
    'omnitagjs.com',
    'optimizely.com',
    'outbrain.com',
    'parsely.com',
    'pinterest.com',
    'pixel.quantserve.com',
    'quantserve.com',
    'rlcdn.com',
    'rubiconproject.com',
    'scorecardresearch.com',
    'serving-sys.com',
    'sharethrough.com',
    'simpli.fi',
    'smaato.net',
    'smartadserver.com',
    'snapchat.com',
    'sovrn.com',
    'specificmedia.com',
    'spotxchange.com',
    'stickyadstv.com',
    'taboola.com',
    'tapad.com',
    'teads.tv',
    'thetradedesk.com',
    'tidaltv.com',
    'tremorhub.com',
    'triplelift.com',
    'turn.com',
    'twenga.com',
    'twitter.com/i/adsct',
    'tynt.com',
    'undertone.com',
    'unruly.co',
    'visualdna.com',
    'w55c.net',
    'widerplanet.com',
    'wishabi.com',
    'xaxis.com',
    'xg4ken.com',
    'yieldlab.net',
    'yieldmo.com',
    'yieldoptimizer.com',
    'zedo.com',
    'zemanta.com',
    'zeotap.com',
    'ziffdavis.com',
    'googletagmanager.com',
    'googletagservices.com',
  ]

  const adPatterns = [
    '*://*.doubleclick.net/*',
    '*://*.googlesyndication.com/*',
    '*://*.googleadservices.com/*',
    '*://*.adservice.google.com/*',
    '*://*.youtube.com/api/stats/ads*',
    '*://*.youtube.com/api/stats/watchtime*',
    '*://*.s.youtube.com/api/stats/ads*',
    '*://*.googleads.g.doubleclick.net/*',
    '*://*.static.doubleclick.net/*',
    '*://*.ad.doubleclick.net/*',
    '*://*.securepubads.g.doubleclick.net/*',
    '*://*.pubads.g.doubleclick.net/*',
    '*://*.ads.youtube.com/*',
    '*://*.pagead2.googlesyndication.com/*',
    '*://*/ads/*',
    '*://*/advert/*',
    '*://*/advertisement/*',
    '*://*/banner/*',
    '*://*/sponsor/*',
    '*://*/tracking/*',
    '*://*/analytics/*',
    '*://*/telemetry/*',
    '*://*/beacon/*',
    '*://*/pixel/*',
    '*://*/collect/*',
  ]

  const filter = {
    urls: adPatterns,
  }

  session.defaultSession.webRequest.onBeforeRequest(filter, (details, callback) => {
    const url = details.url
    const shouldBlock = adPatterns.some(pattern => {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\./g, '\\.') + '$')
      return regex.test(url)
    }) || adDomains.some(domain => url.includes(domain))

    if (shouldBlock) {
      callback({ cancel: true })
    } else {
      callback({ cancel: false })
    }
  })

  session.defaultSession.webRequest.onHeadersReceived(filter, (details, callback) => {
    const responseHeaders = details.responseHeaders || {}
    const csp = responseHeaders['content-security-policy'] || responseHeaders['Content-Security-Policy']
    
    if (csp) {
      const newCsp = Array.isArray(csp) ? csp[0] : csp
      const updatedCsp = newCsp
        .replace(/frame-src ([^;]+)/, 'frame-src $1 https://www.youtube.com https://music.youtube.com')
        .replace(/connect-src ([^;]+)/, 'connect-src $1 https://www.youtube.com https://music.youtube.com https://*.googlevideo.com')
      
      callback({
        responseHeaders: {
          ...responseHeaders,
          'Content-Security-Policy': updatedCsp,
        },
      })
    } else {
      callback({ responseHeaders })
    }
  })

  console.log('[AdBlocker] Initialized with', adDomains.length, 'domains and', adPatterns.length, 'patterns')
}

function createDefaultIcon(): Electron.NativeImage {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
      <rect width="256" height="256" rx="32" fill="#0a0a0f"/>
      <path d="M64 64h128v128H64V64zm32 32v64h64V96H96zm0 0" fill="#ff6b35"/>
      <circle cx="192" cy="64" r="16" fill="#ff6b35"/>
      <circle cx="192" cy="192" r="16" fill="#ff6b35"/>
      <circle cx="64" cy="192" r="16" fill="#ff6b35"/>
    </svg>
  `
  return nativeImage.createFromBuffer(Buffer.from(svg, 'utf-8'))
}

function createTray() {
  let trayIcon: Electron.NativeImage
  const iconPath = path.join(__dirname, '../public/icon.ico')
  
  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath)
  } else {
    trayIcon = createDefaultIcon()
  }
  
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }))
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'MFY Emulator', enabled: false },
    { type: 'separator' },
    { label: 'Show MFY Emulator', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit() } },
  ])
  tray.setContextMenu(contextMenu)
  tray.setToolTip('MFY Emulator - All-in-one emulator frontend')
  
  tray.on('double-click', () => mainWindow?.show())
}

function registerGlobalShortcuts() {
  globalShortcut.register('MediaPlayPause', () => {
    mainWindow?.webContents.send('media-play-pause')
  })
  globalShortcut.register('MediaNextTrack', () => {
    mainWindow?.webContents.send('media-next')
  })
  globalShortcut.register('MediaPreviousTrack', () => {
    mainWindow?.webContents.send('media-previous')
  })
}

function unregisterGlobalShortcuts() {
  globalShortcut.unregisterAll()
}

app.whenReady().then(() => {
  for (const dir of [cacheDir, downloadsDir, biosDir, savesDir]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }
  createWindow()
  createTray()
  registerGlobalShortcuts()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  unregisterGlobalShortcuts()
})

// Window controls
ipcMain.on('window-minimize', () => mainWindow?.minimize())
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})
ipcMain.on('window-close', () => mainWindow?.close())
ipcMain.handle('window-is-maximized', wrapHandler(() => mainWindow?.isMaximized() ?? false))

// Database operations - with safety checks
function ensureDb() {
  if (!database) {
    throw new Error('Database not initialized yet')
  }
  return database
}

ipcMain.handle('db-run', wrapHandler(async (_event, query: string, params: any[] = []) => {
  try {
    const db = ensureDb()
    const stmt = db.prepare(query)
    const result = stmt.run(...params)
    return { success: true, changes: result.changes, lastInsertRowid: result.lastInsertRowid }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}))

ipcMain.handle('db-get', wrapHandler(async (_event, query: string, params: any[] = []) => {
  try {
    const db = ensureDb()
    const stmt = db.prepare(query)
    const result = stmt.get(...params)
    return { success: true, data: result }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}))

ipcMain.handle('db-all', wrapHandler(async (_event, query: string, params: any[] = []) => {
  try {
    const db = ensureDb()
    const stmt = db.prepare(query)
    const result = stmt.all(...params)
    return { success: true, data: result }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}))

ipcMain.handle('db-transaction', wrapHandler(async (_event, queries: { query: string; params: any[] }[]) => {
  try {
    const db = ensureDb()
    const transaction = db.transaction(queries)
    transaction(queries)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}))

// Store operations
ipcMain.handle('store-get', wrapHandler((_event, key: string) => store.get(key)))
ipcMain.handle('store-set', wrapHandler((_event, key: string, value: unknown) => store.set(key, value)))
ipcMain.handle('store-delete', wrapHandler((_event, key: string) => store.delete(key)))

// File operations
ipcMain.handle('select-folder', wrapHandler(async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
  })
  return result.filePaths[0] || null
}))

ipcMain.handle('select-file', wrapHandler(async (_event, filters?: Electron.FileFilter[]) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters,
  })
  return result.filePaths[0] || null
}))

ipcMain.handle('select-files', wrapHandler(async (_event, filters?: Electron.FileFilter[]) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile', 'multiSelections'],
    filters,
  })
  return result.filePaths
}))

ipcMain.handle('save-file', wrapHandler(async (_event, defaultPath: string, filters?: Electron.FileFilter[]) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath,
    filters,
  })
  return result.filePath || null
}))

ipcMain.handle('read-file', wrapHandler(async (_event, filePath: string) => {
  try {
    const data = fs.readFileSync(filePath)
    return { success: true, data: data.toString('base64') }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}))

ipcMain.handle('write-file', wrapHandler(async (_event, filePath: string, data: string) => {
  try {
    fs.writeFileSync(filePath, Buffer.from(data, 'base64'))
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}))

ipcMain.handle('delete-file', wrapHandler(async (_event, filePath: string) => {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}))

ipcMain.handle('file-exists', wrapHandler((_event, filePath: string) => {
  return fs.existsSync(filePath)
}))

ipcMain.handle('get-app-path', wrapHandler(() => app.getAppPath()))
ipcMain.handle('get-user-data-path', wrapHandler(() => userDataPath))
ipcMain.handle('get-cache-dir', wrapHandler(() => cacheDir))
ipcMain.handle('get-downloads-dir', wrapHandler(() => downloadsDir))
ipcMain.handle('get-bios-dir', wrapHandler(() => biosDir))
ipcMain.handle('get-saves-dir', wrapHandler(() => savesDir))

// Directory operations
ipcMain.handle('read-dir', wrapHandler(async (_event, dirPath: string) => {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    return { success: true, data: entries.map(e => ({ name: e.name, isDirectory: e.isDirectory(), isFile: e.isFile() })) }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}))

ipcMain.handle('mkdir', wrapHandler(async (_event, dirPath: string) => {
  try {
    fs.mkdirSync(dirPath, { recursive: true })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}))

ipcMain.handle('copy-file', wrapHandler(async (_event, src: string, dest: string) => {
  try {
    fs.copyFileSync(src, dest)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}))

ipcMain.handle('move-file', wrapHandler(async (_event, src: string, dest: string) => {
  try {
    fs.renameSync(src, dest)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}))

ipcMain.handle('stat-file', wrapHandler(async (_event, filePath: string) => {
  try {
    const stats = fs.statSync(filePath)
    return { success: true, data: { size: stats.size, mtime: stats.mtimeMs, isDirectory: stats.isDirectory(), isFile: stats.isFile() } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}))

// Process execution
ipcMain.handle('execute-command', wrapHandler(async (_event, command: string, args: string[], options?: { cwd?: string; env?: Record<string, string> }) => {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options?.cwd,
      env: { ...process.env, ...options?.env },
      windowsHide: true,
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (data) => { stdout += data.toString() })
    child.stderr.on('data', (data) => { stderr += data.toString() })
    child.on('close', (code) => {
      resolve({ success: code === 0, code, stdout, stderr })
    })
    child.on('error', (error) => {
      resolve({ success: false, code: -1, stdout, stderr: error.message })
    })
  })
}))

ipcMain.handle('launch-emulator', wrapHandler(async (_event, executable: string, args: string[], options?: { cwd?: string; env?: Record<string, string> }) => {
  return new Promise((resolve) => {
    try {
      const child = spawn(executable, args, {
        cwd: options?.cwd || path.dirname(executable),
        env: { ...process.env, ...options?.env },
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      })
      child.unref()
      resolve({ success: true, pid: child.pid })
    } catch (error: any) {
      resolve({ success: false, error: error.message })
    }
  })
}))

// Download manager
const downloadQueue = new Map<string, { controller: AbortController; startTime: number }>()

ipcMain.handle('download-start', wrapHandler(async (_event, download: any) => {
  const controller = new AbortController()
  const startTime = Date.now()
  downloadQueue.set(download.id, { controller, startTime })
  
  try {
    const response = await fetch(download.url, { signal: controller.signal })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    
    const totalSize = parseInt(response.headers.get('content-length') || '0', 10)
    const fileStream = fs.createWriteStream(download.destination)
    
    let downloadedSize = 0
    let lastUpdate = Date.now()
    let lastDownloaded = 0
    
    for await (const chunk of response.body as any) {
      if (controller.signal.aborted) throw new Error('Cancelled')
      
      fileStream.write(chunk)
      downloadedSize += chunk.length
      
      const now = Date.now()
      if (now - lastUpdate >= 500) {
        const speed = (downloadedSize - lastDownloaded) / ((now - lastUpdate) / 1000)
        mainWindow?.webContents.send('download-progress', download.id, downloadedSize, totalSize, speed)
        lastUpdate = now
        lastDownloaded = downloadedSize
      }
    }
    
    fileStream.end()
    await new Promise<void>((resolve, reject) => {
      fileStream.on('finish', resolve)
      fileStream.on('error', reject)
    })
    
    downloadQueue.delete(download.id)
    return { success: true }
  } catch (error: any) {
    downloadQueue.delete(download.id)
    if (fs.existsSync(download.destination)) fs.unlinkSync(download.destination)
    return { success: false, error: error.message }
  }
}))

ipcMain.handle('download-pause', wrapHandler((_event, id: string) => {
  const entry = downloadQueue.get(id)
  if (entry) {
    entry.controller.abort()
    return { success: true }
  }
  return { success: false, error: 'Download not found' }
}))

ipcMain.handle('download-cancel', wrapHandler((_event, id: string) => {
  const entry = downloadQueue.get(id)
  if (entry) {
    entry.controller.abort()
    downloadQueue.delete(id)
    return { success: true }
  }
  return { success: false, error: 'Download not found' }
}))

// Game launching
ipcMain.handle('launch-game', async (_event, game: any, emulator: any, options: any) => {
  try {
    const args = [...(emulator.launchArgs?.[game.platform] || []), ...(options.launchArgs || [])]
    
    if (options.fullscreen) args.push('-fullscreen')
    if (options.resolution) args.push('-resolution', options.resolution)
    
    const executable = emulator.executablePath
    if (!executable || !fs.existsSync(executable)) {
      return { success: false, error: 'Emulator executable not found' }
    }
    
    const env = { ...process.env, ...options.env }
    if (emulator.biosPath) env.BIOS_PATH = emulator.biosPath
    if (emulator.savePath) env.SAVE_PATH = emulator.savePath
    if (emulator.statePath) env.STATE_PATH = emulator.statePath
    
    const child = spawn(executable, [game.filePath, ...args], {
      cwd: options.cwd || path.dirname(executable),
      env,
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    })
    child.unref()
    
    return { success: true, pid: child.pid }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// Emulator management
ipcMain.handle('emulator-detect', async (_event, emulatorId: string, executablePath?: string) => {
  try {
    const db = ensureDb()
    const emulator = db.getEmulator(emulatorId)
    if (!emulator) return { success: false, error: 'Emulator not found' }
    
    const checkPath = executablePath || emulator.executablePath || emulator.installPath
    if (!checkPath) return { success: false, found: false }
    
    const possibleExes = [
      checkPath,
      path.join(checkPath, `${emulator.name}.exe`),
      path.join(checkPath, `${emulator.name.toLowerCase()}.exe`),
      path.join(checkPath, 'bin', `${emulator.name}.exe`),
    ]
    
    for (const exe of possibleExes) {
      if (fs.existsSync(exe)) {
        try {
          const { stdout } = await new Promise<{ stdout: string }>((resolve, reject) => {
            const child = execFile(exe, ['--version'], { timeout: 5000, windowsHide: true })
            let out = ''
            child.stdout?.on('data', (d) => out += d.toString())
            child.on('close', () => resolve({ stdout: out.trim() }))
            child.on('error', reject)
          })
          return { success: true, found: true, path: exe, version: stdout }
        } catch {
          return { success: true, found: true, path: exe }
        }
      }
    }
    
    return { success: true, found: false }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('emulator-install', async (_event, emulatorId: string, options: any) => {
  return { success: false, error: 'Not implemented yet - use download manager' }
})

ipcMain.handle('emulator-uninstall', async (_event, emulatorId: string) => {
  try {
    const db = ensureDb()
    const emulator = db.getEmulator(emulatorId)
    if (!emulator || !emulator.installPath) return { success: false, error: 'Emulator not installed' }
    
    if (fs.existsSync(emulator.installPath)) {
      fs.rmSync(emulator.installPath, { recursive: true, force: true })
    }
    
    db.updateEmulatorInstall(emulatorId, 0, '', '', '', '', '', '', '', '')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('emulator-open-folder', async (_event, emulatorId: string) => {
  try {
    const db = ensureDb()
    const emulator = db.getEmulator(emulatorId)
    if (!emulator || !emulator.installPath || !fs.existsSync(emulator.installPath)) {
      return { success: false, error: 'Install folder not found' }
    }
    shell.openPath(emulator.installPath)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('emulator-configure', async (_event, emulatorId: string) => {
  try {
    const db = ensureDb()
    const emulator = db.getEmulator(emulatorId)
    if (!emulator || !emulator.executablePath || !fs.existsSync(emulator.executablePath)) {
      return { success: false, error: 'Emulator not installed' }
    }
    
    spawn(emulator.executablePath, ['--config'], { detached: true, stdio: 'ignore', windowsHide: true }).unref()
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// BIOS management
ipcMain.handle('bios-import', async (_event, systemId: string, files: string[]) => {
  try {
    const db = ensureDb()
    const system = db.getSystem(systemId)
    if (!system) return { success: false, error: 'System not found' }
    
    const systemBiosDir = path.join(biosDir, systemId)
    if (!fs.existsSync(systemBiosDir)) fs.mkdirSync(systemBiosDir, { recursive: true })
    
    const results = []
    for (const file of files) {
      const filename = path.basename(file)
      const dest = path.join(systemBiosDir, filename)
      fs.copyFileSync(file, dest)
      results.push({ filename, path: dest, success: true })
    }
    
    return { success: true, data: results }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('bios-scan', async (_event, systemId: string) => {
  try {
    const db = ensureDb()
    const system = db.getSystem(systemId)
    if (!system) return { success: false, error: 'System not found' }
    
    const biosFiles = system.biosFiles ? JSON.parse(system.biosFiles) : []
    const systemBiosDir = path.join(biosDir, systemId)
    
    const results = []
    for (const bios of biosFiles) {
      const biosPath = path.join(systemBiosDir, bios.filename)
      const exists = fs.existsSync(biosPath)
      let valid = false
      let actualHash = ''
      
      if (exists && bios.md5) {
        const crypto = await import('crypto')
        const hash = crypto.createHash('md5').update(fs.readFileSync(biosPath)).digest('hex')
        actualHash = hash
        valid = hash === bios.md5
      }
      
      results.push({
        ...bios,
        found: exists,
        path: exists ? biosPath : undefined,
        valid,
        actualHash,
      })
    }
    
    return { success: true, data: results }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// Save management
ipcMain.handle('saves-scan', async (_event, gameId: string, emulatorId: string) => {
  try {
    const db = ensureDb()
    const emulator = db.getEmulator(emulatorId)
    if (!emulator || !emulator.savePath) return { success: false, error: 'Emulator save path not configured' }
    
    const game = db.getGame(gameId)
    if (!game) return { success: false, error: 'Game not found' }
    
    const savePath = emulator.savePath
    if (!fs.existsSync(savePath)) return { success: true, data: [] }
    
    const entries = fs.readdirSync(savePath, { withFileTypes: true })
    const saves = []
    
    for (const entry of entries) {
      if (entry.isFile()) {
        const filePath = path.join(savePath, entry.name)
        const stats = fs.statSync(filePath)
        const ext = path.extname(entry.name).toLowerCase()
        
        let type: 'save' | 'state' | 'sram' | 'memory_card' | 'config' | 'other' = 'other'
        if (['.sav', '.srm', '.eep'].includes(ext)) type = 'save'
        else if (['.state', '.st0', '.st1'].includes(ext)) type = 'state'
        else if (ext === '.sram') type = 'sram'
        else if (['.mcr', '.psv', '.gci'].includes(ext)) type = 'memory_card'
        else if (['.ini', '.cfg', '.conf'].includes(ext)) type = 'config'
        
        saves.push({
          id: crypto.randomUUID(),
          gameId,
          emulatorId,
          type,
          name: entry.name,
          path: filePath,
          size: stats.size,
          modifiedAt: stats.mtimeMs,
        })
      }
    }
    
    return { success: true, data: saves }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('save-backup', async (_event, gameId: string, name: string, description: string, isAuto: boolean) => {
  try {
    const db = ensureDb()
    const game = db.getGame(gameId)
    if (!game) return { success: false, error: 'Game not found' }
    
    const backupId = crypto.randomUUID()
    const backupPath = path.join(savesDir, 'backups', gameId, `${backupId}.zip`)
    const backupDir = path.dirname(backupPath)
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })
    
    // Would zip the save files here
    const size = 0 // Calculate actual size
    
    db.insertSaveBackup({
      id: backupId,
      gameId,
      name,
      description,
      files: '[]',
      size,
      path: backupPath,
      isAuto: isAuto ? 1 : 0,
    })
    
    return { success: true, data: { id: backupId, path: backupPath } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('save-restore', async (_event, backupId: string) => {
  try {
    const db = ensureDb()
    const backup = db.getSaveBackup(backupId)
    if (!backup) return { success: false, error: 'Backup not found' }
    
    // Would extract zip and restore files
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// Game folder scanning
ipcMain.handle('scan-game-folders', async (_event, systemId: string) => {
  try {
    const provider = getProviderForSystem(systemId)
    if (!provider) return { success: false, error: 'No provider for system' }
    
    const games = await provider.scanGameFolders(systemId)
    return { success: true, data: games }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// Enhanced game launching with profiles
ipcMain.handle('launch-game-with-profile', async (_event, gameId: string, profileId?: string, options?: { fullscreen?: boolean; resolution?: string }) => {
  try {
    const db = ensureDb()
    const game = db.getGame(gameId)
    if (!game) return { success: false, error: 'Game not found' }

    let profile: EmulatorProfile | undefined
    if (profileId) {
      profile = db.getControllerProfile(profileId)
      if (!profile) profile = { id: profileId, name: profileId }
    }

    const provider = getProvider(game.emulatorId || '')
    if (!provider) return { success: false, error: 'No emulator provider found' }

    const result = await provider.launchGame(game, profile, options)
    return result
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// Controller detection
ipcMain.handle('controllers-detect', async () => {
  try {
    // Use Windows APIs or a library to detect controllers
    // For now, return empty array - will implement with proper library
    return { success: true, data: [] }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// Theme management
ipcMain.handle('theme-get-custom-path', () => {
  const customThemesDir = path.join(userDataPath, 'themes', 'custom')
  if (!fs.existsSync(customThemesDir)) fs.mkdirSync(customThemesDir, { recursive: true })
  return customThemesDir
})

ipcMain.handle('theme-install', async (_event, themePath: string) => {
  try {
    const destDir = path.join(userDataPath, 'themes', 'custom', path.basename(themePath, path.extname(themePath)))
    if (fs.existsSync(destDir)) fs.rmSync(destDir, { recursive: true })
    fs.cpSync(themePath, destDir, { recursive: true })
    return { success: true, path: destDir }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// Metadata fetching (placeholder for now)
ipcMain.handle('metadata-fetch', async (_event, game: any) => {
  return { success: false, error: 'Not implemented yet' }
})

ipcMain.handle('artwork-fetch', async (_event, game: any, types: string[]) => {
  return { success: false, error: 'Not implemented yet' }
})

// Notifications
ipcMain.on('show-notification', (_event, title: string, body: string, icon?: string) => {
  new Notification({ title, body, icon: icon ? nativeImage.createFromPath(icon) : undefined }).show()
})

// Open external URL
ipcMain.on('open-external', (_event, url: string) => shell.openExternal(url))

// YouTube Music API
ipcMain.handle('ytmusic-search', async (_event, query: string, filter?: string, limit?: number) => {
  try {
    const { youtubeMusicService } = await import('./services/youtubeMusic')
    const results = await youtubeMusicService.search(query, filter as any, limit)
    return { success: true, data: results }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('ytmusic-get-stream', async (_event, videoId: string) => {
  try {
    const { youtubeMusicService } = await import('./services/youtubeMusic')
    const url = await youtubeMusicService.getStreamUrl(videoId)
    return { success: true, data: { streamUrl: url } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('ytmusic-get-track', async (_event, videoId: string) => {
  try {
    const { youtubeMusicService } = await import('./services/youtubeMusic')
    const track = await youtubeMusicService.getTrackInfo(videoId)
    return { success: true, data: track }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('ytmusic-get-related', async (_event, videoId: string, limit?: number) => {
  try {
    const { youtubeMusicService } = await import('./services/youtubeMusic')
    const tracks = await youtubeMusicService.getRelatedTracks(videoId, limit)
    return { success: true, data: tracks }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('ytmusic-get-playlist', async (_event, playlistId: string) => {
  try {
    const { youtubeMusicService } = await import('./services/youtubeMusic')
    const tracks = await youtubeMusicService.getPlaylistTracks(playlistId)
    return { success: true, data: tracks }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('ytmusic-set-cookies', async (_event, cookiesPath: string) => {
  try {
    const { youtubeMusicService } = await import('./services/youtubeMusic')
    youtubeMusicService.setCookies(cookiesPath)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

ipcMain.handle('ytmusic-set-quality', async (_event, quality: 'high' | 'medium' | 'low') => {
  try {
    const { youtubeMusicService } = await import('./services/youtubeMusic')
    youtubeMusicService.setQuality(quality)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
})

// Ad blocker controls
ipcMain.handle('adblock-get-status', () => {
  return { success: true, enabled: true }
})

ipcMain.handle('adblock-set-enabled', async (_event, enabled: boolean) => {
  return { success: true }
})

// App info
ipcMain.handle('get-app-version', () => app.getVersion())
ipcMain.handle('get-platform', () => process.platform)