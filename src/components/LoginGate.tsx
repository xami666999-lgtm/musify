import { useEffect, useState } from "react";
import { openYouTubeLogin, readYtUser, signInYt, signOutYt } from "@/lib/youtube";

const KEY = "mxsify-login";

type Saved = { email: string; name: string; at: number };

function readSaved(): Saved | null {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!raw?.email) return null;
    return raw;
  } catch {
    return null;
  }
}

export function LoginGate({ children }: { children: React.ReactNode }) {
  const [saved, setSaved] = useState<Saved | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    const row = readSaved();
    setSaved(row);
    setReady(true);
  }, []);

  if (!ready) return null;
  if (saved) return children;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-bg px-4">
      <form
        className="w-full max-w-md rounded-md border border-line bg-surface p-6"
        onSubmit={(event) => {
          event.preventDefault();
          const clean = email.trim().toLowerCase();
          if (!clean.includes("@")) return;
          const row = { email: clean, name: name.trim() || clean.split("@")[0], at: Date.now() };
          localStorage.setItem(KEY, JSON.stringify(row));
          signInYt(row.name);
          setSaved(row);
        }}
      >
        <p className="text-xs font-semibold tracking-wide text-copper">Mxsify</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-muted">Open Google, sign in, then save that account. Next time the app opens straight in.</p>
        <button
          type="button"
          className="mt-5 min-h-11 w-full rounded-full bg-fg text-sm font-semibold text-bg"
          onClick={() => {
            openYouTubeLogin();
            setOpened(true);
          }}
        >
          Continue with Google
        </button>
        {opened ? <p className="mt-3 text-xs text-muted">Google window opened. Save the account you used.</p> : null}
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" className="mt-4 w-full bg-surface-2 px-3 py-3 text-sm outline-none" />
        <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required placeholder="Google email" className="mt-2 w-full bg-surface-2 px-3 py-3 text-sm outline-none" />
        <button type="submit" className="mt-3 min-h-11 w-full rounded-full bg-copper text-sm font-semibold text-on-copper">Save login</button>
      </form>
    </div>
  );
}

export function savedLogin() {
  return readSaved();
}

export function clearLogin() {
  localStorage.removeItem(KEY);
  signOutYt();
}

export function loginLabel() {
  return readSaved()?.name || readYtUser().name || "";
}
