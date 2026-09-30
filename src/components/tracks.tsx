import { useNavigate } from "@tanstack/react-router";
import { Heart, MoreHorizontal, Pause, Play } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/cn";
import { usePlayer } from "@/lib/player-store";
import { formatTime, type AlbumCard, type Track } from "@/lib/types";

function Bars({ paused }: { paused: boolean }) {
  return (
    <span className={cn("bars", paused && "is-paused")} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export function TrackList({
  tracks,
  album,
  playlistId,
}: {
  tracks: Track[];
  album?: AlbumCard;
  playlistId?: string;
}) {
  if (!tracks.length) {
    return <p className="px-2 py-6 text-muted">No playable songs in this list.</p>;
  }
  return (
    <div>
      <div className="hidden items-center gap-3 px-2 pb-2 text-xs text-faint lg:flex">
        <span className="w-8">#</span>
        <span className="min-w-0 flex-1">Title</span>
        <span className="w-36">Artist</span>
        <span className="w-40">Album</span>
        <span className="w-16">Source</span>
        <span className="w-11" />
        <span className="w-12 text-right">Time</span>
      </div>
      {tracks.map((track, index) => (
        <TrackRow key={`${track.id}-${index}`} track={track} index={index} tracks={tracks} album={album} playlistId={playlistId} />
      ))}
    </div>
  );
}

function TrackRow({
  track,
  index,
  tracks,
  album,
  playlistId,
}: {
  track: Track;
  index: number;
  tracks: Track[];
  album?: AlbumCard;
  playlistId?: string;
}) {
  const playTracks = usePlayer((s) => s.playTracks);
  const toggle = usePlayer((s) => s.toggle);
  const queue = usePlayer((s) => s.queue);
  const queueIndex = usePlayer((s) => s.index);
  const playing = usePlayer((s) => s.playing);
  const liked = usePlayer((s) => s.liked.some((item) => item.id === track.id));
  const toggleLike = usePlayer((s) => s.toggleLike);
  const openMenu = usePlayer((s) => s.openMenu);
  const setDragging = usePlayer((s) => s.setDragging);
  const unavailable = usePlayer((s) => s.unavailable.includes(track.id));
  const current = queue[queueIndex]?.id === track.id;
  const navigate = useNavigate();

  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", track.id);
        event.dataTransfer.effectAllowed = "copy";
        setDragging(track);
      }}
      onDragEnd={() => setDragging(null)}
      onClick={() => {
        if (current) toggle();
        else playTracks(tracks, index, album);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          if (current) toggle();
          else playTracks(tracks, index, album);
        }
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        openMenu({ x: event.clientX, y: event.clientY, track, playlistId });
      }}
      className={cn(
        "group flex min-h-11 items-center gap-3 px-2 py-2 text-left hover:bg-surface",
        current && "bg-surface",
        unavailable && "opacity-50",
      )}
    >
      <span className="relative grid h-8 w-8 shrink-0 place-items-center text-sm text-muted tabular-nums">
        <span className={cn(current && playing ? "group-hover:opacity-0" : "group-hover:hidden")}>
          {current ? <Bars paused={!playing} /> : index + 1}
        </span>
        {current && playing ? (
          <Pause className="absolute size-4 fill-current opacity-0 group-hover:opacity-100" />
        ) : (
          <Play className="absolute hidden size-4 fill-current group-hover:block" />
        )}
      </span>
      <span className={cn("min-w-0 flex-1 truncate", current && "text-copper")}>{track.title}</span>
      <button
        type="button"
        className="hidden w-36 truncate text-left text-muted hover:text-fg lg:block"
        onClick={(event) => {
          event.stopPropagation();
          void navigate({ to: "/artist", search: { name: track.artist } });
        }}
      >
        {track.artist}
      </button>
      <button
        type="button"
        className="hidden w-40 truncate text-left text-muted hover:text-fg lg:block"
        onClick={(event) => {
          event.stopPropagation();
          void navigate({ to: "/album/$albumId", params: { albumId: track.albumId } });
        }}
      >
        {track.album}
      </button>
      <span className="hidden w-16 shrink-0 text-xs text-faint lg:block">{track.source}</span>
      <button
        type="button"
        aria-label={liked ? "Unlike" : "Like"}
        className={cn("grid size-11 shrink-0 place-items-center", liked ? "text-copper" : "text-muted hover:text-fg")}
        onClick={(event) => {
          event.stopPropagation();
          toggleLike(track);
        }}
      >
        <Heart className={cn("size-4", liked && "fill-current")} />
      </button>
      <span className="w-12 shrink-0 text-right text-sm text-muted tabular-nums">{formatTime(track.duration)}</span>
      <button
        type="button"
        aria-label="Song menu"
        className="grid size-11 shrink-0 place-items-center text-muted hover:text-fg lg:hidden"
        onClick={(event) => {
          event.stopPropagation();
          const rect = event.currentTarget.getBoundingClientRect();
          openMenu({ x: rect.left, y: rect.bottom, track, playlistId });
        }}
      >
        <MoreHorizontal className="size-4" />
      </button>
    </div>
  );
}

export function ContextMenu() {
  const menu = usePlayer((s) => s.menu);
  const closeMenu = usePlayer((s) => s.closeMenu);
  const playNext = usePlayer((s) => s.playNext);
  const enqueue = usePlayer((s) => s.enqueue);
  const playlists = usePlayer((s) => s.playlists);
  const addToPlaylist = usePlayer((s) => s.addToPlaylist);
  const removeFromPlaylist = usePlayer((s) => s.removeFromPlaylist);
  const toggleLike = usePlayer((s) => s.toggleLike);
  const liked = usePlayer((s) => (menu ? s.liked.some((item) => item.id === menu.track.id) : false));
  const openDialog = usePlayer((s) => s.openDialog);
  const navigate = useNavigate();

  useEffect(() => {
    if (!menu) return;
    const close = () => closeMenu();
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [menu, closeMenu]);

  if (!menu) return null;
  const left = Math.min(menu.x, window.innerWidth - 220);
  const top = Math.min(menu.y, window.innerHeight - 320);

  const item = (label: string, action: () => void) => (
    <button
      type="button"
      className="block w-full px-3 py-2 text-left text-sm hover:bg-surface-2"
      onClick={() => {
        action();
        closeMenu();
      }}
    >
      {label}
    </button>
  );

  return (
    <>
      <button type="button" aria-label="Close menu" className="fixed inset-0 z-50 cursor-default" onClick={closeMenu} />
      <div className="fixed z-50 w-52 rounded-md border border-line bg-surface py-1" style={{ left, top }}>
        {item("Play next", () => playNext(menu.track))}
        {item("Add to queue", () => enqueue(menu.track))}
        {item(liked ? "Unlike" : "Like", () => toggleLike(menu.track))}
        {menu.track.albumId ? item("Go to album", () => void navigate({ to: "/album/$albumId", params: { albumId: menu.track.albumId } })) : null}
        {menu.track.source !== "Radio" ? item("Go to artist", () => void navigate({ to: "/artist", search: { name: menu.track.artist } })) : null}
        <div className="my-1 border-t border-line" />
        <p className="px-3 py-1 text-xs text-faint">Add to playlist</p>
        {playlists.map((playlist) => (
          <button
            key={playlist.id}
            type="button"
            className="block w-full truncate px-3 py-2 text-left text-sm hover:bg-surface-2"
            onClick={() => {
              addToPlaylist(playlist.id, menu.track);
              closeMenu();
            }}
          >
            {playlist.name}
          </button>
        ))}
        {item("New playlist", () => openDialog(menu.track))}
        {menu.playlistId
          ? item("Remove from playlist", () => removeFromPlaylist(menu.playlistId!, menu.track.id))
          : null}
      </div>
    </>
  );
}

export function PlaylistDialog() {
  const dialog = usePlayer((s) => s.dialog);
  const closeDialog = usePlayer((s) => s.closeDialog);
  const createPlaylist = usePlayer((s) => s.createPlaylist);
  if (!dialog) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-bg/80 px-4">
      <form
        className="w-full max-w-sm rounded-lg border border-line bg-surface p-5"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const name = String(data.get("name") ?? "");
          createPlaylist(name, dialog.track);
          closeDialog();
        }}
      >
        <h2 className="text-xl font-bold tracking-tight">New playlist</h2>
        <input
          name="name"
          autoFocus
          placeholder="Name"
          className="mt-4 w-full border border-line bg-bg px-3 py-3 text-fg outline-none focus:border-copper"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="px-3 py-2 text-muted" onClick={closeDialog}>
            Cancel
          </button>
          <button type="submit" className="rounded-full bg-copper px-4 py-2 text-sm font-semibold text-on-copper active:scale-[0.96]">
            Create
          </button>
        </div>
      </form>
    </div>
  );
}
