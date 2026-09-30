import { execFile } from 'child_process';
import path from 'path';
import { app } from 'electron';
import type { Track, SearchResult, Artist, Album } from '../../src/types';

interface YTMusicConfig {
  cookiesPath?: string;
  userAgent?: string;
  extractAudioOnly?: boolean;
  quality?: 'high' | 'medium' | 'low';
}

interface YTMusicSearchResult {
  type: 'song' | 'video' | 'artist' | 'album' | 'playlist';
  videoId: string;
  title: string;
  artists: { name: string; id: string }[];
  album?: { name: string; id: string };
  thumbnails: { url: string; width: number; height: number }[];
  duration: string;
  duration_seconds: number;
  viewCount?: string;
  year?: number;
  channel_id?: string;
  playlist_id?: string;
  description?: string;
  trackCount?: number;
}

class YouTubeMusicService {
  private ytDlpPath: string;
  private config: YTMusicConfig;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 10 * 60 * 1000;

  constructor(config: YTMusicConfig = {}) {
    this.config = {
      extractAudioOnly: true,
      quality: 'high',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      ...config,
    };

    const userDataPath = app.getPath('userData');
    const ytDlpDir = path.join(userDataPath, 'yt-dlp');
    this.ytDlpPath = path.join(ytDlpDir, 'yt-dlp.exe');

    this.ensureYtDlp();
  }

  private async ensureYtDlp(): Promise<void> {
    const fs = await import('fs');
    const https = await import('https');

    if (fs.existsSync(this.ytDlpPath)) return;

    if (!fs.existsSync(path.dirname(this.ytDlpPath))) {
      fs.mkdirSync(path.dirname(this.ytDlpPath), { recursive: true });
    }

    const downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe';

    await new Promise<void>((resolve, reject) => {
      const file = fs.createWriteStream(this.ytDlpPath);
      https.get(downloadUrl, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          fs.chmodSync(this.ytDlpPath, 0o755);
          resolve();
        });
      }).on('error', (err) => {
        fs.unlinkSync(this.ytDlpPath);
        reject(err);
      });
    });
  }

  private getCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < this.CACHE_TTL) {
      return entry.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private async runYtDlp(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      execFile(this.ytDlpPath, args, {
        timeout: 30000,
        windowsHide: true,
        maxBuffer: 1024 * 1024 * 10,
      }, (error, stdout, stderr) => {
        if (error) {
          reject(new Error(`yt-dlp failed: ${stderr || error.message}`));
        } else {
          resolve(stdout);
        }
      });
    });
  }

  async search(query: string, filter: 'songs' | 'artists' | 'albums' | 'playlists' | 'videos' = 'songs', limit = 20): Promise<SearchResult> {
    const cacheKey = `search:${filter}:${query}:${limit}`;
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    const args = [
      `ytsearch${limit}:${query}`,
      '--flat-playlist',
      '--dump-json',
      '--no-warnings',
      '--ignore-errors',
    ];

    if (this.config.cookiesPath) {
      args.push('--cookies', this.config.cookiesPath);
    }

    try {
      const output = await this.runYtDlp(args);
      const lines = output.trim().split('\n').filter(Boolean);
      const results = lines.map(line => JSON.parse(line));

      const searchResult: SearchResult = {
        tracks: [],
        artists: [],
        albums: [],
        playlists: [],
      };

      for (const item of results) {
        if (filter === 'songs' || filter === 'videos') {
          if (item.duration_seconds && item.duration_seconds > 0) {
            searchResult.tracks.push(this.mapToTrack(item));
          }
        }
        if (filter === 'artists' && item.channel_id) {
          searchResult.artists.push(this.mapToArtist(item));
        }
        if (filter === 'albums' && item.playlist_id) {
          searchResult.albums.push(this.mapToAlbum(item));
        }
        if (filter === 'playlists' && item.playlist_id) {
          searchResult.playlists?.push(this.mapToPlaylist(item));
        }
      }

      this.setCache(cacheKey, searchResult);
      return searchResult;
    } catch (error) {
      console.error('YTMusic search error:', error);
      return { tracks: [], artists: [], albums: [], playlists: [] };
    }
  }

  async getStreamUrl(videoId: string): Promise<string> {
    const cacheKey = `stream:${videoId}:${this.config.quality}`;
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    const formatMap = {
      high: 'bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio',
      medium: 'bestaudio[ext=m4a][abr<=128]/bestaudio[ext=webm][abr<=128]/bestaudio',
      low: 'worstaudio[ext=m4a]/worstaudio[ext=webm]/worstaudio',
    };

    const args = [
      `https://music.youtube.com/watch?v=${videoId}`,
      '-f', formatMap[this.config.quality],
      '-g',
      '--no-warnings',
      '--ignore-errors',
    ];

    if (this.config.cookiesPath) {
      args.push('--cookies', this.config.cookiesPath);
    }

    try {
      const output = await this.runYtDlp(args);
      const url = output.trim().split('\n')[0];
      this.setCache(cacheKey, url);
      return url;
    } catch (error) {
      console.error('YTMusic stream error:', error);
      throw new Error(`Failed to get stream URL for ${videoId}`);
    }
  }

  async getTrackInfo(videoId: string): Promise<Track | null> {
    const cacheKey = `track:${videoId}`;
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    const args = [
      `https://music.youtube.com/watch?v=${videoId}`,
      '--dump-json',
      '--no-warnings',
      '--ignore-errors',
    ];

    if (this.config.cookiesPath) {
      args.push('--cookies', this.config.cookiesPath);
    }

    try {
      const output = await this.runYtDlp(args);
      const data = JSON.parse(output.trim());
      const track = this.mapToTrack(data);
      this.setCache(cacheKey, track);
      return track;
    } catch (error) {
      console.error('YTMusic track info error:', error);
      return null;
    }
  }

  async getArtistInfo(artistId: string): Promise<Artist | null> {
    const cacheKey = `artist:${artistId}`;
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    const args = [
      `https://music.youtube.com/channel/${artistId}`,
      '--flat-playlist',
      '--dump-json',
      '--no-warnings',
      '--ignore-errors',
    ];

    if (this.config.cookiesPath) {
      args.push('--cookies', this.config.cookiesPath);
    }

    try {
      const output = await this.runYtDlp(args);
      const data = JSON.parse(output.trim());
      const artist = this.mapToArtist(data);
      this.setCache(cacheKey, artist);
      return artist;
    } catch (error) {
      console.error('YTMusic artist info error:', error);
      return null;
    }
  }

  async getAlbumInfo(albumId: string): Promise<Album | null> {
    const cacheKey = `album:${albumId}`;
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    const args = [
      `https://music.youtube.com/playlist?list=${albumId}`,
      '--flat-playlist',
      '--dump-json',
      '--no-warnings',
      '--ignore-errors',
    ];

    if (this.config.cookiesPath) {
      args.push('--cookies', this.config.cookiesPath);
    }

    try {
      const output = await this.runYtDlp(args);
      const data = JSON.parse(output.trim());
      const album = this.mapToAlbum(data);
      this.setCache(cacheKey, album);
      return album;
    } catch (error) {
      console.error('YTMusic album info error:', error);
      return null;
    }
  }

  async getPlaylistTracks(playlistId: string): Promise<Track[]> {
    const cacheKey = `playlist:${playlistId}`;
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    const args = [
      `https://music.youtube.com/playlist?list=${playlistId}`,
      '--flat-playlist',
      '--dump-json',
      '--no-warnings',
      '--ignore-errors',
    ];

    if (this.config.cookiesPath) {
      args.push('--cookies', this.config.cookiesPath);
    }

    try {
      const output = await this.runYtDlp(args);
      const lines = output.trim().split('\n').filter(Boolean);
      const tracks = lines.map(line => {
        const data = JSON.parse(line);
        return this.mapToTrack(data);
      });
      this.setCache(cacheKey, tracks);
      return tracks;
    } catch (error) {
      console.error('YTMusic playlist error:', error);
      return [];
    }
  }

  async getRelatedTracks(videoId: string, limit = 20): Promise<Track[]> {
    const cacheKey = `related:${videoId}:${limit}`;
    const cached = this.getCache(cacheKey);
    if (cached) return cached;

    const args = [
      `https://music.youtube.com/watch?v=${videoId}&list=RD${videoId}`,
      '--flat-playlist',
      '--dump-json',
      '--no-warnings',
      '--ignore-errors',
      `--playlist-end`, limit.toString(),
    ];

    if (this.config.cookiesPath) {
      args.push('--cookies', this.config.cookiesPath);
    }

    try {
      const output = await this.runYtDlp(args);
      const lines = output.trim().split('\n').filter(Boolean);
      const tracks = lines.map(line => {
        const data = JSON.parse(line);
        return this.mapToTrack(data);
      });
      this.setCache(cacheKey, tracks);
      return tracks;
    } catch (error) {
      console.error('YTMusic related error:', error);
      return [];
    }
  }

  setCookies(cookiesPath: string): void {
    this.config.cookiesPath = cookiesPath;
    this.cache.clear();
  }

  setQuality(quality: 'high' | 'medium' | 'low'): void {
    this.config.quality = quality;
    this.cache.clear();
  }

  clearCache(): void {
    this.cache.clear();
  }

  private mapToTrack(data: YTMusicSearchResult): Track {
    const thumbnails = data.thumbnails || [];
    const bestThumb = thumbnails.sort((a, b) => b.width * b.height - a.width * a.height)[0];

    return {
      id: data.videoId,
      title: data.title,
      artist: data.artists.map(a => a.name).join(', '),
      artistId: data.artists[0]?.id,
      album: data.album?.name,
      albumId: data.album?.id,
      albumArtUrl: bestThumb?.url || `https://img.youtube.com/vi/${data.videoId}/maxresdefault.jpg`,
      duration: data.duration_seconds,
      sourceUrl: `https://music.youtube.com/watch?v=${data.videoId}`,
      sourceType: 'youtube-music',
      videoId: data.videoId,
      year: data.year,
      viewCount: data.viewCount ? parseInt(data.viewCount.replace(/,/g, ''), 10) : undefined,
    };
  }

  private mapToArtist(data: YTMusicSearchResult): Artist {
    const thumbnails = data.thumbnails || [];
    const bestThumb = thumbnails.sort((a, b) => b.width * b.height - a.width * a.height)[0];

    return {
      id: data.channel_id || data.videoId,
      name: data.title,
      imageUrl: bestThumb?.url,
      subscriberCount: data.viewCount ? parseInt(data.viewCount.replace(/,/g, ''), 10) : undefined,
    };
  }

  private mapToAlbum(data: YTMusicSearchResult): Album {
    const thumbnails = data.thumbnails || [];
    const bestThumb = thumbnails.sort((a, b) => b.width * b.height - a.width * a.height)[0];

    return {
      id: data.playlist_id || data.videoId,
      title: data.title,
      artist: data.artists[0]?.name || 'Unknown Artist',
      artistId: data.artists[0]?.id,
      coverArtUrl: bestThumb?.url,
      year: data.year,
      trackCount: undefined,
    };
  }

  private mapToPlaylist(data: YTMusicSearchResult): any {
    const thumbnails = data.thumbnails || [];
    const bestThumb = thumbnails.sort((a, b) => b.width * b.height - a.width * a.height)[0];

    return {
      id: data.playlist_id || data.videoId,
      title: data.title,
      description: data.description || '',
      coverArtUrl: bestThumb?.url,
      trackCount: data.trackCount || 0,
    };
  }
}

export const youtubeMusicService = new YouTubeMusicService();
export type { YTMusicConfig, YTMusicSearchResult };