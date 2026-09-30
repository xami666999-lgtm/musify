import { Link, useRouterState } from "@tanstack/react-router";
import {
  Disc3,
  Globe,
  Heart,
  Home,
  Library,
  ListMusic,
  ListOrdered,
  Menu,
  Minimize2,
  Pause,
  Play,
  Plus,
  Repeat,
  Repeat1,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  ThumbsDown,
  ThumbsUp,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { useClock } from "@/lib/audio";
import { cn } from "@/lib/cn";
import { useHydrated, usePlayer } from "@/lib/player-store";
import { formatTime } from "@/lib/types";
import { Cover } from "@/components/shelves";
import { ContextMenu, PlaylistDialog } from "@/components/tracks";

const NAV = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/search", label: "Search", icon: Search, exact: false },
  { to: "/library", label: "Library", icon: Library, exact: false },
  { to: "/liked", label: "Liked songs", icon: Heart, exact: false },
  { to: "/browse", label: "Artists & albums", icon: Disc3, exact: false },
  { to: "/sources", label: "Sources", icon: Globe, exact: false },
] as const;

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const playlists = usePlayer((s) => s.playlists);
  const flashId = usePlayer((s) => s.flashId);
  const openDialog = usePlayer((s) => s.openDialog);
  const setQueueOpen = usePlayer((s) => s.setQueueOpen);
  const queueOpen = usePlayer((s) => s.queueOpen);
  const theme = usePlayer((s) => s.theme);
  const toggleTheme = usePlayer((s) => s.toggleTheme);
  const setMini = usePlayer((s) => s.setMini);
  const dragging = usePlayer((s) => s.dragging);
  const addToPlaylist = usePlayer((s) => s.addToPlaylist);
  const [over, setOver] = useState<string | null>(null);

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar">
      <div className="px-4 py-5">
        <Link to="/" onClick={onNavigate} className="text-base font-bold tracking-tight text-fg">
          Musify
        </Link>
      </div>
      <nav className="flex flex-col gap-1 px-2">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.exact }}
            onClick={onNavigate}
            className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted"
            activeProps={{ className: "flex min-h-11 items-center gap-3 rounded-md bg-surface-2 px-3 text-sm font-medium text-fg" }}
          >
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => {
            setQueueOpen(!queueOpen);
            onNavigate?.();
          }}
          className={cn("flex min-h-11 items-center gap-3 rounded-md px-3 text-left text-sm font-medium text-muted", queueOpen && "bg-surface-2 text-fg")}
        >
          <ListOrdered className="size-4" />
          Queue
        </button>
      </nav>
      <div className="mt-6 flex items-center justify-between px-4">
        <h2 className="text-xs font-semibold tracking-wide text-muted">Playlists</h2>
        <button type="button" aria-label="New playlist" className="grid size-11 place-items-center text-muted hover:text-fg" onClick={() => openDialog()}>
          <Plus className="size-4" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        <Link
          to="/liked"
          onClick={onNavigate}
          className="flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium text-muted"
          activeProps={{ className: "flex min-h-11 items-center gap-2 rounded-md bg-surface-2 px-3 text-sm font-medium text-fg" }}
        >
          <Heart className="size-4 text-copper" />
          Liked songs
        </Link>
        {playlists.map((playlist) => (
          <Link
            key={playlist.id}
            to="/playlist/$playlistId"
            params={{ playlistId: playlist.id }}
            onClick={onNavigate}
            onDragOver={(event) => {
              if (!dragging) return;
              event.preventDefault();
              setOver(playlist.id);
            }}
            onDragLeave={() => setOver((id) => (id === playlist.id ? null : id))}
            onDrop={(event) => {
              event.preventDefault();
              if (dragging) addToPlaylist(playlist.id, dragging);
              setOver(null);
            }}
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-md px-3 text-sm text-muted",
              flashId === playlist.id && "flash-row",
              over === playlist.id && "border border-copper text-fg",
            )}
            activeProps={{ className: "flex min-h-11 items-center gap-2 rounded-md bg-surface-2 px-3 text-sm text-fg" }}
          >
            <ListMusic className="size-4 shrink-0" />
            <span className="truncate">{playlist.name}</span>
          </Link>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-line px-3 py-2">
        <button type="button" className="min-h-11 px-2 text-sm text-muted hover:text-fg" onClick={toggleTheme}>
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
        <button type="button" aria-label="Mini player" className="grid size-11 place-items-center text-muted hover:text-fg" onClick={() => setMini(true)}>
          <Minimize2 className="size-4" />
        </button>
      </div>
    </div>
  );
}

function Transport({ large = false, compact = false }: { large?: boolean; compact?: boolean }) {
  const playing = usePlayer((s) => s.playing);
  const toggle = usePlayer((s) => s.toggle);
  const next = usePlayer((s) => s.next);
  const prev = usePlayer((s) => s.prev);
  const shuffle = usePlayer((s) => s.shuffle);
  const toggleShuffle = usePlayer((s) => s.toggleShuffle);
  const repeat = usePlayer((s) => s.repeat);
  const toggleRepeat = usePlayer((s) => s.toggleRepeat);
  const icon = large ? "size-6" : "size-5";
  return (
    <div className="flex items-center justify-center gap-1">
      <button type="button" aria-label="Shuffle" aria-pressed={shuffle} onClick={toggleShuffle} className={cn("grid size-11 place-items-center active:scale-[0.96]", compact && "hidden sm:grid", shuffle ? "text-copper" : "text-muted")}>
        <Shuffle className="size-4" />
      </button>
      <button type="button" aria-label="Previous" onClick={prev} className="grid size-11 place-items-center text-fg active:scale-[0.96]">
        <SkipBack className={cn(icon, "fill-current")} />
      </button>
      <button type="button" aria-label={playing ? "Pause" : "Play"} onClick={toggle} className={cn("grid place-items-center rounded-full bg-copper text-on-copper active:scale-[0.96]", large ? "size-14" : "size-11")}>
        {playing ? <Pause className={cn(icon, "fill-current")} /> : <Play className={cn(icon, "fill-current")} />}
      </button>
      <button type="button" aria-label="Next" onClick={() => next(false)} className="grid size-11 place-items-center text-fg active:scale-[0.96]">
        <SkipForward className={cn(icon, "fill-current")} />
      </button>
      <button type="button" aria-label={repeat === "one" ? "Repeat one" : "Repeat all"} onClick={toggleRepeat} className={cn("grid size-11 place-items-center text-copper active:scale-[0.96]", compact && "hidden sm:grid")}>
        {repeat === "one" ? <Repeat1 className="size-4" /> : <Repeat className="size-4" />}
      </button>
    </div>
  );
}

function Seek({ wide = false }: { wide?: boolean }) {
  const time = useClock((s) => s.time);
  const duration = useClock((s) => s.duration);
  const seek = usePlayer((s) => s.seek);
  const track = usePlayer((s) => s.queue[s.index]);
  const total = track?.source === "Radio" ? 0 : duration || track?.duration || 0;
  if (track?.source === "Radio") {
    return (
      <div className={cn("flex items-center gap-3", wide && "w-full max-w-xl")}>
        <span className="text-xs font-semibold tracking-wide text-copper">LIVE</span>
        <div className="h-1 min-w-0 flex-1 rounded-full bg-surface-2" />
      </div>
    );
  }
  return (
    <div className={cn("flex items-center gap-3", wide && "w-full max-w-xl")}>
      <span className="w-12 text-right text-xs text-muted tabular-nums">{formatTime(time)}</span>
      <input
        aria-label="Seek"
        className="min-w-0 flex-1"
        type="range"
        min={0}
        max={total || 0}
        step={0.1}
        value={Math.min(time, total || 0)}
        onChange={(event) => seek(Number(event.target.value))}
      />
      <span className="w-12 text-xs text-muted tabular-nums">{formatTime(total)}</span>
    </div>
  );
}

function PlayerBar() {
  const track = usePlayer((s) => s.queue[s.index]);
  const setFull = usePlayer((s) => s.setFull);
  const liked = usePlayer((s) => (track ? s.liked.some((item) => item.id === track.id) : false));
  const toggleLike = usePlayer((s) => s.toggleLike);
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const setVolume = usePlayer((s) => s.setVolume);
  const toggleMute = usePlayer((s) => s.toggleMute);
  const queueOpen = usePlayer((s) => s.queueOpen);
  const setQueueOpen = usePlayer((s) => s.setQueueOpen);

  return (
    <div
      className="border-t border-line bg-bg"
      onClick={(event) => {
        const target = event.target as HTMLElement;
        if (target.closest("button, input, a")) return;
        if (track) setFull(true);
      }}
    >
      <div className="flex items-center gap-3 px-3 pt-2">
        <Seek wide />
      </div>
      <div className="flex items-center gap-1 px-1 pb-1 md:grid md:grid-cols-3">
        <div className="flex min-w-0 flex-1 items-center gap-3 md:flex-none">
          {track ? (
            <>
              <button type="button" aria-label="Open player" onClick={() => setFull(true)} className="size-12 shrink-0">
                <Cover art={track.art} title={track.title} />
              </button>
              <button type="button" onClick={() => setFull(true)} className="min-w-0 text-left">
                <span className="block truncate text-sm">{track.title}</span>
                <span className="block truncate text-xs text-muted">{track.artist}</span>
              </button>
              <button
                type="button"
                aria-label={liked ? "Unlike" : "Like"}
                onClick={() => toggleLike(track)}
                className={cn("hidden size-11 place-items-center sm:grid", liked ? "text-copper" : "text-muted")}
              >
                <Heart className={cn("size-4", liked && "fill-current")} />
              </button>
            </>
          ) : (
            <p className="px-2 text-sm text-muted">Nothing playing</p>
          )}
        </div>
        <div className="md:justify-self-center">
          <Transport compact />
        </div>
        <div className="hidden items-center justify-end gap-1 md:flex">
          <button type="button" aria-label="Queue" aria-pressed={queueOpen} onClick={() => setQueueOpen(!queueOpen)} className={cn("grid size-11 place-items-center", queueOpen ? "text-copper" : "text-muted")}>
            <ListOrdered className="size-4" />
          </button>
          <button type="button" aria-label={muted ? "Unmute" : "Mute"} onClick={toggleMute} className="grid size-11 place-items-center text-muted">
            {muted || volume === 0 ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
          <input
            aria-label="Volume"
            className="w-24"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={(event) => setVolume(Number(event.target.value))}
          />
        </div>
      </div>
    </div>
  );
}

function FullPlayer() {
  const full = usePlayer((s) => s.full);
  const setFull = usePlayer((s) => s.setFull);
  const track = usePlayer((s) => s.queue[s.index]);
  const liked = usePlayer((s) => (track ? s.liked.some((item) => item.id === track.id) : false));
  const toggleLike = usePlayer((s) => s.toggleLike);
  if (!track) return null;
  return (
    <div className={cn("fixed inset-0 z-40 flex flex-col bg-bg transition duration-300", full ? "opacity-100" : "pointer-events-none opacity-0")} aria-hidden={!full}>
      <div className="flex items-center justify-between px-3 py-2">
        <button type="button" aria-label="Close player" onClick={() => setFull(false)} className="grid size-11 place-items-center text-fg">
          <X className="size-5" />
        </button>
        <p className="text-xs tracking-wide text-faint">Now playing</p>
        <button type="button" aria-label={liked ? "Unlike" : "Like"} onClick={() => toggleLike(track)} className={cn("grid size-11 place-items-center", liked ? "text-copper" : "text-muted")}>
          <Heart className={cn("size-4", liked && "fill-current")} />
        </button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-10">
        <Cover art={track.art} title={track.title} className="w-full max-w-sm rounded-lg" />
        <div className="w-full max-w-sm text-center">
          <h2 className="text-3xl font-bold tracking-tight">{track.title}</h2>
          <p className="mt-2 text-muted">{track.artist}</p>
        </div>
        <Seek wide />
        <Transport large />
      </div>
    </div>
  );
}

function QueueDrawer() {
  const open = usePlayer((s) => s.queueOpen);
  const setQueueOpen = usePlayer((s) => s.setQueueOpen);
  const queue = usePlayer((s) => s.queue);
  const index = usePlayer((s) => s.index);
  const autoplay = usePlayer((s) => s.autoplay);
  const toggleAutoplay = usePlayer((s) => s.toggleAutoplay);
  const playTracks = usePlayer((s) => s.playTracks);
  return (
    <aside className={cn("fixed bottom-28 right-0 top-0 z-30 flex w-full max-w-sm flex-col border-l border-line bg-surface transition-transform duration-300", open ? "translate-x-0" : "translate-x-full")}>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-base font-bold">Up next</h2>
        <button type="button" aria-label="Close queue" onClick={() => setQueueOpen(false)} className="grid size-11 place-items-center">
          <X className="size-4" />
        </button>
      </div>
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-sm text-muted">Autoplay adds similar songs when this queue ends.</p>
        <button type="button" aria-pressed={autoplay} onClick={toggleAutoplay} className={cn("ml-3 shrink-0 rounded-full px-3 py-2 text-sm font-semibold", autoplay ? "bg-copper text-on-copper" : "border border-line text-muted")}>
          {autoplay ? "On" : "Off"}
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {queue.length === 0 ? <p className="px-4 text-muted">Queue is empty.</p> : null}
        {queue.map((track, i) => (
          <button
            key={`${track.id}-${i}`}
            type="button"
            onClick={() => playTracks(queue, i)}
            className={cn("flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-surface-2", i === index && "text-copper")}
          >
            <span className="w-6 text-xs text-faint tabular-nums">{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{track.title}</span>
              <span className="block truncate text-xs text-muted">{track.artist}</span>
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}

function MiniPlayer() {
  const mini = usePlayer((s) => s.mini);
  const pos = usePlayer((s) => s.miniPos);
  const setMiniPos = usePlayer((s) => s.setMiniPos);
  const setMini = usePlayer((s) => s.setMini);
  const queue = usePlayer((s) => s.queue);
  const index = usePlayer((s) => s.index);
  const track = queue[index];
  const playing = usePlayer((s) => s.playing);
  const toggle = usePlayer((s) => s.toggle);
  const next = usePlayer((s) => s.next);
  const prev = usePlayer((s) => s.prev);
  const playTracks = usePlayer((s) => s.playTracks);
  const toggleMute = usePlayer((s) => s.toggleMute);
  const muted = usePlayer((s) => s.muted);
  const toggleLike = usePlayer((s) => s.toggleLike);
  const liked = usePlayer((s) => s.liked);
  const repeat = usePlayer((s) => s.repeat);
  const toggleRepeat = usePlayer((s) => s.toggleRepeat);
  const time = useClock((s) => s.time);
  const duration = useClock((s) => s.duration);
  const seek = usePlayer((s) => s.seek);
  const [fill, setFill] = useState(false);
  const upcoming = queue.slice(index + 1, index + 4);
  const total = track?.source === "Radio" ? 0 : duration || track?.duration || 0;
  const loved = !!track && liked.some((item) => item.id === track.id);

  useEffect(() => {
    if (!mini) return;
    const check = () => setFill(window.innerWidth < 860);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [mini]);

  if (!mini) return null;

  return (
    <div
      className={cn(
        "z-50 bg-[#1c1c1c] text-white",
        fill ? "fixed inset-0" : "fixed w-[700px] overflow-hidden rounded-xl border border-white/10 shadow-2xl",
      )}
      style={fill ? undefined : { left: pos.x, top: pos.y }}
      onPointerDown={(event) => {
        if (fill) return;
        if ((event.target as HTMLElement).closest("button, input, a")) return;
        const origin = usePlayer.getState().miniPos;
        const startX = event.clientX;
        const startY = event.clientY;
        const move = (ev: PointerEvent) => {
          setMiniPos({
            x: Math.max(8, Math.min(window.innerWidth - 680, origin.x + ev.clientX - startX)),
            y: Math.max(8, Math.min(window.innerHeight - 200, origin.y + ev.clientY - startY)),
          });
        };
        const up = () => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", up);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
      }}
    >
      <div className="flex h-full min-h-[210px]">
        <div className="flex w-[300px] shrink-0 flex-col">
          <div className="relative min-h-0 flex-1 bg-black">
            {track?.art ? (
              <img src={track.art} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-3xl font-semibold text-white/40">{track?.title.slice(0, 1) ?? "M"}</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/10" />
            <div className="absolute right-1 top-1 flex">
              <button type="button" aria-label={muted ? "Unmute" : "Mute"} onClick={toggleMute} className="grid size-9 place-items-center text-white/90">
                {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </button>
              <button
                type="button"
                aria-label={loved ? "Unlike" : "Like"}
                disabled={!track}
                onClick={() => track && toggleLike(track)}
                className={cn("grid size-9 place-items-center", loved ? "text-white" : "text-white/80")}
              >
                <ThumbsUp className={cn("size-4", loved && "fill-current")} />
              </button>
              <button type="button" aria-label="Skip" onClick={() => next(false)} className="grid size-9 place-items-center text-white/80">
                <ThumbsDown className="size-4" />
              </button>
            </div>
            <div className="absolute bottom-2 left-3 right-3">
              <p className="truncate text-[15px] font-semibold leading-tight">{track?.title ?? "Nothing playing"}</p>
              <p className="truncate text-[13px] text-white/70">{track?.artist ?? "Musify"}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 px-1 py-1">
            <button type="button" aria-label="Previous" onClick={prev} className="grid size-8 place-items-center text-white/80">
              <SkipBack className="size-3.5 fill-current" />
            </button>
            {track?.source === "Radio" ? (
              <div className="mx-1 h-1 min-w-0 flex-1 rounded-full bg-white/25" />
            ) : (
              <input
                aria-label="Seek"
                className="min-w-0 flex-1"
                type="range"
                min={0}
                max={total || 0}
                step={0.1}
                value={Math.min(time, total || 0)}
                onChange={(event) => seek(Number(event.target.value))}
              />
            )}
            <button type="button" aria-label="Next" onClick={() => next(false)} className="grid size-8 place-items-center text-white/80">
              <SkipForward className="size-3.5 fill-current" />
            </button>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-hidden py-2">
            {upcoming.length === 0 ? <p className="px-3 pt-2 text-sm text-white/50">Up next is empty</p> : null}
            {upcoming.map((item, offset) => (
              <button
                key={`${item.id}-${offset}`}
                type="button"
                onClick={() => playTracks(queue, index + 1 + offset)}
                className="flex w-full items-center gap-3 px-3 py-1.5 text-left hover:bg-white/5"
              >
                <span className="size-8 shrink-0 overflow-hidden rounded-sm bg-white/10">
                  {item.art ? <img src={item.art} alt="" className="h-full w-full object-cover" /> : null}
                </span>
                <span className="min-w-0 truncate text-sm">{item.title}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-end gap-2 px-3 pb-3">
            <button type="button" aria-label="Expand" onClick={() => setMini(false)} className="grid size-10 place-items-center text-white/80">
              <X className="size-5" />
            </button>
            <button type="button" aria-label={playing ? "Pause" : "Play"} onClick={toggle} className="grid size-12 place-items-center rounded-full bg-white/15 text-white">
              {playing ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}
            </button>
            <button type="button" aria-label={repeat === "one" ? "Repeat one" : "Repeat"} onClick={toggleRepeat} className={cn("grid size-10 place-items-center", repeat === "one" ? "text-white" : "text-white/70")}>
              {repeat === "one" ? <Repeat1 className="size-5" /> : <Repeat className="size-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } }));
  const mini = usePlayer((s) => s.mini);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [navOpen, setNavOpen] = useState(false);
  useHydrated();

  useEffect(() => {
    const bridge = window as Window & { __musifyMini?: (on: boolean) => void };
    bridge.__musifyMini = (on) => usePlayer.getState().setMini(on);
    return () => {
      delete bridge.__musifyMini;
    };
  }, []);

  useEffect(() => {
    document.title = mini ? "Musify Mini" : "Musify";
  }, [mini]);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (event.key === "Escape") {
        const state = usePlayer.getState();
        if (state.menu) return state.closeMenu();
        if (state.dialog) return state.closeDialog();
        if (state.full) return state.setFull(false);
        if (state.queueOpen) return state.setQueueOpen(false);
        if (state.mini) return state.setMini(false);
      }
      if (event.code === "Space" && !typing) {
        event.preventDefault();
        usePlayer.getState().toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <QueryClientProvider client={client}>
    <div className="h-screen overflow-hidden bg-bg text-fg">
      <div className={cn("flex h-full min-h-0 flex-col", mini && "hidden")}>
        <div className="flex min-h-0 flex-1">
          <aside className="hidden w-60 shrink-0 flex-col border-r border-line md:flex">
            <Sidebar />
          </aside>
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex items-center gap-2 border-b border-line px-2 py-1 md:hidden">
              <button type="button" aria-label="Menu" onClick={() => setNavOpen(true)} className="grid size-11 place-items-center">
                <Menu className="size-5" />
              </button>
              <span className="text-base font-bold tracking-tight">Musify</span>
            </header>
            <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
          </div>
        </div>
        <PlayerBar />
      </div>
      {navOpen ? (
        <div className="fixed inset-0 z-40 flex flex-col bg-sidebar md:hidden">
          <button type="button" aria-label="Close menu" onClick={() => setNavOpen(false)} className="absolute right-2 top-2 z-10 grid size-11 place-items-center">
            <X className="size-5" />
          </button>
          <Sidebar onNavigate={() => setNavOpen(false)} />
        </div>
      ) : null}
      <FullPlayer />
      <QueueDrawer />
      <MiniPlayer />
      <ContextMenu />
      <PlaylistDialog />
    </div>
    </QueryClientProvider>
  );
}
