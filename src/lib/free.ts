import { execFile } from "node:child_process";
import { createServerFn } from "@tanstack/react-start";
import type { Track } from "@/lib/types";

type MixFile = {
  download_url?: string;
  file_format_info?: { ps?: string; "media-type"?: string };
};

type MixUpload = {
  upload_id?: number;
  upload_name?: string;
  user_name?: string;
  files?: MixFile[];
};

function seconds(label?: string): number {
  if (!label) return 0;
  const parts = label.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function mixTrack(upload: MixUpload): Track | null {
  const file = upload.files?.find((item) => item.download_url?.startsWith("https://") && item.file_format_info?.["media-type"] === "audio");
  if (!file?.download_url || !upload.upload_id || !upload.upload_name) return null;
  return {
    id: `cc:${upload.upload_id}`,
    title: upload.upload_name,
    artist: upload.user_name || "ccMixter",
    album: "Royalty-free",
    albumId: "",
    duration: seconds(file.file_format_info?.ps),
    source: "ccMixter",
    art: "",
    url: file.download_url,
  };
}

function curlJson(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    execFile(
      "curl",
      ["-fsS", "--max-time", "12", "-A", "Musify/1.0", "-H", "Accept: application/json", url],
      { maxBuffer: 6_000_000 },
      (error, stdout) => {
        if (error) {
          reject(new Error("Royalty-free catalog did not answer"));
          return;
        }
        try {
          resolve(JSON.parse(stdout));
        } catch {
          reject(new Error("Royalty-free catalog did not answer"));
        }
      },
    );
  });
}

export const getFreeTracks = createServerFn({ method: "GET" })
  .validator((data: unknown) => {
    const q = typeof data === "object" && data !== null && "q" in data && typeof data.q === "string" ? data.q.trim().slice(0, 60) : "";
    return { q };
  })
  .handler(async ({ data }) => {
    const params = new URLSearchParams({ format: "json", limit: data.q ? "24" : "12" });
    if (data.q) {
      params.set("search_type", "any");
      params.set("search_text", data.q);
    }
    const rows = (await curlJson(`https://ccmixter.org/api/query?${params}`)) as MixUpload[];
    if (!Array.isArray(rows)) return [];
    return rows.map(mixTrack).filter((track): track is Track => track !== null);
  });
