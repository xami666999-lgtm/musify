import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/sources")({
  component: SourcesPage,
});

function SourcesPage() {
  return (
    <div className="page-enter mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="text-3xl font-bold tracking-tight">Sources</h1>
      <p className="mt-3 text-muted">Musify plays in the app. A song or station starts when you click it. Nothing is downloaded or installed.</p>
      <article className="mt-8 rounded-md border border-line bg-surface p-5">
        <p className="text-xs font-semibold tracking-wide text-copper">Connected</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight">Deezer</h2>
        <p className="mt-2 text-pretty text-muted">
          Search, albums, artists, and charts come from Deezer’s public catalog. Press play and the 30-second preview streams in Musify. Full tracks stay on Deezer.
        </p>
        <Link to="/search" search={{ q: "", tab: "all" }} className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-copper">
          Search the catalog
        </Link>
      </article>
      <article className="mt-4 rounded-md border border-line bg-surface p-5">
        <p className="text-xs font-semibold tracking-wide text-copper">Connected</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight">Live radio</h2>
        <p className="mt-2 text-pretty text-muted">Public stations from the Radio Browser directory. Jazz, classical, news, and the rest. The stream plays in the bar.</p>
        <Link to="/radio" search={{ q: "", tag: "Jazz" }} className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-copper">
          Open radio
        </Link>
      </article>
      <article className="mt-4 rounded-md border border-line bg-surface p-5">
        <p className="text-xs font-semibold tracking-wide text-copper">Connected</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight">ccMixter</h2>
        <p className="mt-2 text-pretty text-muted">Royalty-free songs under Creative Commons. Search them and they play like any other track.</p>
        <Link to="/free" search={{ q: "" }} className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-copper">
          Browse royalty-free
        </Link>
      </article>
      <article className="mt-4 rounded-md border border-line p-5">
        <p className="text-xs font-semibold tracking-wide text-faint">Not connected</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight">Store and YouTube clients</h2>
        <p className="mt-2 text-pretty text-muted">
          Lucida, Monochrome, Octave, Limusic, and the Spotify, Deezer, Tidal, and YouTube downloaders on that list only pull files from other people’s catalogs. Musify does not connect to them.
        </p>
      </article>
    </div>
  );
}
