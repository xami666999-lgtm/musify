import { createFileRoute } from "@tanstack/react-router";
import { getAlbum } from "@/lib/catalog";
import { usePlayer } from "@/lib/player-store";
import { ReleaseHeader } from "@/components/shelves";
import { TrackList } from "@/components/tracks";

export const Route = createFileRoute("/album/$albumId")({
  loader: ({ params }) => getAlbum({ data: { id: params.albumId } }),
  component: AlbumPage,
  pendingComponent: () => (
    <div className="bg-surface px-4 py-8 md:px-8">
      <div className="size-56 bg-surface-2" />
    </div>
  ),
});

function AlbumPage() {
  const { album, tracks } = Route.useLoaderData();
  const playTracks = usePlayer((s) => s.playTracks);
  const meta = [album.artist, album.year, album.source].filter(Boolean).join(" · ");
  return (
    <div className="page-enter">
      <ReleaseHeader
        eyebrow="Album"
        title={album.title}
        meta={meta}
        art={album.art}
        onPlay={tracks.length ? () => playTracks(tracks, 0, album) : undefined}
      />
      <div className="px-4 py-4 md:px-8">
        <TrackList tracks={tracks} album={album} />
      </div>
    </div>
  );
}
