export type AlbumCard = {
  id: string;
  title: string;
  artist: string;
  year: string;
  art: string;
  source: "Deezer" | "Archive";
};

export type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
  albumId: string;
  duration: number;
  source: "Deezer" | "Archive" | "Radio" | "ccMixter";
  art: string;
  url: string;
};

export type Playlist = {
  id: string;
  name: string;
  tracks: Track[];
};

export type Genre = {
  id: string;
  label: string;
  query: string;
};

export type MixRow = {
  id: string;
  title: string;
  albums: AlbumCard[];
};

export type Shelves = {
  fresh: AlbumCard[];
  made: MixRow[];
  genres: Genre[];
};

export const GENRES: Genre[] = [
  { id: "132", label: "Pop", query: "132" },
  { id: "116", label: "Hip hop", query: "116" },
  { id: "152", label: "Rock", query: "152" },
  { id: "113", label: "Dance", query: "113" },
  { id: "165", label: "R&B", query: "165" },
  { id: "85", label: "Alternative", query: "85" },
  { id: "106", label: "Electronic", query: "106" },
  { id: "129", label: "Jazz", query: "129" },
];

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
