import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { searchCatalog, searchSongs } from "@/lib/catalog";
import { usePlayer } from "@/lib/player-store";
import { AlbumTile } from "@/components/shelves";
import { TrackList } from "@/components/tracks";

const TABS = ["all", "songs", "albums", "artists", "playlists"] as const;
type Tab = (typeof TABS)[number];

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
    tab: TABS.includes(search.tab as Tab) ? (search.tab as Tab) : "all",
  }),
  component: SearchPage,
});

function SearchPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [text, setText] = useState(search.q);
  const playlists = usePlayer((s) => s.playlists);

  useEffect(() => {
    setText(search.q);
  }, [search.q]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (text !== search.q) void navigate({ search: { q: text, tab: search.tab }, replace: true });
    }, 280);
    return () => window.clearTimeout(handle);
  }, [text, search.q, search.tab, navigate]);

  const catalog = useQuery({
    queryKey: ["search", search.q],
    queryFn: () => searchCatalog({ data: { q: search.q } }),
    enabled: search.q.trim().length > 0,
  });
  const songs = useQuery({
    queryKey: ["songs", search.q],
    queryFn: () => searchSongs({ data: { q: search.q } }),
    enabled: search.q.trim().length > 1 && (search.tab === "all" || search.tab === "songs"),
  });

  const local = playlists.filter((playlist) => playlist.name.toLowerCase().includes(search.q.trim().toLowerCase()));
  const show = (tab: Tab) => search.tab === "all" || search.tab === tab;

  return (
    <div className="page-enter px-4 py-6 md:px-8">
      <h1 className="text-3xl font-bold tracking-tight">Search</h1>
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Songs, albums, artists"
        className="mt-4 w-full max-w-md bg-surface-2 px-5 py-3 text-sm outline-none placeholder:text-muted"
      />
      <div className="mt-4 flex gap-2 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => void navigate({ search: { q: text, tab } })}
            className={
              search.tab === tab
                ? "min-h-9 shrink-0 rounded-full bg-fg px-4 text-sm font-medium text-bg capitalize"
                : "min-h-9 shrink-0 rounded-full bg-surface-2 px-4 text-sm font-medium text-muted capitalize"
            }
          >
            {tab}
          </button>
        ))}
      </div>

      {!search.q.trim() ? <p className="mt-8 text-muted">Type to search. Songs play here as previews.</p> : null}

      {show("songs") && search.q.trim() ? (
        <section className="mt-8">
          <h2 className="mb-3 text-xl font-bold tracking-tight">Songs</h2>
          {songs.isLoading ? <p className="text-muted">Finding songs…</p> : null}
          {songs.data ? <TrackList tracks={songs.data} /> : null}
          {songs.data && songs.data.length === 0 && !songs.isLoading ? <p className="text-muted">No songs.</p> : null}
        </section>
      ) : null}

      {show("albums") && catalog.data ? (
        <section className="mt-8">
          <h2 className="mb-3 text-xl font-bold tracking-tight">Albums</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {catalog.data.albums.map((album) => (
              <AlbumTile key={album.id} album={album} />
            ))}
          </div>
          {catalog.data.albums.length === 0 ? <p className="text-muted">No albums.</p> : null}
        </section>
      ) : null}

      {show("artists") && catalog.data ? (
        <section className="mt-8">
          <h2 className="mb-3 text-xl font-bold tracking-tight">Artists</h2>
          <div className="flex flex-col">
            {catalog.data.artists.map((name) => (
              <Link key={name} to="/artist" search={{ name }} className="min-h-11 border-b border-line py-3 text-base font-medium">
                {name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {show("playlists") ? (
        <section className="mt-8">
          <h2 className="mb-3 text-xl font-bold tracking-tight">Playlists</h2>
          {local.length === 0 ? <p className="text-muted">No matching playlists.</p> : null}
          {local.map((playlist) => (
            <Link key={playlist.id} to="/playlist/$playlistId" params={{ playlistId: playlist.id }} className="block min-h-11 border-b border-line py-3">
              {playlist.name}
            </Link>
          ))}
        </section>
      ) : null}
    </div>
  );
}
