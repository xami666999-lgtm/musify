export type YtTrack = {
  id: string;
  title: string;
  artist: string;
  art: string;
  duration: number;
  videoId: string;
};

const PIPED = [
  "https://pipedapi.kavin.rocks",
  "https://pipedapi.adminforge.de",
  "https://api.piped.private.coffee",
];

const AD_HOSTS = [
  "doubleclick.net",
  "googlesyndication.com",
  "googleadservices.com",
  "pagead2.googlesyndication.com",
  "ads.youtube.com",
  "adservice.google.com",
  "youtube.com/pagead",
  "youtube.com/api/stats/ads",
  "youtube.com/ptracking",
];

const KEY = "mxsify-yt";

export function adBlocked(url: string) {
  const u = url.toLowerCase();
  return AD_HOSTS.some((host) => u.includes(host));
}

export function readYtUser(): { name: string; signedIn: boolean } {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "{}");
    return { name: String(raw.name || ""), signedIn: Boolean(raw.signedIn) };
  } catch {
    return { name: "", signedIn: false };
  }
}

export function signInYt(name: string) {
  localStorage.setItem(KEY, JSON.stringify({ name: name || "YouTube", signedIn: true, at: Date.now() }));
  localStorage.setItem("mxsify-login", JSON.stringify({ name: name || "YouTube", email: "youtube", signedIn: true, at: Date.now() }));
}

export function signOutYt() {
  localStorage.removeItem(KEY);
  localStorage.removeItem("mxsify-login");
}

export function openYouTubeLogin() {
  const popup = window.open(
    "https://accounts.google.com/ServiceLogin?service=youtube&passive=true&continue=https%3A%2F%2Fwww.youtube.com%2F",
    "mxsify-yt",
    "width=480,height=720",
  );
  if (!popup) return;
  const started = Date.now();
  const timer = window.setInterval(() => {
    if (popup.closed || Date.now() - started > 2500) {
      window.clearInterval(timer);
      signInYt("YouTube");
      popup.close();
    }
  }, 400);
}

async function piped(path: string) {
  let last = "YouTube did not answer";
  for (const base of PIPED) {
    try {
      const res = await fetch(base + path, { signal: AbortSignal.timeout(12000) });
      if (!res.ok) {
        last = `YouTube ${res.status}`;
        continue;
      }
      return await res.json();
    } catch (err) {
      last = err instanceof Error ? err.message : last;
    }
  }
  throw new Error(last);
}

export async function searchYouTube(q: string): Promise<YtTrack[]> {
  const query = q.trim().slice(0, 80);
  if (!query) return [];
  const data = await piped(`/search?q=${encodeURIComponent(query)}&filter=music_songs`);
  const items = Array.isArray(data) ? data : data.items || data.results || [];
  return items
    .filter((row: { url?: string; type?: string }) => row && (row.type === "stream" || String(row.url || "").includes("watch")))
    .slice(0, 24)
    .map((row: { url?: string; title?: string; uploaderName?: string; thumbnail?: string; duration?: number }) => {
      const videoId = String(row.url || "").split("v=")[1]?.slice(0, 11) || "";
      return {
        id: `yt:${videoId}`,
        videoId,
        title: row.title || "Untitled",
        artist: row.uploaderName || "YouTube",
        art: row.thumbnail || "",
        duration: Number(row.duration) || 0,
      };
    })
    .filter((row: YtTrack) => row.videoId.length === 11);
}

export async function youtubeAudio(videoId: string): Promise<string> {
  const data = await piped(`/streams/${videoId}`);
  const streams = [...(data.audioStreams || []), ...(data.videoStreams || [])] as { url?: string; mimeType?: string; bitrate?: number }[];
  const clean = streams
    .filter((row) => row.url && !adBlocked(row.url))
    .filter((row) => String(row.mimeType || "").includes("audio") || String(row.url).includes("mime=audio"))
    .sort((a, b) => Number(b.bitrate || 0) - Number(a.bitrate || 0));
  const pick = clean[0] || streams.find((row) => row.url && !adBlocked(row.url));
  if (!pick?.url) throw new Error("No clean audio stream");
  return pick.url;
}

export async function sponsorSkips(videoId: string): Promise<{ start: number; end: number }[]> {
  try {
    const res = await fetch(
      `https://sponsor.ajay.app/api/skipSegments?videoID=${videoId}&categories=["sponsor","selfpromo","intro","outro","music_offtopic"]`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return [];
    const rows = await res.json();
    return (Array.isArray(rows) ? rows : [])
      .map((row: { segment?: number[] }) => ({ start: Number(row.segment?.[0] || 0), end: Number(row.segment?.[1] || 0) }))
      .filter((row) => row.end > row.start);
  } catch {
    return [];
  }
}
