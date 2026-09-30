export {}

declare global {
  interface Window {
    electronAPI: {
      // Window controls
      minimize: () => void
      maximize: () => void
      close: () => void
      isMaximized: () => Promise<boolean>
      
      // Database
      db: {
        run: (query: string, params?: any[]) => Promise<{ success: boolean; changes?: number; lastInsertRowid?: number | bigint; error?: string }>
        get: (query: string, params?: any[]) => Promise<{ success: boolean; data?: any; error?: string }>
        all: (query: string, params?: any[]) => Promise<{ success: boolean; data?: any[]; error?: string }>
        transaction: (queries: { query: string; params: any[] }[]) => Promise<{ success: boolean; error?: string }>
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
      
      // Process execution
      executeCommand: (command: string, args: string[], options?: { cwd?: string; env?: Record<string, string> }) => Promise<{ success: boolean; code: number; stdout: string; stderr: string }>
      launchEmulator: (executable: string, args: string[], options?: { cwd?: string; env?: Record<string, string> }) => Promise<{ success: boolean; pid?: number; error?: string }>
      
      // Download manager
      downloadStart: (download: any) => Promise<{ success: boolean; error?: string }>
      downloadPause: (id: string) => Promise<{ success: boolean; error?: string }>
      downloadCancel: (id: string) => Promise<{ success: boolean; error?: string }>
      onDownloadProgress: (callback: (id: string, downloaded: number, total: number, speed: number) => void) => () => void
      
      // Game launching
      launchGame: (game: any, emulator: any, options: any) => Promise<{ success: boolean; pid?: number; error?: string }>
      
      // Emulator management
      emulatorDetect: (emulatorId: string, executablePath?: string) => Promise<{ success: boolean; found?: boolean; path?: string; version?: string; error?: string }>
      emulatorInstall: (emulatorId: string, options?: any) => Promise<{ success: boolean; path?: string; error?: string }>
      emulatorUninstall: (emulatorId: string) => Promise<{ success: boolean; error?: string }>
      emulatorOpenFolder: (emulatorId: string) => Promise<{ success: boolean; error?: string }>
      emulatorConfigure: (emulatorId: string) => Promise<{ success: boolean; error?: string }>
      
      // BIOS management
      biosImport: (systemId: string, files: string[]) => Promise<{ success: boolean; data?: any[]; error?: string }>
      biosScan: (systemId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>
      
      // Save management
      savesScan: (gameId: string, emulatorId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>
      saveBackup: (gameId: string, name: string, description: string, isAuto: boolean) => Promise<{ success: boolean; data?: any; error?: string }>
      saveRestore: (backupId: string) => Promise<{ success: boolean; error?: string }>
      
      // Controller detection
      controllersDetect: () => Promise<{ success: boolean; data?: any[]; error?: string }>
      
      // Theme management
      themeGetCustomPath: () => string
      themeInstall: (themePath: string) => Promise<{ success: boolean; path?: string; error?: string }>
      
      // Metadata & Artwork
      metadataFetch: (game: any) => Promise<{ success: boolean; data?: any; error?: string }>
      artworkFetch: (game: any, types: string[]) => Promise<{ success: boolean; data?: any[]; error?: string }>
      
      // Notifications
      showNotification: (title: string, body: string, icon?: string) => void
      
      // External
      openExternal: (url: string) => void
      
      // YouTube Music
      ytmusic: {
        search: (query: string, filter?: string, limit?: number) => Promise<{ success: boolean; data?: any; error?: string }>
        getStream: (videoId: string) => Promise<{ success: boolean; data?: { streamUrl: string }; error?: string }>
        getTrack: (videoId: string) => Promise<{ success: boolean; data?: any; error?: string }>
        getRelated: (videoId: string, limit?: number) => Promise<{ success: boolean; data?: any[]; error?: string }>
        getPlaylist: (playlistId: string) => Promise<{ success: boolean; data?: any[]; error?: string }>
        setCookies: (cookiesPath: string) => Promise<{ success: boolean; error?: string }>
        setQuality: (quality: 'high' | 'medium' | 'low') => Promise<{ success: boolean; error?: string }>
      }
      
      // Ad blocker
      adblock: {
        getStatus: () => Promise<{ success: boolean; enabled: boolean }>
        setEnabled: (enabled: boolean) => Promise<{ success: boolean }>
      }
      
      // App info
      getAppVersion: () => string
      getPlatform: () => string
    }
  }
}