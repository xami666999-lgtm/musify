import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  // Database
  db: {
    run: (query: string, params?: any[]) => ipcRenderer.invoke('db-run', query, params),
    get: (query: string, params?: any[]) => ipcRenderer.invoke('db-get', query, params),
    all: (query: string, params?: any[]) => ipcRenderer.invoke('db-all', query, params),
    transaction: (queries: { query: string; params: any[] }[]) => ipcRenderer.invoke('db-transaction', queries),
  },

  // Store
  get: (key: string) => ipcRenderer.invoke('store-get', key),
  set: (key: string, value: unknown) => ipcRenderer.invoke('store-set', key, value),
  delete: (key: string) => ipcRenderer.invoke('store-delete', key),

  // File operations
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectFile: (filters?: Electron.FileFilter[]) => ipcRenderer.invoke('select-file', filters),
  selectFiles: (filters?: Electron.FileFilter[]) => ipcRenderer.invoke('select-files', filters),
  saveFile: (defaultPath: string, filters?: Electron.FileFilter[]) => ipcRenderer.invoke('save-file', defaultPath, filters),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  writeFile: (filePath: string, data: string) => ipcRenderer.invoke('write-file', filePath, data),
  deleteFile: (filePath: string) => ipcRenderer.invoke('delete-file', filePath),
  fileExists: (filePath: string) => ipcRenderer.invoke('file-exists', filePath),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  getCacheDir: () => ipcRenderer.invoke('get-cache-dir'),
  getDownloadsDir: () => ipcRenderer.invoke('get-downloads-dir'),
  getBiosDir: () => ipcRenderer.invoke('get-bios-dir'),
  getSavesDir: () => ipcRenderer.invoke('get-saves-dir'),
  readDir: (dirPath: string) => ipcRenderer.invoke('read-dir', dirPath),
  mkdir: (dirPath: string) => ipcRenderer.invoke('mkdir', dirPath),
  copyFile: (src: string, dest: string) => ipcRenderer.invoke('copy-file', src, dest),
  moveFile: (src: string, dest: string) => ipcRenderer.invoke('move-file', src, dest),
  statFile: (filePath: string) => ipcRenderer.invoke('stat-file', filePath),

  // Process execution
  executeCommand: (command: string, args: string[], options?: { cwd?: string; env?: Record<string, string> }) => 
    ipcRenderer.invoke('execute-command', command, args, options),
  launchEmulator: (executable: string, args: string[], options?: { cwd?: string; env?: Record<string, string> }) => 
    ipcRenderer.invoke('launch-emulator', executable, args, options),

  // Download manager
  downloadStart: (download: any) => ipcRenderer.invoke('download-start', download),
  downloadPause: (id: string) => ipcRenderer.invoke('download-pause', id),
  downloadCancel: (id: string) => ipcRenderer.invoke('download-cancel', id),
  onDownloadProgress: (callback: (id: string, downloaded: number, total: number, speed: number) => void) => {
    ipcRenderer.on('download-progress', (_event, id, downloaded, total, speed) => callback(id, downloaded, total, speed))
    return () => ipcRenderer.removeListener('download-progress', callback)
  },

  // Game launching
  launchGame: (game: any, emulator: any, options: any) => ipcRenderer.invoke('launch-game', game, emulator, options),

  // Emulator management
  emulatorDetect: (emulatorId: string, executablePath?: string) => ipcRenderer.invoke('emulator-detect', emulatorId, executablePath),
  emulatorInstall: (emulatorId: string, options?: any) => ipcRenderer.invoke('emulator-install', emulatorId, options),
  emulatorUninstall: (emulatorId: string) => ipcRenderer.invoke('emulator-uninstall', emulatorId),
  emulatorOpenFolder: (emulatorId: string) => ipcRenderer.invoke('emulator-open-folder', emulatorId),
  emulatorConfigure: (emulatorId: string) => ipcRenderer.invoke('emulator-configure', emulatorId),

  // BIOS management
  biosImport: (systemId: string, files: string[]) => ipcRenderer.invoke('bios-import', systemId, files),
  biosScan: (systemId: string) => ipcRenderer.invoke('bios-scan', systemId),

  // Save management
  savesScan: (gameId: string, emulatorId: string) => ipcRenderer.invoke('saves-scan', gameId, emulatorId),
  saveBackup: (gameId: string, name: string, description: string, isAuto: boolean) => ipcRenderer.invoke('save-backup', gameId, name, description, isAuto),
  saveRestore: (backupId: string) => ipcRenderer.invoke('save-restore', backupId),

  // Controller detection
  controllersDetect: () => ipcRenderer.invoke('controllers-detect'),

  // Theme management
  themeGetCustomPath: () => ipcRenderer.invoke('theme-get-custom-path'),
  themeInstall: (themePath: string) => ipcRenderer.invoke('theme-install', themePath),

  // Metadata & Artwork
  metadataFetch: (game: any) => ipcRenderer.invoke('metadata-fetch', game),
  artworkFetch: (game: any, types: string[]) => ipcRenderer.invoke('artwork-fetch', game, types),

  // Notifications
  showNotification: (title: string, body: string, icon?: string) => ipcRenderer.send('show-notification', title, body, icon),

  // External
  openExternal: (url: string) => ipcRenderer.send('open-external', url),

  // YouTube Music
  ytmusic: {
    search: (query: string, filter?: string, limit?: number) => ipcRenderer.invoke('ytmusic-search', query, filter, limit),
    getStream: (videoId: string) => ipcRenderer.invoke('ytmusic-get-stream', videoId),
    getTrack: (videoId: string) => ipcRenderer.invoke('ytmusic-get-track', videoId),
    getRelated: (videoId: string, limit?: number) => ipcRenderer.invoke('ytmusic-get-related', videoId, limit),
    getPlaylist: (playlistId: string) => ipcRenderer.invoke('ytmusic-get-playlist', playlistId),
    setCookies: (cookiesPath: string) => ipcRenderer.invoke('ytmusic-set-cookies', cookiesPath),
    setQuality: (quality: 'high' | 'medium' | 'low') => ipcRenderer.invoke('ytmusic-set-quality', quality),
  },

  // Ad blocker
  adblock: {
    getStatus: () => ipcRenderer.invoke('adblock-get-status'),
    setEnabled: (enabled: boolean) => ipcRenderer.invoke('adblock-set-enabled', enabled),
  },

  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
})

// Type declarations for the exposed API
declare global {
  interface Window {
    electronAPI: {
      minimize: () => void
      maximize: () => void
      close: () => void
      isMaximized: () => Promise<boolean>
      db: {
        run: (query: string, params?: any[]) => Promise<{ success: boolean; changes?: number; lastInsertRowid?: number | bigint; error?: string }>
        get: (query: string, params?: any[]) => Promise<{ success: boolean; data?: any; error?: string }>
        all: (query: string, params?: any[]) => Promise<{ success: boolean; data?: any[]; error?: string }>
        transaction: (queries: { query: string; params: any[] }[]) => Promise<{ success: boolean; error?: string }>
      }
      get: (key: string) => Promise<any>
      set: (key: string, value: unknown) => Promise<void>
      delete: (key: string) => Promise<void>
      selectFolder: () => Promise<string | null>
      selectFile: (filters?: Electron.FileFilter[]) => Promise<string | null>
      selectFiles: (filters?: Electron.FileFilter[]) => Promise<string[]>
      saveFile: (defaultPath: string, filters?: Electron.FileFilter[]) => Promise<string | null>
      readFile: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>
      writeFile: (filePath: string, data: string) => Promise<{ success: boolean; error?: string }>
      deleteFile: (filePath: string) => Promise<{ success: boolean; error?: string }>
      fileExists: (filePath: string) => boolean
      getAppPath: () => string
      getUserDataPath: () => string
      getCacheDir: () => string
      getDownloadsDir: () => string
      getBiosDir: () => string
      getSavesDir: () => string
      readDir: (dirPath: string) => Promise<{ success: boolean; data?: Array<{ name: string; isDirectory: boolean; isFile: boolean }>; error?: string }>
      mkdir: (dirPath: string) => Promise<{ success: boolean; error?: string }>
      copyFile: (src: string, dest: string) => Promise<{ success: boolean; error?: string }>
      moveFile: (src: string, dest: string) => Promise<{ success: boolean; error?: string }>
      statFile: (filePath: string) => Promise<{ success: boolean; data?: { size: number; mtime: number; isDirectory: boolean; isFile: boolean }; error?: string }>
      executeCommand: (command: string, args: string[], options?: { cwd?: string; env?: Record<string, string> }) => Promise<{ success: boolean; code: number; stdout: string; stderr: string }>
      launchEmulator: (executable: string, args: string[], options?: { cwd?: string; env?: Record<string, string> }) => Promise<{ success: boolean; pid?: number; error?: string }>
      downloadStart: (download: any) => Promise<{ success: boolean; error?: string }>
      downloadPause: (id: string) => Promise<{ success: boolean; error?: string }>
      downloadCancel: (id: string) => Promise<{ success: boolean; error?: string }>
      onDownloadProgress: (callback: (id: string, downloaded: number, total: number, speed: number) => void) => () => void
      launchGame: (game: any, emulator: any, options: any) => Promise<{ success: boolean; pid?: number; error?: string }>
      emulatorDetect: (emulatorId: string, executablePath?: string) => Promise<{ success: boolean; found?: boolean; path?: string; version?: string; error?: string }>
      emulatorInstall: (emulatorId: string, options?: any) => Promise<{ success: boolean; path?: string; error?: string }>
      emulatorUninstall: (emulatorId: string) => Promise<{ success: boolean; error?: string }>
      emulatorOpenFolder: (emulatorId: string) => Promise<{ success: boolean; error?: string }>
      emulatorConfigure: (emulatorId: string) => Promise<{ success: boolean; error?: string }>
      biosImport: (systemId: string, files: string[]) => Promise<{ success: boolean; data?: any[]; error?: string }>
      biosScan: (systemId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>
      savesScan: (gameId: string, emulatorId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>
      saveBackup: (gameId: string, name: string, description: string, isAuto: boolean) => Promise<{ success: boolean; data?: any; error?: string }>
      saveRestore: (backupId: string) => Promise<{ success: boolean; error?: string }>
      controllersDetect: () => Promise<{ success: boolean; data?: any[]; error?: string }>
      themeGetCustomPath: () => string
      themeInstall: (themePath: string) => Promise<{ success: boolean; path?: string; error?: string }>
      metadataFetch: (game: any) => Promise<{ success: boolean; data?: any; error?: string }>
      artworkFetch: (game: any, types: string[]) => Promise<{ success: boolean; data?: any[]; error?: string }>
      showNotification: (title: string, body: string, icon?: string) => void
      openExternal: (url: string) => void
      getAppVersion: () => string
      getPlatform: () => string
      ytmusic: {
        search: (query: string, filter?: string, limit?: number) => Promise<{ success: boolean; data?: any; error?: string }>
        getStream: (videoId: string) => Promise<{ success: boolean; data?: { streamUrl: string }; error?: string }>
        getTrack: (videoId: string) => Promise<{ success: boolean; data?: any; error?: string }>
        getRelated: (videoId: string, limit?: number) => Promise<{ success: boolean; data?: any[]; error?: string }>
        getPlaylist: (playlistId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>
        setCookies: (cookiesPath: string) => Promise<{ success: boolean; error?: string }>
        setQuality: (quality: 'high' | 'medium' | 'low') => Promise<{ success: boolean; error?: string }>
      }
      adblock: {
        getStatus: () => Promise<{ success: boolean; enabled: boolean }>
        setEnabled: (enabled: boolean) => Promise<{ success: boolean }>
      }
    }
  }
}