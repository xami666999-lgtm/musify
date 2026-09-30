import { createFileRoute } from "@tanstack/react-router";
import { getGenre } from "@/lib/catalog";
import { usePlayer } from "@/lib/player-store";
import { AlbumTile, ReleaseHeader } from "@/components/shelves";
import { TrackList } from "@/components/tracks";

export const Route = createFileRoute("/genre/$genreId")({
  loader: ({ params }) => getGenre({ data: { id: params.genreId } }),
  component: GenrePage,
  pendingComponent: () => <p className="px-4 py-8 text-muted">Loading genre…</p>,
});

function GenrePage() {
  const { genre, albums, tracks } = Route.useLoaderData();
  const playTracks = usePlayer((s) => s.playTracks);
  return (
    <div className="page-enter">
      <ReleaseHeader
        eyebrow="Genre"
        title={genre.label}
        meta="Deezer"
        onPlay={tracks.length ? () => playTracks(tracks, 0) : undefined}
      />
      <div className="px-4 py-6 md:px-8">
        <h2 className="mb-3 text-xl font-bold tracking-tight">Albums</h2>
        <div className="mb-8 flex gap-3 overflow-x-auto pb-2">
          {albums.map((album) => (
            <AlbumTile key={album.id} album={album} />
          ))}
        </div>
        <h2 className="mb-3 text-xl font-bold tracking-tight">Popular songs</h2>
        {tracks.length === 0 ? <p className="text-muted">No songs in this chart.</p> : <TrackList tracks={tracks} />}
      </div>
    </div>
  );
}
