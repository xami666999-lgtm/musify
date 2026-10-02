import { GENRES, type AlbumCard, type Genre, type Shelves, type Track } from "@/lib/types";

const TTL = 10 * 60 * 1000;
const mem = new Map<string, { exp: number; val: unknown }>();

type DzCover = {
  cover_xl?: string;
  cover_big?: string;
  cover_medium?: string;
};

type DzAlbum = DzCover & {
  id?: number;
  title?: string;
  release_date?: string;
  nb_tracks?: number;
  artist?: { id?: number; name?: string };
  tracks?: { data?: DzTrack[] };
};

type DzTrack = {
  id?: number;
  title?: string;
  duration?: number;
  preview?: string;
  artist?: { name?: string };
  album?: DzAlbum;
};

type DzList<T> = { data?: T[]; error?: { message?: string } };

function cleanTerms(raw: string): string {
  return raw.replace(/\s+/g, " ").trim().slice(0, 80);
}

function assertId(id: string): string {
  if (!/^\d{1,14}$/.test(id)) throw new Error("Unknown album");
  return id;
}

async function memo<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = mem.get(key);
  if (hit && hit.exp > Date.now()) return hit.val as T;
  const val = await fn();
  mem.set(key, { exp: Date.now() + TTL, val });
  return val;
}

async function dzFetch<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { accept: "application/json", "user-agent": "Mxsify/1.0" },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) throw new Error("The catalog did not answer.");
  return (await response.json()) as T;
}

function dzJsonp<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const name = `mxsifyCb${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const script = document.createElement("script");
    const host = window as unknown as Record<string, unknown>;
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("The catalog did not answer."));
    }, 12000);
    const cleanup = () => {
      window.clearTimeout(timer);
      delete host[name];
      script.remove();
    };
    host[name] = (data: T) => {
      cleanup();
      resolve(data);
    };
    const join = url.includes("?") ? "&" : "?";
    script.src = `${url}${join}output=jsonp&callback=${name}`;
    script.onerror = () => {
      cleanup();
      reject(new Error("The catalog did not answer."));
    };
    document.head.appendChild(script);
  });
}

async function dz<T>(path: string): Promise<T> {
  const url = `https://api.deezer.com${path}`;
  const json = (typeof window === "undefined" ? await dzFetch<T>(url) : await dzJsonp<T>(url)) as T & {
    error?: { message?: string };
  };
  if (json && typeof json === "object" && json.error) throw new Error("The catalog did not answer.");
  return json;
}

function artOf(row?: DzCover | null): string {
  return row?.cover_xl || row?.cover_big || row?.cover_medium || "";
}

function toAlbum(row: DzAlbum): AlbumCard | null {
  if (!row.id || !row.title) return null;
  return {
    id: String(row.id),
    title: row.title,
    artist: row.artist?.name || "Unknown artist",
    year: (row.release_date || "").slice(0, 4),
    art: artOf(row),
    source: "Deezer",
  };
}

function toTrack(row: DzTrack, fallback?: { album: string; albumId: string; art: string; artist: string }): Track | null {
  if (!row.id || !row.title || !row.preview) return null;
  return {
    id: `dz:${row.id}`,
    title: row.title,
    artist: row.artist?.name || fallback?.artist || "Unknown artist",
    album: row.album?.title || fallback?.album || "",
    albumId: row.album?.id ? String(row.album.id) : fallback?.albumId || "",
    duration: row.duration || 30,
    source: "Deezer",
    art: artOf(row.album) || fallback?.art || "",
    url: row.preview,
  };
}

async function chartAlbums(genreId: string, limit: number): Promise<AlbumCard[]> {
  return memo(`albums:${genreId}:${limit}`, async () => {
    const json = await dz<DzList<DzAlbum>>(`/chart/${genreId}/albums?limit=${limit}`);
    const seen = new Set<string>();
    const albums: AlbumCard[] = [];
    for (const row of json.data ?? []) {
      const album = toAlbum(row);
      if (!album || seen.has(album.id)) continue;
      seen.add(album.id);
      albums.push(album);
    }
    return albums;
  });
}

export async function loadAlbum(id: string): Promise<{ album: AlbumCard; tracks: Track[] }> {
  const safe = assertId(id);
  return memo(`album:${safe}`, async () => {
    const detail = await dz<DzAlbum>(`/album/${safe}`);
    const album = toAlbum(detail);
    if (!album) throw new Error("Unknown album");
    let rows = detail.tracks?.data ?? [];
    if ((detail.nb_tracks ?? 0) > rows.length) {
      const more = await dz<DzList<DzTrack>>(`/album/${safe}/tracks?limit=100`);
      if (more.data?.length) rows = more.data;
    }
    const tracks = rows
      .map((row) => toTrack(row, { album: album.title, albumId: album.id, art: album.art, artist: album.artist }))
      .filter((track): track is Track => track !== null);
    return { album, tracks };
  });
}

async function loadShelves(): Promise<Shelves> {
  const [fresh, pop, hiphop, rock, dance] = await Promise.all([
    chartAlbums("0", 18).catch(() => [] as AlbumCard[]),
    chartAlbums("132", 12).catch(() => [] as AlbumCard[]),
    chartAlbums("116", 12).catch(() => [] as AlbumCard[]),
    chartAlbums("152", 12).catch(() => [] as AlbumCard[]),
    chartAlbums("113", 12).catch(() => [] as AlbumCard[]),
  ]);
  return {
    fresh,
    made: [
      { id: "pop", title: "Pop", albums: pop },
      { id: "hiphop", title: "Hip hop", albums: hiphop },
      { id: "rock", title: "Rock", albums: rock },
      { id: "dance", title: "Dance", albums: dance },
    ],
    genres: GENRES,
  };
}

async function loadCharts(): Promise<Track[]> {
  return memo("charts", async () => {
    const json = await dz<DzList<DzTrack>>("/chart/0/tracks?limit=40");
    return (json.data ?? []).map((row) => toTrack(row)).filter((track): track is Track => track !== null);
  });
}

async function loadGenre(id: string): Promise<{ genre: Genre; albums: AlbumCard[]; tracks: Track[] }> {
  const genre = GENRES.find((item) => item.id === id);
  if (!genre) throw new Error("Unknown genre");
  const [albums, chart] = await Promise.all([
    chartAlbums(genre.id, 18),
    dz<DzList<DzTrack>>(`/chart/${genre.id}/tracks?limit=20`),
  ]);
  const tracks = (chart.data ?? []).map((row) => toTrack(row)).filter((track): track is Track => track !== null);
  return { genre, albums, tracks };
}

async function loadArtist(name: string): Promise<{ name: string; albums: AlbumCard[]; tracks: Track[] }> {
  const safe = cleanTerms(name);
  if (!safe) return { name: name.slice(0, 120), albums: [], tracks: [] };
  const found = await dz<DzList<{ id?: number; name?: string }>>(`/search/artist?q=${encodeURIComponent(safe)}&limit=1`);
  const artist = found.data?.[0];
  if (!artist?.id) return { name: safe, albums: [], tracks: [] };
  const [albumList, top] = await Promise.all([
    dz<DzList<DzAlbum>>(`/artist/${artist.id}/albums?limit=18`),
    dz<DzList<DzTrack>>(`/artist/${artist.id}/top?limit=20`),
  ]);
  const albums = (albumList.data ?? []).map(toAlbum).filter((album): album is AlbumCard => album !== null);
  const tracks = (top.data ?? []).map((row) => toTrack(row)).filter((track): track is Track => track !== null);
  return { name: artist.name || safe, albums, tracks };
}

async function loadSearch(q: string): Promise<{ albums: AlbumCard[]; artists: string[] }> {
  const terms = cleanTerms(q);
  if (!terms) return { albums: [], artists: [] };
  const [albumList, artistList] = await Promise.all([
    dz<DzList<DzAlbum>>(`/search/album?q=${encodeURIComponent(terms)}&limit=18`),
    dz<DzList<{ name?: string }>>(`/search/artist?q=${encodeURIComponent(terms)}&limit=8`),
  ]);
  const albums = (albumList.data ?? []).map(toAlbum).filter((album): album is AlbumCard => album !== null);
  const artists = (artistList.data ?? []).map((artist) => artist.name || "").filter(Boolean);
  return { albums, artists };
}

async function loadSongs(q: string): Promise<Track[]> {
  const terms = cleanTerms(q);
  if (!terms) return [];
  return memo(`songs:${terms}`, async () => {
    const json = await dz<DzList<DzTrack>>(`/search/track?q=${encodeURIComponent(terms)}&limit=30`);
    return (json.data ?? []).map((row) => toTrack(row)).filter((track): track is Track => track !== null);
  });
}

async function loadRelated(artist: string, exclude: string[]): Promise<Track[]> {
  const safe = cleanTerms(artist);
  if (!safe) return [];
  const found = await dz<DzList<{ id?: number }>>(`/search/artist?q=${encodeURIComponent(safe)}&limit=1`);
  const id = found.data?.[0]?.id;
  if (!id) return [];
  const top = await dz<DzList<DzTrack>>(`/artist/${id}/top?limit=15`);
  const skip = new Set(exclude);
  const tracks: Track[] = [];
  for (const row of top.data ?? []) {
    const track = toTrack(row);
    if (!track || skip.has(track.id)) continue;
    tracks.push(track);
    if (tracks.length >= 8) break;
  }
  return tracks;
}

export function getShelves() {
  return loadShelves();
}

export function getCharts() {
  return loadCharts();
}

export function getAlbum(input: { data: { id: string } }) {
  return loadAlbum(assertId(input.data.id));
}

export function getGenre(input: { data: { id: string } }) {
  return loadGenre(input.data.id);
}

export function getArtist(input: { data: { name: string } }) {
  return loadArtist(input.data.name.slice(0, 160));
}

export function searchCatalog(input: { data: { q: string } }) {
  return loadSearch(typeof input.data.q === "string" ? input.data.q.slice(0, 80) : "");
}

export function searchSongs(input: { data: { q: string } }) {
  return loadSongs(typeof input.data.q === "string" ? input.data.q.slice(0, 80) : "");
}

export function relatedTracks(input: { data: { artist: string; exclude: string[] } }) {
  const artist = input.data.artist.slice(0, 120);
  const exclude = input.data.exclude.filter((id) => typeof id === "string").slice(0, 200);
  return loadRelated(artist, exclude);
}

const albumPromises = new Map<string, Promise<{ album: AlbumCard; tracks: Track[] }>>();

export function prefetchAlbum(id: string) {
  if (!/^\d{1,14}$/.test(id)) return Promise.resolve(undefined);
  if (!albumPromises.has(id)) {
    const pending = getAlbum({ data: { id } });
    albumPromises.set(
      id,
      pending.catch((error: unknown) => {
        albumPromises.delete(id);
        throw error;
      }),
    );
  }
  return albumPromises.get(id)!;
}
