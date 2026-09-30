import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useEffect, useState } from "react";
import { applyVolume, getAudio, onPlayBlocked, onTrackEnded, onTrackError, seekTo, startTrack } from "@/lib/audio";
import { relatedTracks } from "@/lib/catalog";
import type { AlbumCard, Playlist, Track } from "@/lib/types";

export type MenuState = {
  x: number;
  y: number;
  track: Track;
  playlistId?: string;
};

type PlayerState = {
  theme: "dark" | "light";
  queue: Track[];
  index: number;
  playing: boolean;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: "all" | "one";
  autoplay: boolean;
  liked: Track[];
  playlists: Playlist[];
  recentAlbums: AlbumCard[];
  mini: boolean;
  miniPos: { x: number; y: number };
  full: boolean;
  queueOpen: boolean;
  flashId: string | null;
  unavailable: string[];
  dragging: Track | null;
  menu: MenuState | null;
  dialog: { track?: Track } | null;
  toggleTheme: () => void;
  playTracks: (tracks: Track[], index: number, album?: AlbumCard) => void;
  toggle: () => void;
  next: (fromEnd?: boolean) => void;
  prev: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  toggleAutoplay: () => void;
  toggleLike: (track: Track) => void;
  createPlaylist: (name: string, track?: Track) => string;
  addToPlaylist: (id: string, track: Track) => void;
  removeFromPlaylist: (id: string, trackId: string) => void;
  deletePlaylist: (id: string) => void;
  playNext: (track: Track) => void;
  enqueue: (track: Track) => void;
  markBad: (id: string) => void;
  setFull: (full: boolean) => void;
  setQueueOpen: (open: boolean) => void;
  setMini: (mini: boolean) => void;
  setMiniPos: (pos: { x: number; y: number }) => void;
  setDragging: (track: Track | null) => void;
  openMenu: (menu: MenuState) => void;
  closeMenu: () => void;
  openDialog: (track?: Track) => void;
  closeDialog: () => void;
};

let autoplayBusy = false;

function rememberAlbum(albums: AlbumCard[], album?: AlbumCard): AlbumCard[] {
  if (!album) return albums;
  return [album, ...albums.filter((item) => item.id !== album.id)].slice(0, 12);
}

export const usePlayer = create<PlayerState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      queue: [],
      index: 0,
      playing: false,
      volume: 0.9,
      muted: false,
      shuffle: false,
      repeat: "all",
      autoplay: true,
      liked: [],
      playlists: [],
      recentAlbums: [],
      mini: false,
      miniPos: { x: 24, y: 80 },
      full: false,
      queueOpen: false,
      flashId: null,
      unavailable: [],
      dragging: null,
      menu: null,
      dialog: null,
      toggleTheme: () => {
        const theme = get().theme === "dark" ? "light" : "dark";
        set({ theme });
        document.documentElement.dataset.theme = theme;
      },
      playTracks: (tracks, index, album) => {
        if (!tracks.length) return;
        const nextIndex = Math.min(Math.max(index, 0), tracks.length - 1);
        set({
          queue: tracks.slice(0, 150),
          index: nextIndex,
          playing: true,
          recentAlbums: rememberAlbum(get().recentAlbums, album),
        });
        applyVolume(get().volume, get().muted);
        startTrack(tracks[nextIndex], true);
      },
      toggle: () => {
        const state = get();
        const track = state.queue[state.index];
        if (!track) return;
        if (state.playing) {
          startTrack(track, false);
          set({ playing: false });
          return;
        }
        applyVolume(state.volume, state.muted);
        startTrack(track, true);
        set({ playing: true });
      },
      next: (fromEnd = false) => {
        const state = get();
        if (!state.queue.length) return;
        if (state.repeat === "one" && fromEnd) {
          seekTo(0);
          startTrack(state.queue[state.index], true);
          set({ playing: true });
          return;
        }
        if (state.shuffle && state.queue.length > 1) {
          let index = state.index;
          while (index === state.index) index = Math.floor(Math.random() * state.queue.length);
          set({ index, playing: true });
          startTrack(state.queue[index], true);
          return;
        }
        if (state.index >= state.queue.length - 1) {
          if (state.autoplay && fromEnd && !state.shuffle) {
            const current = state.queue[state.index];
            if (!autoplayBusy && current && current.source !== "Radio") {
              autoplayBusy = true;
              void relatedTracks({ data: { artist: current.artist, exclude: state.queue.map((track) => track.id) } })
                .then((more) => {
                  const latest = get();
                  if (more.length) {
                    const queue = [...latest.queue, ...more].slice(0, 150);
                    const index = Math.min(latest.index + 1, queue.length - 1);
                    set({ queue, index, playing: true });
                    startTrack(queue[index], true);
                  } else {
                    set({ index: 0, playing: true });
                    startTrack(latest.queue[0], true);
                  }
                })
                .catch(() => {
                  const latest = get();
                  if (!latest.queue.length) return;
                  set({ index: 0, playing: true });
                  startTrack(latest.queue[0], true);
                })
                .finally(() => {
                  autoplayBusy = false;
                });
              return;
            }
          }
          set({ index: 0, playing: true });
          startTrack(state.queue[0], true);
          return;
        }
        const index = state.index + 1;
        set({ index, playing: true });
        startTrack(state.queue[index], true);
      },
      prev: () => {
        const state = get();
        if (!state.queue.length) return;
        const el = getAudio();
        if (el && el.currentTime > 3) {
          seekTo(0);
          return;
        }
        const index = (state.index - 1 + state.queue.length) % state.queue.length;
        set({ index, playing: true });
        startTrack(state.queue[index], true);
      },
      seek: (time) => seekTo(time),
      setVolume: (volume) => {
        const next = Math.min(1, Math.max(0, volume));
        set({ volume: next, muted: next === 0 });
        applyVolume(next, next === 0);
      },
      toggleMute: () => {
        const muted = !get().muted;
        set({ muted });
        applyVolume(get().volume, muted);
      },
      toggleShuffle: () => set({ shuffle: !get().shuffle }),
      toggleRepeat: () => set({ repeat: get().repeat === "all" ? "one" : "all" }),
      toggleAutoplay: () => set({ autoplay: !get().autoplay }),
      toggleLike: (track) => {
        const liked = get().liked;
        set({
          liked: liked.some((item) => item.id === track.id)
            ? liked.filter((item) => item.id !== track.id)
            : [track, ...liked],
        });
      },
      createPlaylist: (name, track) => {
        const id = `p_${Date.now().toString(36)}`;
        const playlist: Playlist = { id, name: name.trim() || "Playlist", tracks: track ? [track] : [] };
        set({ playlists: [...get().playlists, playlist], flashId: id });
        window.setTimeout(() => {
          if (get().flashId === id) set({ flashId: null });
        }, 700);
        return id;
      },
      addToPlaylist: (id, track) => {
        set({
          playlists: get().playlists.map((playlist) =>
            playlist.id === id && !playlist.tracks.some((item) => item.id === track.id)
              ? { ...playlist, tracks: [...playlist.tracks, track] }
              : playlist,
          ),
          flashId: id,
        });
        window.setTimeout(() => {
          if (get().flashId === id) set({ flashId: null });
        }, 700);
      },
      removeFromPlaylist: (id, trackId) => {
        set({
          playlists: get().playlists.map((playlist) =>
            playlist.id === id
              ? { ...playlist, tracks: playlist.tracks.filter((track) => track.id !== trackId) }
              : playlist,
          ),
        });
      },
      deletePlaylist: (id) => set({ playlists: get().playlists.filter((playlist) => playlist.id !== id) }),
      playNext: (track) => {
        const state = get();
        if (!state.queue.length) {
          get().playTracks([track], 0);
          return;
        }
        const queue = state.queue.slice();
        queue.splice(state.index + 1, 0, track);
        set({ queue });
      },
      enqueue: (track) => {
        const state = get();
        if (!state.queue.length) {
          get().playTracks([track], 0);
          return;
        }
        set({ queue: [...state.queue, track] });
      },
      markBad: (id) => {
        const unavailable = new Set(get().unavailable);
        unavailable.add(id);
        const queue = get().queue;
        const start = get().index;
        set({ unavailable: [...unavailable] });
        for (let step = 1; step <= queue.length; step += 1) {
          const index = (start + step) % queue.length;
          if (!unavailable.has(queue[index].id)) {
            set({ index, playing: true });
            startTrack(queue[index], true);
            return;
          }
        }
        set({ playing: false });
      },
      setFull: (full) => set({ full, mini: full ? false : get().mini }),
      setQueueOpen: (queueOpen) => set({ queueOpen }),
      setMini: (mini) => set({ mini, full: mini ? false : get().full }),
      setMiniPos: (miniPos) => set({ miniPos }),
      setDragging: (dragging) => set({ dragging }),
      openMenu: (menu) => set({ menu }),
      closeMenu: () => set({ menu: null }),
      openDialog: (track) => set({ dialog: { track }, menu: null }),
      closeDialog: () => set({ dialog: null }),
    }),
    {
      name: "musify",
      skipHydration: true,
      storage: createJSONStorage(() =>
        typeof window === "undefined"
          ? { getItem: () => null, setItem: () => {}, removeItem: () => {} }
          : localStorage,
      ),
      partialize: (state) => ({
        theme: state.theme,
        queue: state.queue,
        index: state.index,
        volume: state.volume,
        muted: state.muted,
        shuffle: state.shuffle,
        repeat: state.repeat,
        autoplay: state.autoplay,
        liked: state.liked,
        playlists: state.playlists,
        recentAlbums: state.recentAlbums,
        mini: state.mini,
        miniPos: state.miniPos,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        document.documentElement.dataset.theme = state.theme;
        applyVolume(state.volume, state.muted);
        const x = Math.min(Math.max(8, state.miniPos.x), window.innerWidth - 300);
        const y = Math.min(Math.max(8, state.miniPos.y), window.innerHeight - 120);
        if (x !== state.miniPos.x || y !== state.miniPos.y) state.setMiniPos({ x, y });
      },
    },
  ),
);

onTrackEnded(() => usePlayer.getState().next(true));
onTrackError((id) => usePlayer.getState().markBad(id));
onPlayBlocked(() => usePlayer.setState({ playing: false }));

export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const finish = () => setHydrated(true);
    const unsub = usePlayer.persist.onFinishHydration(finish);
    void usePlayer.persist.rehydrate();
    if (usePlayer.persist.hasHydrated()) finish();
    return unsub;
  }, []);
  return hydrated;
}
