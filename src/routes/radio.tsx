import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { Cover } from "@/components/shelves";
import { cn } from "@/lib/cn";
import { usePlayer } from "@/lib/player-store";
import { getStations, RADIO_TAGS } from "@/lib/radio";

export const Route = createFileRoute("/radio")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
    tag: typeof search.tag === "string" ? search.tag : "Jazz",
  }),
  component: RadioPage,
});

function RadioPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [text, setText] = useState(search.q);
  const playTracks = usePlayer((s) => s.playTracks);
  const currentId = usePlayer((s) => s.queue[s.index]?.id);
  const playing = usePlayer((s) => s.playing);

  useEffect(() => {
    setText(search.q);
  }, [search.q]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if (text !== search.q) void navigate({ search: { q: text, tag: text ? "" : search.tag || "Jazz" }, replace: true });
    }, 280);
    return () => window.clearTimeout(handle);
  }, [text, search.q, search.tag, navigate]);

  const stations = useQuery({
    queryKey: ["radio", search.q, search.tag],
    queryFn: () => getStations({ data: { q: search.q, tag: search.q ? "" : search.tag } }),
    staleTime: 60_000,
  });

  return (
    <div className="page-enter px-4 py-6 md:px-8">
      <h1 className="text-3xl font-bold tracking-tight">Radio</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">Live stations from the public radio directory. Press one and it plays here.</p>
      <label htmlFor="radio-search" className="sr-only">
        Search stations
      </label>
      <input
        id="radio-search"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Search stations"
        className="mt-4 w-full max-w-md bg-surface-2 px-5 py-3 text-sm outline-none placeholder:text-muted"
      />
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
        {RADIO_TAGS.map((tag) => {
          const on = !search.q && search.tag.toLowerCase() === tag.toLowerCase();
          return (
            <button
              key={tag}
              type="button"
              onClick={() => {
                setText("");
                void navigate({ search: { q: "", tag } });
              }}
              className={cn(
                "min-h-11 shrink-0 rounded-full px-4 text-sm font-medium",
                on ? "bg-fg text-bg" : "bg-surface-2 text-muted",
              )}
            >
              {tag}
            </button>
          );
        })}
      </div>
      {stations.isLoading ? <p className="mt-6 text-muted">Finding stations…</p> : null}
      {stations.isError ? <p className="mt-6 text-muted">The radio directory did not answer. Try again in a moment.</p> : null}
      <ul className="mt-4 divide-y divide-line">
        {stations.data?.map((station, index) => {
          const current = station.id === currentId;
          return (
            <li key={station.id}>
              <button
                type="button"
                onClick={() => playTracks(stations.data ?? [], index)}
                className={cn("flex min-h-14 w-full items-center gap-3 py-2 text-left hover:bg-surface", current && "bg-surface")}
              >
                <span className="size-12 shrink-0 overflow-hidden rounded-md">
                  <Cover art={station.art} title={station.title} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate text-sm font-medium", current && "text-copper")}>{station.title}</span>
                  <span className="block truncate text-xs text-muted">{station.artist}</span>
                </span>
                {current && playing ? <span className="text-xs font-semibold tracking-wide text-copper">LIVE</span> : <Play className="size-4 shrink-0 fill-current text-muted" />}
              </button>
            </li>
          );
        })}
      </ul>
      {stations.data && stations.data.length === 0 ? <p className="mt-6 text-muted">No stations matched.</p> : null}
    </div>
  );
}
