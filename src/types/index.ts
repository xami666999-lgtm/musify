export interface Track {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  album?: string;
  albumId?: string;
  albumArtUrl?: string;
  duration: number;
  sourceUrl: string;
  sourceType: 'youtube-music' | 'local' | 'piped' | 'soundcloud' | 'cached';
  videoId?: string;
  year?: number;
  viewCount?: number;
  genre?: string;
  lyrics?: string;
  isFavorite?: boolean;
  cachedPath?: string;
  addedAt?: string;
  playCount?: number;
}

export interface Artist {
  id: string;
  name: string;
  imageUrl?: string;
  subscriberCount?: number;
  description?: string;
  genres?: string[];
}

export interface Album {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  coverArtUrl?: string;
  year?: number;
  trackCount?: number;
  tracks?: Track[];
  releaseDate?: string;
}

export interface Playlist {
  id: string;
  title: string;
  description?: string;
  coverArtUrl?: string;
  trackCount: number;
  tracks?: Track[];
  owner?: string;
  isPublic?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SearchResult {
  tracks: Track[];
  artists: Artist[];
  albums: Album[];
  playlists?: Playlist[];
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  createdAt: string;
  pin?: string;
  email?: string;
}

export interface PlayHistoryItem {
  id: string;
  trackId: string;
  track: Track;
  playedAt: string;
  progress: number;
  duration: number;
  completed: boolean;
}

export interface LibraryState {
  likedTracks: Track[];
  playlists: Playlist[];
  artists: Artist[];
  albums: Album[];
}

export interface Settings {
  general: GeneralSettings;
  playback: PlaybackSettings;
  appearance: AppearanceSettings;
  library: LibrarySettings;
  network: NetworkSettings;
  privacy: PrivacySettings;
  youtubeMusic: YouTubeMusicSettings;
}

export interface GeneralSettings {
  language: string;
  region: string;
  contentLanguage: string[];
  adultContent: boolean;
  autoPlayNext: boolean;
  autoPlayRelated: boolean;
  crossfadeEnabled: boolean;
  crossfadeDuration: number;
}

export interface PlaybackSettings {
  quality: 'high' | 'medium' | 'low';
  volume: number;
  normalization: boolean;
  gaplessPlayback: boolean;
  equalizer: EqualizerSettings;
}

export interface EqualizerSettings {
  enabled: boolean;
  preset: 'flat' | 'bass' | 'treble' | 'vocal' | 'custom';
  bands: number[];
}

export interface AppearanceSettings {
  theme: 'system' | 'light' | 'dark' | 'oled';
  accentColor: string;
  compactMode: boolean;
  showVisualizer: boolean;
  reduceMotion: boolean;
  fontScale: number;
}

export interface LibrarySettings {
  autoAddLiked: boolean;
  showLocalFiles: boolean;
  localFolders: string[];
  organizeImports: boolean;
}

export interface NetworkSettings {
  proxyUrl?: string;
  proxyUsername?: string;
  proxyPassword?: string;
  dnsOverHttps: boolean;
  customDns?: string;
  offlineMode: boolean;
}

export interface PrivacySettings {
  analytics: boolean;
  crashReporting: boolean;
  shareUsageData: boolean;
  clearHistoryOnExit: boolean;
  blockTracking: boolean;
}

export interface YouTubeMusicSettings {
  cookiesPath?: string;
  quality: 'high' | 'medium' | 'low';
  useMusicApi: boolean;
  region: string;
}

export type Page = 
  | 'home' 
  | 'search' 
  | 'search-results' 
  | 'library' 
  | 'settings' 
  | 'artist' 
  | 'album' 
  | 'playlist' 
  | 'player'
  | 'lyrics'
  | 'queue';

export type ViewMode = 'grid' | 'list' | 'detailed';

export type SortField = 'title' | 'artist' | 'album' | 'year' | 'addedAt' | 'playCount' | 'duration';
export type SortDirection = 'asc' | 'desc';

export interface FilterState {
  type: 'tracks' | 'artists' | 'albums' | 'playlists' | 'all';
  genres: string[];
  years: number[];
  duration?: [number, number];
  searchQuery: string;
}

export interface PlaybackState {
  currentTrack: Track | null;
  queue: Track[];
  queueIndex: number;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  repeatMode: 'off' | 'one' | 'all';
  shuffle: boolean;
  crossfadeEnabled: boolean;
  crossfadeDuration: number;
}

export interface AppStore {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  theme: 'system' | 'light' | 'dark' | 'oled';
  setTheme: (theme: 'system' | 'light' | 'dark' | 'oled') => void;
  
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: SearchResult;
  setSearchResults: (results: SearchResult) => void;
  searchDebounceTimer: NodeJS.Timeout | null;
  setSearchDebounceTimer: (timer: NodeJS.Timeout | null) => void;
  
  playbackState: PlaybackState;
  setPlaybackState: (state: Partial<PlaybackState>) => void;
  updatePlaybackState: (updates: Partial<PlaybackState>) => void;
  
  library: LibraryState;
  setLibrary: (library: LibraryState) => void;
  toggleLikeTrack: (track: Track) => void;
  addPlaylist: (playlist: Playlist) => void;
  updatePlaylist: (id: string, updates: Partial<Playlist>) => void;
  deletePlaylist: (id: string) => void;
  
  playHistory: PlayHistoryItem[];
  addToHistory: (track: Track, progress: number, duration: number, completed: boolean) => void;
  clearHistory: () => void;
  
  settings: Settings;
  setSettings: (settings: Partial<Settings>) => void;
  
  lyricsPanelOpen: boolean;
  toggleLyricsPanel: () => void;
  
  queueDrawerOpen: boolean;
  toggleQueueDrawer: () => void;
  
  miniPlayerOpen: boolean;
  toggleMiniPlayer: () => void;
  
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface Subtitle {
  id: string;
  url: string;
  language: string;
  label: string;
  hearingImpaired?: boolean;
}

export interface LyricsLine {
  time: number;
  text: string;
}

export interface LyricsData {
  synced: boolean;
  lines: LyricsLine[];
  provider: string;
}

export interface VisualizerData {
  frequencyData: Uint8Array | null;
  waveformData: Uint8Array | null;
}

export type ThemeId = string;

export interface Theme {
  id: ThemeId;
  name: string;
  displayName: string;
  description?: string;
  author?: string;
  version?: string;
  previewImages?: string[];
  isBuiltIn: boolean;
  isActive: boolean;
  config: ThemeConfig;
  assets?: Record<string, string>;
  layouts?: ThemeLayouts;
  animations?: ThemeAnimations;
  sounds?: ThemeSounds;
}

export interface ThemeConfig {
  colors: ThemeColors;
  fonts: ThemeFonts;
  spacing: ThemeSpacing;
  borderRadius: ThemeBorderRadius;
  shadows: ThemeShadows;
  transitions: ThemeTransitions;
  backgroundEffects: ThemeBackgroundEffects;
  informationDensity: 'comfortable' | 'compact' | 'spacious';
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  surfaceVariant: string;
  outline: string;
  outlineVariant: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  overlay: string;
  backdrop: string;
}

export interface ThemeFonts {
  display: string;
  heading: string;
  body: string;
  mono: string;
  ui: string;
  sizes: Record<string, string>;
  weights: Record<string, number>;
}

export interface ThemeSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  xxl: string;
}

export interface ThemeBorderRadius {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  full: string;
}

export interface ThemeShadows {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  glow: string;
  glowStrong: string;
}

export interface ThemeTransitions {
  fast: string;
  normal: string;
  slow: string;
  easing: string;
}

export interface ThemeBackgroundEffects {
  enabled: boolean;
  type: 'none' | 'gradient' | 'mesh' | 'particles' | 'blur';
  intensity: number;
}

export interface ThemeLayouts {
  home: { type: 'hero' | 'grid' | 'list' | 'carousel' };
  library: { type: 'grid' | 'list' | 'detailed' };
  search: { type: 'dropdown' | 'full' | 'inline' };
  player: { type: 'bar' | 'full' | 'mini' | 'theater' };
  gameCard: { aspectRatio: string; hoverEffect: 'lift' | 'glow' | 'scale' | 'reveal' };
  navigation: { type: 'sidebar' | 'bottom' | 'top' | 'rail'; position: 'left' | 'right' | 'bottom' | 'top' };
}

export interface ThemeAnimations {
  enabled: boolean;
  duration: number;
  easing: string;
  pageTransition: 'fade' | 'slide' | 'zoom' | 'none';
  hoverScale: number;
  pressScale: number;
}

export interface ThemeSounds {
  enabled: boolean;
  volume: number;
  click: string;
  hover: string;
  transition: string;
  notification: string;
  error: string;
}