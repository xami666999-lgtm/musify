import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { TrackList } from "@/components/tracks";
import { getFreeTracks } from "@/lib/free";

export const Route = createFileRoute("/free")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
  }),
  component: FreePage,
});

function FreePage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [text, setText] = useState(search.q);

  useEffect(() => {
    setText(search.q);
  }, [search.q]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (text !== search.q) void navigate({ search: { q: text }, replace: true });
    }, 280);
    return () => window.clearTimeout(handle);
  }, [text, search.q, navigate]);

  const tracks = useQuery({
    queryKey: ["free", search.q],
    queryFn: () => getFreeTracks({ data: { q: search.q } }),
    staleTime: 60_000,
  });

  return (
    <div className="page-enter px-4 py-6 md:px-8">
      <h1 className="text-3xl font-bold tracking-tight">Royalty-free</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">Creative Commons songs from ccMixter. They stream in the player. Nothing is saved to your computer.</p>
      <label htmlFor="free-search" className="sr-only">
        Search royalty-free songs
      </label>
      <input
        id="free-search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Search songs"
        className="mt-4 w-full max-w-md bg-surface-2 px-5 py-3 text-sm outline-none placeholder:text-muted"
      />
      {tracks.isLoading ? <p className="mt-6 text-muted">Loading songs…</p> : null}
      {tracks.isError ? <p className="mt-6 text-muted">That catalog did not answer. Try again in a moment.</p> : null}
      {tracks.data ? <div className="mt-4"><TrackList tracks={tracks.data} /></div> : null}
    </div>
  );
}
