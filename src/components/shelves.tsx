import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { prefetchAlbum } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import type { AlbumCard, Track } from "@/lib/types";

export function Cover({
  art,
  title,
  className,
  labeled = false,
}: {
  art?: string;
  title: string;
  className?: string;
  labeled?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cn("relative aspect-square overflow-hidden rounded-md bg-surface-2", className)}>
      {art && !failed ? (
        <img src={art} alt="" className="absolute inset-0 h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        <div className="grid h-full w-full place-items-center bg-surface-2 text-2xl font-semibold text-muted">
          {title.slice(0, 1)}
        </div>
      )}
      {labeled ? (
        <div className="absolute inset-x-0 bottom-0 bg-bg/80 px-2 py-2">
          <p className="line-clamp-2 text-sm font-medium leading-tight text-fg">{title}</p>
        </div>
      ) : null}
    </div>
  );
}

export function Shelf({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-end justify-between gap-3">
        <h2 className="text-2xl font-bold tracking-tight text-fg">{title}</h2>
        {action}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">{children}</div>
    </section>
  );
}

export function AlbumTile({ album }: { album: AlbumCard }) {
  return (
    <Link
      to="/album/$albumId"
      params={{ albumId: album.id }}
      title={`${album.title} — ${album.artist}`}
      onMouseEnter={() => {
        void prefetchAlbum(album.id);
      }}
      onFocus={() => {
        void prefetchAlbum(album.id);
      }}
      className="w-36 shrink-0 sm:w-44"
    >
      <Cover art={album.art} title={album.title} />
      <p className="mt-2 truncate text-sm font-medium">{album.title}</p>
      <p className="truncate text-sm text-muted">{album.artist}</p>
    </Link>
  );
}

export function ReleaseHeader({
  eyebrow,
  title,
  meta,
  art,
  onPlay,
  children,
}: {
  eyebrow: string;
  title: string;
  meta: string;
  art?: string;
  onPlay?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <header className="bg-surface px-4 py-8 md:px-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-end">
        <Cover art={art} title={title} className="w-48 shrink-0 md:w-56" />
        <div className="min-w-0">
          <p className="text-sm text-muted">{eyebrow}</p>
          <h1 className="text-3xl font-bold tracking-tight text-balance md:text-5xl">{title}</h1>
          <p className="mt-2 text-muted">{meta}</p>
          {onPlay ? (
            <button type="button" onClick={onPlay} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-copper px-6 text-sm font-semibold text-on-copper active:scale-[0.96]">
              <Play className="size-4 fill-current" />
              Play
            </button>
          ) : null}
          {children}
        </div>
      </div>
    </header>
  );
}

export function useCollectedTracks(albums: AlbumCard[]) {
  const key = albums.map((album) => album.id).join("|");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!key) {
      setTracks([]);
      return;
    }
    let cancel = false;
    setLoading(true);
    const slice = albums.slice(0, 4);
    void Promise.all(slice.map((album) => prefetchAlbum(album.id).catch(() => null))).then((details) => {
      if (cancel) return;
      setTracks(details.flatMap((detail) => detail?.tracks.slice(0, 4) ?? []).slice(0, 20));
      setLoading(false);
    });
    return () => {
      cancel = true;
    };
  }, [key, albums]);
  return { tracks, loading };
}
