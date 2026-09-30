import { createFileRoute, Link } from "@tanstack/react-router";
import { getShelves } from "@/lib/catalog";
import { AlbumTile } from "@/components/shelves";

export const Route = createFileRoute("/browse")({
  loader: () => getShelves(),
  component: BrowsePage,
  pendingComponent: () => <p className="px-4 py-8 text-muted">Loading artists and albums…</p>,
});

function BrowsePage() {
  const shelves = Route.useLoaderData();
  const albums = shelves.made[0]?.albums ?? shelves.fresh;
  const artists: string[] = [];
  for (const album of albums) {
    if (!artists.includes(album.artist)) artists.push(album.artist);
  }
  return (
    <div className="page-enter px-4 py-6 md:px-8">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">Artists and albums</h1>
      <h2 className="mb-3 text-xl font-bold tracking-tight">Artists</h2>
      <div className="mb-8 flex flex-col">
        {artists.map((name) => (
          <Link key={name} to="/artist" search={{ name }} className="min-h-11 border-b border-line py-3 text-base font-medium">
            {name}
          </Link>
        ))}
      </div>
      <h2 className="mb-3 text-xl font-bold tracking-tight">Albums</h2>
      <div className="flex flex-wrap gap-3">
        {albums.map((album) => (
          <AlbumTile key={album.id} album={album} />
        ))}
      </div>
    </div>
  );
}
