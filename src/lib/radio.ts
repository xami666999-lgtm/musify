import { createServerFn } from "@tanstack/react-start";
import type { Track } from "@/lib/types";

const HOSTS = ["https://de1.api.radio-browser.info", "https://de2.api.radio-browser.info"];
const CODECS = new Set(["MP3", "AAC", "AAC+", "OGG", "OPUS"]);

type Station = {
  stationuuid?: string;
  name?: string;
  url_resolved?: string;
  favicon?: string;
  tags?: string;
  country?: string;
  codec?: string;
};

export const RADIO_TAGS = ["Jazz", "Classical", "Ambient", "Electronic", "Rock", "News", "Soul", "Chill"] as const;

async function radioFetch(path: string): Promise<Station[]> {
  let reason = "Radio directory did not answer";
  for (const host of HOSTS) {
    try {
      const response = await fetch(`${host}${path}`, {
        headers: { "User-Agent": "Musify/1.0" },
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) {
        reason = `Radio directory returned ${response.status}`;
        continue;
      }
      const data = (await response.json()) as Station[];
      return Array.isArray(data) ? data : [];
    } catch (error) {
      reason = error instanceof Error ? error.message : reason;
    }
  }
  throw new Error(reason);
}

function stationTrack(station: Station): Track | null {
  const url = station.url_resolved ?? "";
  const id = station.stationuuid ?? "";
  if (!id || !url.startsWith("http")) return null;
  if (station.codec && !CODECS.has(station.codec)) return null;
  const tags = (station.tags ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(" · ");
  const art = station.favicon?.startsWith("https://") ? station.favicon : "";
  return {
    id: `radio:${id}`,
    title: (station.name ?? "Station").trim() || "Station",
    artist: [station.country, tags].filter(Boolean).join(" · ") || "Live radio",
    album: "Live",
    albumId: "",
    duration: 0,
    source: "Radio",
    art,
    url,
  };
}

function readRadioQuery(data: unknown): { q: string; tag: string } {
  if (typeof data !== "object" || data === null) return { q: "", tag: "Jazz" };
  const q = "q" in data && typeof data.q === "string" ? data.q.trim().slice(0, 60) : "";
  const tag = "tag" in data && typeof data.tag === "string" ? data.tag.trim().slice(0, 32) : "";
  return { q, tag: q ? tag : tag || "Jazz" };
}

export const getStations = createServerFn({ method: "GET" })
  .validator(readRadioQuery)
  .handler(async ({ data }) => {
    const params = new URLSearchParams({
      limit: "60",
      hidebroken: "true",
      order: "votes",
      reverse: "true",
    });
    if (data.q) params.set("name", data.q);
    if (data.tag) params.set("tag", data.tag.toLowerCase());
    const rows = await radioFetch(`/json/stations/search?${params}`);
    const tracks = rows.map(stationTrack).filter((track): track is Track => track !== null);
    tracks.sort((a, b) => Number(b.url.startsWith("https")) - Number(a.url.startsWith("https")));
    return tracks.slice(0, 40);
  });
