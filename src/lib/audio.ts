import { create } from "zustand";

export const useClock = create<{ time: number; duration: number }>(() => ({
  time: 0,
  duration: 0,
}));

let audio: HTMLAudioElement | null = null;
let token = 0;
let retried = new Set<string>();
let onError: (id: string) => void = () => {};
let onEnded: () => void = () => {};
let onBlocked: () => void = () => {};

export function onPlayBlocked(fn: () => void) {
  onBlocked = fn;
}

export function onTrackError(fn: (id: string) => void) {
  onError = fn;
}

export function onTrackEnded(fn: () => void) {
  onEnded = fn;
}

export function getAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!audio) {
    audio = new Audio();
    audio.preload = "none";
    audio.addEventListener("timeupdate", () => {
      if (!audio) return;
      useClock.setState({ time: audio.currentTime, duration: Number.isFinite(audio.duration) ? audio.duration : 0 });
    });
    audio.addEventListener("ended", () => onEnded());
    audio.addEventListener("error", () => {
      const current = token;
      const id = audio?.dataset.trackId;
      window.setTimeout(() => {
        if (!audio || current !== token || !id || audio.dataset.trackId !== id) return;
        if (!audio.error) return;
        if (!retried.has(id)) {
          retried.add(id);
          const src = audio.src;
          audio.src = src;
          void audio.play().catch(() => onError(id));
          return;
        }
        onError(id);
      }, 200);
    });
  }
  return audio;
}

export function startTrack(track: { id: string; url: string } | undefined, play: boolean) {
  const el = getAudio();
  if (!el || !track) return;
  const mine = ++token;
  if (el.dataset.trackId !== track.id) {
    el.dataset.trackId = track.id;
    el.src = track.url;
    useClock.setState({ time: 0, duration: 0 });
  }
  if (!play) {
    el.pause();
    return;
  }
  void el.play().catch((error: unknown) => {
    if (mine !== token) return;
    if (error instanceof DOMException && error.name === "AbortError") return;
    onBlocked();
  });
}

export function seekTo(time: number) {
  const el = getAudio();
  if (!el) return;
  el.currentTime = time;
  useClock.setState({ time });
}

export function applyVolume(volume: number, muted: boolean) {
  const el = getAudio();
  if (!el) return;
  el.volume = muted ? 0 : volume;
}
