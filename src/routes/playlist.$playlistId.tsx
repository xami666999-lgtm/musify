import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useHydrated, usePlayer } from "@/lib/player-store";
import { ReleaseHeader } from "@/components/shelves";
import { TrackList } from "@/components/tracks";

export const Route = createFileRoute("/playlist/$playlistId")({
  component: PlaylistPage,
});

function PlaylistPage() {
  const { playlistId } = Route.useParams();
  const hydrated = useHydrated();
  const playlist = usePlayer((s) => s.playlists.find((item) => item.id === playlistId));
  const playTracks = usePlayer((s) => s.playTracks);
  const deletePlaylist = usePlayer((s) => s.deletePlaylist);
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);

  if (!hydrated) return <p className="px-4 py-8 text-muted">Loading playlist…</p>;
  if (!playlist) return <p className="px-4 py-8 text-muted">That playlist is gone.</p>;

  return (
    <div className="page-enter">
      <ReleaseHeader
        eyebrow="Playlist"
        title={playlist.name}
        meta={`${playlist.tracks.length} songs`}
        art={playlist.tracks[0]?.art}
        onPlay={playlist.tracks.length ? () => playTracks(playlist.tracks, 0) : undefined}
      >
        <button
          type="button"
          className="mt-4 block text-sm text-muted"
          onClick={() => {
            if (!confirm) {
              setConfirm(true);
              return;
            }
            deletePlaylist(playlist.id);
            void navigate({ to: "/library", search: { tab: "playlists" } });
          }}
        >
          {confirm ? "Confirm delete" : "Delete playlist"}
        </button>
      </ReleaseHeader>
      <div className="px-4 py-4 md:px-8">
        {playlist.tracks.length === 0 ? (
          <p className="text-muted">No songs yet. Drag a song onto this playlist in the sidebar, or use the song menu.</p>
        ) : (
          <TrackList tracks={playlist.tracks} playlistId={playlist.id} />
        )}
      </div>
    </div>
  );
}
