import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  AppStore,
  Page,
  Settings,
  SearchResult,
  PlaybackState,
  Track,
  Playlist,
  LibraryState,
  PlayHistoryItem,
  Notification,
} from '../types';

const defaultSettings: Settings = {
  general: {
    language: 'en',
    region: 'US',
    contentLanguage: ['en'],
    adultContent: false,
    autoPlayNext: true,
    autoPlayRelated: true,
    crossfadeEnabled: true,
    crossfadeDuration: 5,
  },
  playback: {
    quality: 'high',
    volume: 0.8,
    normalization: true,
    gaplessPlayback: true,
    equalizer: {
      enabled: false,
      preset: 'flat',
      bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
  },
  appearance: {
    theme: 'system',
    accentColor: '#ff6b35',
    compactMode: false,
    showVisualizer: true,
    reduceMotion: false,
    fontScale: 1,
  },
  library: {
    autoAddLiked: true,
    showLocalFiles: false,
    localFolders: [],
    organizeImports: true,
  },
  network: {
    dnsOverHttps: false,
    offlineMode: false,
  },
  privacy: {
    analytics: false,
    crashReporting: false,
    shareUsageData: false,
    clearHistoryOnExit: false,
    blockTracking: true,
  },
  youtubeMusic: {
    quality: 'high',
    useMusicApi: true,
    region: 'US',
  },
};

const defaultPlaybackState: PlaybackState = {
  currentTrack: null,
  queue: [],
  queueIndex: -1,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  isMuted: false,
  repeatMode: 'off',
  shuffle: false,
  crossfadeEnabled: true,
  crossfadeDuration: 5,
};

const defaultLibrary: LibraryState = {
  likedTracks: [],
  playlists: [],
  artists: [],
  albums: [],
};

export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      currentPage: 'home',
      setCurrentPage: (page: Page) => set({ currentPage: page }),

      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed: boolean) => set({ sidebarCollapsed: collapsed }),

      theme: 'system',
      setTheme: (theme) => set({ theme }),

      searchQuery: '',
      setSearchQuery: (query: string) => set({ searchQuery: query }),
      searchResults: { tracks: [], artists: [], albums: [], playlists: [] },
      setSearchResults: (results: SearchResult) => set({ searchResults: results }),
      searchDebounceTimer: null,
      setSearchDebounceTimer: (timer) => set({ searchDebounceTimer: timer }),

      playbackState: defaultPlaybackState,
      setPlaybackState: (state: Partial<PlaybackState>) =>
        set((s) => ({ playbackState: { ...s.playbackState, ...state } })),
      updatePlaybackState: (updates: Partial<PlaybackState>) =>
        set((s) => ({ playbackState: { ...s.playbackState, ...updates } })),

      library: defaultLibrary,
      setLibrary: (library: LibraryState) => set({ library }),
      toggleLikeTrack: (track: Track) =>
        set((s) => {
          const liked = s.library.likedTracks;
          const exists = liked.find((t) => t.id === track.id);
          return {
            library: {
              ...s.library,
              likedTracks: exists
                ? liked.filter((t) => t.id !== track.id)
                : [{ ...track, isFavorite: true }, ...liked],
            },
          };
        }),
      addPlaylist: (playlist: Playlist) =>
        set((s) => ({
          library: { ...s.library, playlists: [playlist, ...s.library.playlists] },
        })),
      updatePlaylist: (id: string, updates: Partial<Playlist>) =>
        set((s) => ({
          library: {
            ...s.library,
            playlists: s.library.playlists.map((p) =>
              p.id === id ? { ...p, ...updates } : p
            ),
          },
        })),
      deletePlaylist: (id: string) =>
        set((s) => ({
          library: {
            ...s.library,
            playlists: s.library.playlists.filter((p) => p.id !== id),
          },
        })),

      playHistory: [],
      addToHistory: (track: Track, progress: number, duration: number, completed: boolean) =>
        set((s) => ({
          playHistory: [
            {
              id: crypto.randomUUID(),
              trackId: track.id,
              track,
              playedAt: new Date().toISOString(),
              progress,
              duration,
              completed,
            },
            ...s.playHistory.filter((h) => h.trackId !== track.id).slice(0, 999),
          ],
        })),
      clearHistory: () => set({ playHistory: [] }),

      settings: defaultSettings,
      setSettings: (partialSettings: Partial<Settings>) =>
        set((state) => ({
          settings: {
            ...state.settings,
            ...partialSettings,
            general: { ...state.settings.general, ...partialSettings.general },
            playback: { ...state.settings.playback, ...partialSettings.playback },
            appearance: { ...state.settings.appearance, ...partialSettings.appearance },
            library: { ...state.settings.library, ...partialSettings.library },
            network: { ...state.settings.network, ...partialSettings.network },
            privacy: { ...state.settings.privacy, ...partialSettings.privacy },
            youtubeMusic: { ...state.settings.youtubeMusic, ...partialSettings.youtubeMusic },
          },
        })),

      lyricsPanelOpen: false,
      toggleLyricsPanel: () => set((s) => ({ lyricsPanelOpen: !s.lyricsPanelOpen })),

      queueDrawerOpen: false,
      toggleQueueDrawer: () => set((s) => ({ queueDrawerOpen: !s.queueDrawerOpen })),

      miniPlayerOpen: false,
      toggleMiniPlayer: () => set((s) => ({ miniPlayerOpen: !s.miniPlayerOpen })),

      notifications: [],
      addNotification: (notification) =>
        set((s) => ({
          notifications: [...s.notifications, { ...notification, id: crypto.randomUUID() }],
        })),
      removeNotification: (id: string) =>
        set((s) => ({
          notifications: s.notifications.filter((n) => n.id !== id),
        })),
    }),
    {
      name: 'musify-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
        library: state.library,
        playHistory: state.playHistory.slice(0, 500),
        settings: state.settings,
        playbackState: {
          volume: state.playbackState.volume,
          isMuted: state.playbackState.isMuted,
          repeatMode: state.playbackState.repeatMode,
          shuffle: state.playbackState.shuffle,
          crossfadeEnabled: state.playbackState.crossfadeEnabled,
          crossfadeDuration: state.playbackState.crossfadeDuration,
        },
      }),
    }
  )
);