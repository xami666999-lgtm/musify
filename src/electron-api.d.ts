interface DatabaseResult<T> {
  success: boolean
  data?: T
  error?: string
  changes?: number
  lastInsertRowid?: number | bigint
}

interface ElectronAPI {
  // Window controls
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>

  // Database
  db: {
    run: (query: string, params?: any[]) => Promise<DatabaseResult<any>>
    get: (query: string, params?: any[]) => Promise<DatabaseResult<any>>
    all: (query: string, params?: any[]) => Promise<DatabaseResult<any[]>>
    transaction: (queries: { query: string; params: any[] }[]) => Promise<DatabaseResult<any>>
  }

  // Store
  get: (key: string) => Promise<any>
  set: (key: string, value: unknown) => Promise<void>
  delete: (key: string) => Promise<void>

  // File operations
  selectFolder: () => Promise<string | null>
  selectFile: (filters?: Electron.FileFilter[]) => Promise<string | null>
  selectFiles: (filters?: Electron.FileFilter[]) => Promise<string[]>
  saveFile: (defaultPath: string, filters?: Electron.FileFilter[]) => Promise<string | null>
  readFile: (filePath: string) => Promise<DatabaseResult<string>>
  writeFile: (filePath: string, data: string) => Promise<DatabaseResult<any>>
  deleteFile: (filePath: string) => Promise<DatabaseResult<any>>
  fileExists: (filePath: string) => boolean
  getAppPath: () => string
  getUserDataPath: () => string
  getCacheDir: () => string
  getDownloadsDir: () => string
  getBiosDir: () => string
  getSavesDir: () => string
  readDir: (dirPath: string) => Promise<DatabaseResult<Array<{ name: string; isDirectory: boolean; isFile: boolean }>>>
  mkdir: (dirPath: string) => Promise<DatabaseResult<any>>
  copyFile: (src: string, dest: string) => Promise<DatabaseResult<any>>
  moveFile: (src: string, dest: string) => Promise<DatabaseResult<any>>
  statFile: (filePath: string) => Promise<DatabaseResult<{ size: number; mtime: number; isDirectory: boolean; isFile: boolean }>>

  // Process execution
  executeCommand: (command: string, args: string[], options?: { cwd?: string; env?: Record<string, string> }) => Promise<DatabaseResult<{ code: number; stdout: string; stderr: string }>>
  launchEmulator: (executable: string, args: string[], options?: { cwd?: string; env?: Record<string, string> }) => Promise<DatabaseResult<{ pid?: number }>>

  // Download manager
  downloadStart: (download: any) => Promise<DatabaseResult<any>>
  downloadPause: (id: string) => Promise<DatabaseResult<any>>
  downloadCancel: (id: string) => Promise<DatabaseResult<any>>
  onDownloadProgress: (callback: (id: string, downloaded: number, total: number, speed: number) => void) => () => void

  // Game launching
  launchGame: (game: any, emulator: any, options: any) => Promise<DatabaseResult<{ pid?: number }>>

  // Emulator management
  emulatorDetect: (emulatorId: string, executablePath?: string) => Promise<DatabaseResult<{ found?: boolean; path?: string; version?: string }>>
  emulatorInstall: (emulatorId: string, options?: any) => Promise<DatabaseResult<{ path?: string }>>
  emulatorUninstall: (emulatorId: string) => Promise<DatabaseResult<any>>
  emulatorOpenFolder: (emulatorId: string) => Promise<DatabaseResult<any>>
  emulatorConfigure: (emulatorId: string) => Promise<DatabaseResult<any>>

  // BIOS management
  biosImport: (systemId: string, files: string[]) => Promise<DatabaseResult<any[]>>
  biosScan: (systemId: string) => Promise<DatabaseResult<any[]>>

  // Save management
  savesScan: (gameId: string, emulatorId: string) => Promise<DatabaseResult<any[]>>
  saveBackup: (gameId: string, name: string, description: string, isAuto: boolean) => Promise<DatabaseResult<any>>
  saveRestore: (backupId: string) => Promise<DatabaseResult<any>>

  // Controller detection
  controllersDetect: () => Promise<DatabaseResult<any[]>>

  // Theme management
  themeGetCustomPath: () => string
  themeInstall: (themePath: string) => Promise<DatabaseResult<{ path?: string }>>

  // Metadata & Artwork
  metadataFetch: (game: any) => Promise<DatabaseResult<any>>
  artworkFetch: (game: any, types: string[]) => Promise<DatabaseResult<any[]>>

  // Notifications
  showNotification: (title: string, body: string, icon?: string) => void

  // External
  openExternal: (url: string) => void

  // YouTube Music
  ytmusic: {
    search: (query: string, filter?: string, limit?: number) => Promise<DatabaseResult<any>>
    getStream: (videoId: string) => Promise<DatabaseResult<{ streamUrl: string }>>
    getTrack: (videoId: string) => Promise<DatabaseResult<any>>
    getRelated: (videoId: string, limit?: number) => Promise<DatabaseResult<any[]>>
    getPlaylist: (playlistId: string) => Promise<DatabaseResult<any[]>>
    setCookies: (cookiesPath: string) => Promise<DatabaseResult<any>>
    setQuality: (quality: 'high' | 'medium' | 'low') => Promise<DatabaseResult<any>>
  }

  // Ad blocker
  adblock: {
    getStatus: () => Promise<DatabaseResult<{ enabled: boolean }>>
    setEnabled: (enabled: boolean) => Promise<DatabaseResult<any>>
  }

  // App info
  getAppVersion: () => string
  getPlatform: () => string

  // Mini player
  toggleMiniPlayer: () => void
  showMiniPlayer: () => void
  hideMiniPlayer: () => void

  // Media session
  updateMediaSession: (track: any) => void

  // Media key event listeners
  onMediaPlayPause: (callback: () => void) => () => void
  onMediaNext: (callback: () => void) => () => void
  onMediaPrevious: (callback: () => void) => () => void
  onMediaStop: (callback: () => void) => () => void
}

export {}
declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}