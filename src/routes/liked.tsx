import { createFileRoute } from "@tanstack/react-router";
import { useHydrated, usePlayer } from "@/lib/player-store";
import { ReleaseHeader } from "@/components/shelves";
import { TrackList } from "@/components/tracks";

export const Route = createFileRoute("/liked")({
  component: LikedPage,
});

function LikedPage() {
  const hydrated = useHydrated();
  const liked = usePlayer((s) => s.liked);
  const playTracks = usePlayer((s) => s.playTracks);
  return (
    <div className="page-enter">
      <ReleaseHeader
        eyebrow="Playlist"
        title="Liked songs"
        meta={hydrated ? `${liked.length} songs · Archive` : "Archive"}
        onPlay={liked.length ? () => playTracks(liked, 0) : undefined}
      />
      <div className="px-4 py-4 md:px-8">{hydrated ? <TrackList tracks={liked} /> : null}</div>
    </div>
  );
}
