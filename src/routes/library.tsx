import { createFileRoute, Link } from "@tanstack/react-router";
import { useHydrated, usePlayer } from "@/lib/player-store";
import type { AlbumCard } from "@/lib/types";
import { AlbumTile } from "@/components/shelves";
import { TrackList } from "@/components/tracks";

const TABS = ["playlists", "albums", "artists", "songs"] as const;
type Tab = (typeof TABS)[number];

export const Route = createFileRoute("/library")({
  validateSearch: (search: Record<string, unknown>): { tab: Tab } => ({
    tab: TABS.includes(search.tab as Tab) ? (search.tab as Tab) : "playlists",
  }),
  component: LibraryPage,
});

function LibraryPage() {
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const hydrated = useHydrated();
  const playlists = usePlayer((s) => s.playlists);
  const liked = usePlayer((s) => s.liked);
  const openDialog = usePlayer((s) => s.openDialog);
  const saved = [...liked, ...playlists.flatMap((playlist) => playlist.tracks)];
  const songs = saved.filter((track, index) => saved.findIndex((item) => item.id === track.id) === index);
  const albums: AlbumCard[] = [];
  for (const track of songs) {
    if (!track.albumId || albums.some((album) => album.id === track.albumId)) continue;
    albums.push({ id: track.albumId, title: track.album, artist: track.artist, year: "", art: track.art, source: track.source === "Deezer" ? "Deezer" : "Archive" });
  }
  const artists = [...new Set(songs.map((track) => track.artist))];

  return (
    <div className="page-enter px-4 py-6 md:px-8">
      <div className="mb-6 flex items-end justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Library</h1>
        <button type="button" onClick={() => openDialog()} className="min-h-11 rounded-full bg-copper px-4 text-sm font-semibold text-on-copper">
          New playlist
        </button>
      </div>
      <div className="mb-6 flex gap-2 overflow-x-auto">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => void navigate({ search: { tab: item } })}
            className={item === tab ? "min-h-9 shrink-0 rounded-full bg-fg px-4 text-sm font-medium capitalize text-bg" : "min-h-9 shrink-0 rounded-full bg-surface-2 px-4 text-sm font-medium capitalize text-muted"}
          >
            {item}
          </button>
        ))}
      </div>
      {!hydrated ? <p className="text-muted">Loading your library…</p> : null}
      {hydrated && tab === "playlists" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link to="/liked" className="grid aspect-square place-items-end rounded-md bg-copper p-4">
            <span className="text-2xl font-bold tracking-tight text-on-copper">Liked songs</span>
          </Link>
          {playlists.map((playlist) => (
            <Link key={playlist.id} to="/playlist/$playlistId" params={{ playlistId: playlist.id }} className="grid aspect-square place-items-end rounded-md bg-surface-2 p-4">
              <span className="text-2xl font-bold tracking-tight">{playlist.name}</span>
            </Link>
          ))}
        </div>
      ) : null}
      {hydrated && tab === "albums" ? (
        albums.length ? (
          <div className="flex flex-wrap gap-3">
            {albums.map((album) => (
              <AlbumTile key={album.id} album={album} />
            ))}
          </div>
        ) : (
          <Empty />
        )
      ) : null}
      {hydrated && tab === "artists" ? (
        artists.length ? (
          artists.map((name) => (
            <Link key={name} to="/artist" search={{ name }} className="block min-h-11 border-b border-line py-3 text-base font-medium">
              {name}
            </Link>
          ))
        ) : (
          <Empty />
        )
      ) : null}
      {hydrated && tab === "songs" ? songs.length ? <TrackList tracks={songs} /> : <Empty /> : null}
    </div>
  );
}

function Empty() {
  return (
    <p className="text-muted">
      Nothing saved yet.{" "}
      <Link to="/search" search={{ q: "", tab: "all" }} className="text-copper">
        Search
      </Link>{" "}
      and like a song, or add it to a playlist.
    </p>
  );
}
