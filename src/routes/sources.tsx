import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/sources")({
  component: SourcesPage,
});

function SourcesPage() {
  return (
    <div className="page-enter mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="text-3xl font-bold tracking-tight">Sources</h1>
      <p className="mt-3 text-muted">Search, albums, artists, and charts come from Deezer. Press play and the 30-second preview streams here.</p>
      <article className="mt-8 rounded-md border border-line bg-surface p-5">
        <p className="text-xs font-semibold tracking-wide text-copper">Connected</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight">Deezer</h2>
        <p className="mt-2 text-pretty text-muted">
          The catalog is Deezer. Full tracks stay on Deezer. Musify plays the preview.
        </p>
        <Link to="/search" search={{ q: "", tab: "all" }} className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-copper">
          Search the catalog
        </Link>
      </article>
    </div>
  );
}
