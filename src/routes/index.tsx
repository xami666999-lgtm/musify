import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getCharts, getShelves } from "@/lib/catalog";
import { useHydrated, usePlayer } from "@/lib/player-store";
import { AlbumTile, Shelf } from "@/components/shelves";
import { TrackList } from "@/components/tracks";

export const Route = createFileRoute("/")({
  loader: () => getShelves(),
  component: Home,
  pendingComponent: () => <p className="px-4 py-8 text-muted md:px-8">Opening the catalog…</p>,
  errorComponent: () => <HomeFallback />,
});

function Home() {
  const shelves = Route.useLoaderData();
  return <HomeBody shelves={shelves} />;
}

function HomeFallback() {
  return <HomeBody shelves={{ fresh: [], made: [], genres: [] }} failed />;
}

function HomeBody({
  shelves,
  failed = false,
}: {
  shelves: Awaited<ReturnType<typeof getShelves>>;
  failed?: boolean;
}) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const hydrated = useHydrated();
  const recent = usePlayer((s) => s.recentAlbums);
  const charts = useQuery({ queryKey: ["charts"], queryFn: () => getCharts(), staleTime: 60_000 });

  return (
    <div className="page-enter px-4 py-6 md:px-8">
      <form
        className="mb-10 max-w-2xl"
        onSubmit={(event) => {
          event.preventDefault();
          void navigate({ to: "/search", search: { q, tab: "all" } });
        }}
      >
        <label htmlFor="home-search" className="sr-only">
          Search
        </label>
        <input
          id="home-search"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="What do you want to listen to?"
          className="w-full max-w-md bg-surface-2 px-5 py-3 text-sm text-fg outline-none placeholder:text-muted focus:bg-surface"
        />
      </form>

      {failed ? <p className="mb-8 text-muted">The catalog did not answer. Search again in a moment.</p> : null}

      {hydrated && recent.length > 0 ? (
        <Shelf title="Continue listening">
          {recent.map((album) => (
            <AlbumTile key={album.id} album={album} />
          ))}
        </Shelf>
      ) : null}

      <h2 className="mb-4 text-2xl font-bold tracking-tight">Made for you</h2>
      {shelves.made.map((row) => (
        <Shelf key={row.id} title={row.title}>
          {row.albums.map((album) => (
            <AlbumTile key={album.id} album={album} />
          ))}
        </Shelf>
      ))}

      <Shelf title="Popular albums">
        {shelves.fresh.map((album) => (
          <AlbumTile key={album.id} album={album} />
        ))}
      </Shelf>

      <section className="mb-10">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Charts</h2>
          <Link to="/charts" className="text-sm text-copper">
            All charts
          </Link>
        </div>
        {charts.isLoading ? <p className="text-muted">Ranking songs…</p> : null}
        {charts.data ? <TrackList tracks={charts.data.slice(0, 6)} /> : null}
      </section>

      <Shelf title="Genres">
        {shelves.genres.map((genre) => (
          <Link
            key={genre.id}
            to="/genre/$genreId"
            params={{ genreId: genre.id }}
            className="grid aspect-square w-36 shrink-0 place-items-end rounded-md bg-surface-2 p-3 sm:w-44"
          >
            <span className="text-lg font-bold tracking-tight text-fg">{genre.label}</span>
          </Link>
        ))}
      </Shelf>
    </div>
  );
}
