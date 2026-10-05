import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { openYouTubeLogin, readYtUser, signInYt, signOutYt } from "@/lib/youtube";

export const Route = createFileRoute("/sources")({
  component: SourcesPage,
});

function SourcesPage() {
  const [yt, setYt] = useState(() => (typeof window === "undefined" ? { name: "", signedIn: false } : readYtUser()));
  const [name, setName] = useState(yt.name);

  return (
    <div className="page-enter mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="text-3xl font-bold tracking-tight">Sources</h1>
      <p className="mt-3 text-muted">YouTube is the music source. Ads and sponsor segments are blocked in the player. Deezer still supplies 30-second previews.</p>
      <article className="mt-8 rounded-md border border-line bg-surface p-5">
        <p className="text-xs font-semibold tracking-wide text-copper">{yt.signedIn ? "Signed in" : "Not signed in"}</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight">YouTube</h2>
        <p className="mt-2 text-pretty text-muted">Sign in with your YouTube account, then search. Playback uses audio-only streams and skips ad hosts plus sponsor segments.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className="min-h-11 rounded-full bg-fg px-4 text-sm font-semibold text-bg" onClick={() => openYouTubeLogin()}>
            Open YouTube login
          </button>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Account name" className="min-h-11 bg-surface-2 px-3 text-sm outline-none" />
          <button type="button" className="min-h-11 rounded-full bg-copper px-4 text-sm font-semibold text-on-copper" onClick={() => { signInYt(name || "YouTube"); setYt(readYtUser()); }}>
            Save sign-in
          </button>
          {yt.signedIn ? (
            <button type="button" className="min-h-11 px-3 text-sm text-muted" onClick={() => { signOutYt(); setYt(readYtUser()); }}>
              Sign out
            </button>
          ) : null}
        </div>
        <Link to="/search" search={{ q: "", tab: "songs" }} className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-copper">
          Search songs
        </Link>
      </article>
    </div>
  );
}
