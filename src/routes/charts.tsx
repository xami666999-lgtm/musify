import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getCharts } from "@/lib/catalog";
import { TrackList } from "@/components/tracks";

export const Route = createFileRoute("/charts")({
  component: ChartsPage,
});

function ChartsPage() {
  const charts = useQuery({ queryKey: ["charts"], queryFn: () => getCharts(), staleTime: 60_000 });
  return (
    <div className="page-enter px-4 py-6 md:px-8">
      <h1 className="text-3xl font-bold tracking-tight">Charts</h1>
      <p className="mb-6 mt-2 text-muted">Most played free releases, as a ranked list.</p>
      {charts.isLoading ? <p className="text-muted">Ranking songs…</p> : null}
      {charts.isError ? <p className="text-muted">Charts did not load.</p> : null}
      {charts.data ? <TrackList tracks={charts.data} /> : null}
    </div>
  );
}
