import { createFileRoute } from "@tanstack/react-router";
import { getArtist } from "@/lib/catalog";
import { usePlayer } from "@/lib/player-store";
import { AlbumTile, ReleaseHeader } from "@/components/shelves";
import { TrackList } from "@/components/tracks";

export const Route = createFileRoute("/artist")({
  validateSearch: (search: Record<string, unknown>) => ({
    name: typeof search.name === "string" ? search.name : "",
  }),
  loaderDeps: ({ search }) => ({ name: search.name }),
  loader: ({ deps }) => getArtist({ data: { name: deps.name } }),
  component: ArtistPage,
  pendingComponent: () => <p className="px-4 py-8 text-muted">Loading artist…</p>,
});

function ArtistPage() {
  const { name, albums, tracks } = Route.useLoaderData();
  const playTracks = usePlayer((s) => s.playTracks);
  return (
    <div className="page-enter">
      <ReleaseHeader
        eyebrow="Artist"
        title={name || "Unknown artist"}
        meta={`${albums.length} albums`}
        onPlay={tracks.length ? () => playTracks(tracks, 0) : undefined}
      />
      <div className="px-4 py-6 md:px-8">
        <h2 className="mb-3 text-xl font-bold tracking-tight">Albums</h2>
        {albums.length === 0 ? <p className="text-muted">No albums under that name.</p> : null}
        <div className="mb-8 flex gap-3 overflow-x-auto pb-2">
          {albums.map((album) => (
            <AlbumTile key={album.id} album={album} />
          ))}
        </div>
        <h2 className="mb-3 text-xl font-bold tracking-tight">Popular songs</h2>
        {tracks.length === 0 ? <p className="text-muted">No songs for this artist.</p> : <TrackList tracks={tracks} />}
      </div>
    </div>
  );
}
