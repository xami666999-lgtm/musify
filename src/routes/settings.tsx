import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { autoUpdateEnabled, getDesktop, setAutoUpdateEnabled, type UpdateState } from "@/lib/desktop";
import { usePlayer } from "@/lib/player-store";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

const empty: UpdateState = { status: "idle", version: "", remote: "", percent: 0, message: "" };

function SettingsPage() {
  const theme = usePlayer((s) => s.theme);
  const toggleTheme = usePlayer((s) => s.toggleTheme);
  const autoplay = usePlayer((s) => s.autoplay);
  const toggleAutoplay = usePlayer((s) => s.toggleAutoplay);
  const [auto, setAuto] = useState(true);
  const [update, setUpdate] = useState<UpdateState>(empty);
  const desktop = getDesktop();

  useEffect(() => {
    setAuto(autoUpdateEnabled());
    if (!desktop) return;
    void desktop.state().then(setUpdate);
    return desktop.onUpdate(setUpdate);
  }, [desktop]);

  const status = !desktop
    ? "Updates install in the desktop app."
    : update.status === "checking"
      ? "Checking for an update…"
      : update.status === "downloading"
        ? `Downloading ${update.percent}%`
        : update.status === "ready"
          ? `Version ${update.remote} is ready to install.`
          : update.status === "current"
            ? "You're on the latest version."
            : update.status === "error"
              ? update.message || "The update did not finish."
              : update.status === "dev"
                ? "Updates install in the packaged app."
                : "Musify checks GitHub when it opens.";

  return (
    <div className="page-enter mx-auto max-w-2xl px-4 py-8 md:px-8">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      <p className="mt-3 text-muted">Appearance, playback, and updates.</p>

      <section className="mt-8">
        <h2 className="text-xs font-semibold tracking-wide text-muted">Appearance</h2>
        <Row title="Dark mode" detail={theme === "dark" ? "On" : "Off"}>
          <Toggle on={theme === "dark"} label="Toggle dark mode" onClick={toggleTheme} />
        </Row>
      </section>

      <section className="mt-8">
        <h2 className="text-xs font-semibold tracking-wide text-muted">Playback</h2>
        <Row title="Autoplay" detail="Add similar songs when the queue ends.">
          <Toggle on={autoplay} label="Toggle autoplay" onClick={toggleAutoplay} />
        </Row>
      </section>

      <section className="mt-8">
        <h2 className="text-xs font-semibold tracking-wide text-muted">Updates</h2>
        <Row title="Automatic updates" detail="Look for a new version when Musify opens, then download it.">
          <Toggle
            on={auto}
            label="Toggle automatic updates"
            onClick={() => {
              const next = !auto;
              setAuto(next);
              setAutoUpdateEnabled(next);
            }}
          />
        </Row>
        <div className="border-b border-line py-4">
          <p className="text-sm font-medium">Version {update.version || "1.1.0"}</p>
          <p className="mt-1 text-sm text-muted">{status}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!desktop || update.status === "checking" || update.status === "downloading"}
              onClick={() => desktop && void desktop.check().then(setUpdate)}
              className="min-h-11 rounded-full bg-copper px-4 text-sm font-semibold text-on-copper disabled:opacity-40"
            >
              Check for updates
            </button>
            {update.status === "ready" ? (
              <button type="button" onClick={() => void desktop?.install()} className="min-h-11 rounded-full border border-line px-4 text-sm font-semibold">
                Install and restart
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function Row({ title, detail, children }: { title: string; detail: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted">{detail}</p>
      </div>
      {children}
    </div>
  );
}

function Toggle({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" aria-pressed={on} aria-label={label} onClick={onClick} className={`ml-3 h-7 w-12 shrink-0 rounded-full p-1 ${on ? "bg-copper" : "bg-surface-2"}`}>
      <span className={`block size-5 rounded-full bg-white transition-transform ${on ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}
