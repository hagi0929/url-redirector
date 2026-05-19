import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type HitEvent } from "../api";
import { WorldMap } from "../components/WorldMap";
import { countryName, flagEmoji } from "../lib/countries";
import { formatNumber, formatRelative } from "../lib/format";

type Range = "1h" | "24h" | "7d" | "30d" | "all";

const RANGES: { value: Range; label: string }[] = [
  { value: "1h", label: "1h" },
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "all", label: "All" },
];

function rangeToSince(r: Range): string | undefined {
  const now = Date.now();
  switch (r) {
    case "1h":
      return new Date(now - 60 * 60 * 1000).toISOString();
    case "24h":
      return new Date(now - 24 * 60 * 60 * 1000).toISOString();
    case "7d":
      return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    case "30d":
      return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
    case "all":
      return undefined;
  }
}

export function StatsPage() {
  const [range, setRange] = useState<Range>("24h");
  const [slugFilter, setSlugFilter] = useState<string>("");
  const [countryFilter, setCountryFilter] = useState<string>("");

  const stats = useQuery({ queryKey: ["stats"], queryFn: api.stats, refetchInterval: 15_000 });
  const links = useQuery({ queryKey: ["redirects"], queryFn: api.list, refetchInterval: 30_000 });

  const geo = useQuery({
    queryKey: ["geo", range, slugFilter],
    queryFn: () => api.geo({ since: rangeToSince(range), slug: slugFilter || undefined }),
    refetchInterval: 30_000,
  });
  const hits = useQuery({
    queryKey: ["hits", range, slugFilter, countryFilter],
    queryFn: () =>
      api.hits({
        since: rangeToSince(range),
        slug: slugFilter || undefined,
        country: countryFilter || undefined,
        limit: 500,
      }),
    refetchInterval: 15_000,
  });

  const topCountries = useMemo(() => {
    const counts = geo.data?.counts ?? {};
    return Object.entries(counts)
      .filter(([k]) => k !== "??")
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [geo.data]);

  const unknown = geo.data?.counts?.["??"] ?? 0;
  const totalGeo = geo.data?.total ?? 0;

  const hourBuckets = useMemo(() => bucketHits(hits.data?.items ?? [], 24), [hits.data]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Stats</h2>
          <p className="text-xs text-muted mt-0.5">
            Hit log retains the last 30 days. Counters from before this deploy are visible as <em>All-time hits</em> but
            don't carry geo data.
          </p>
        </div>
        <div className="inline-flex bg-panel2 border border-border rounded-md p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-2.5 py-1 rounded text-xs ${
                range === r.value ? "bg-bg text-text" : "text-muted hover:text-text"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <SlugFilterBar
        items={links.data?.items ?? []}
        value={slugFilter}
        onChange={setSlugFilter}
      />

      {countryFilter && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/30 text-xs">
          <span className="text-muted">Filtered by country:</span>
          <span className="font-medium">
            {flagEmoji(countryFilter)} {countryName(countryFilter)}
          </span>
          <button
            onClick={() => setCountryFilter("")}
            className="ml-auto text-accent hover:underline"
          >
            Clear
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card label="Hits in range" value={formatNumber(totalGeo)} />
        <Card label="Countries seen" value={formatNumber(topCountries.length)} />
        <Card label="Total redirects" value={formatNumber(stats.data?.total_redirects ?? 0)} />
        <Card label="All-time hits" value={formatNumber(stats.data?.total_hits ?? 0)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
        <div className="rounded-xl border border-border bg-panel p-3 shadow-card">
          <div className="flex items-center justify-between px-1 pb-2">
            <h3 className="text-sm font-semibold">Geography</h3>
            <span className="text-[11px] text-muted">{formatNumber(totalGeo)} hits</span>
          </div>
          <WorldMap
            counts={geo.data?.counts ?? {}}
            onSelect={setCountryFilter}
            selected={countryFilter || undefined}
          />
          {unknown > 0 && (
            <div className="mt-2 text-[11px] text-muted px-1">
              {formatNumber(unknown)} hits with no country (GeoIP DB missing or private IP)
            </div>
          )}
        </div>
        <div className="rounded-xl border border-border bg-panel p-3 shadow-card">
          <h3 className="text-sm font-semibold px-1 pb-2">Top countries</h3>
          {topCountries.length === 0 ? (
            <div className="text-xs text-muted px-1 py-6 text-center">No hits in range</div>
          ) : (
            <ul className="space-y-1">
              {topCountries.map(([code, count]) => {
                const selected = countryFilter === code;
                return (
                  <li key={code}>
                    <button
                      onClick={() => setCountryFilter(selected ? "" : code)}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-sm ${
                        selected ? "bg-accent/15 text-accent" : "hover:bg-panel2 text-text"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <span className="text-lg leading-none">{flagEmoji(code)}</span>
                        <span className="truncate">{countryName(code)}</span>
                      </span>
                      <span className="tabular-nums text-muted text-xs">{formatNumber(count)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-panel p-3 shadow-card">
        <h3 className="text-sm font-semibold px-1 pb-2">Hits over time</h3>
        <Sparkline buckets={hourBuckets} />
      </div>

      <div className="rounded-xl border border-border bg-panel shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
          <h3 className="text-sm font-semibold">Recent hits</h3>
          <span className="text-xs text-muted">{formatNumber(hits.data?.total ?? 0)} in range</span>
        </div>
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted bg-panel2/40 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left font-medium">When</th>
                <th className="px-3 py-2 text-left font-medium">Slug</th>
                <th className="px-3 py-2 text-left font-medium">Country</th>
                <th className="px-3 py-2 text-left font-medium">IP</th>
                <th className="px-3 py-2 text-left font-medium">Browser</th>
                <th className="px-3 py-2 text-left font-medium">OS</th>
                <th className="px-3 py-2 text-left font-medium">Referrer</th>
              </tr>
            </thead>
            <tbody>
              {(hits.data?.items ?? []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted text-xs">
                    No hits in range
                  </td>
                </tr>
              ) : (
                (hits.data?.items ?? []).map((h, i) => (
                  <tr key={i} className="border-t border-border/60 hover:bg-panel2/30">
                    <td className="px-3 py-1.5 text-xs text-muted whitespace-nowrap">
                      {formatRelative(h.at)}
                    </td>
                    <td className="px-3 py-1.5 font-mono text-accent text-xs">/{h.slug}</td>
                    <td className="px-3 py-1.5 text-xs">
                      {h.country_code ? (
                        <span>
                          <span className="mr-1">{flagEmoji(h.country_code)}</span>
                          {h.country_name || countryName(h.country_code)}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 font-mono text-xs text-muted">{h.ip || "—"}</td>
                    <td className="px-3 py-1.5 text-xs text-muted">{h.browser || "—"}</td>
                    <td className="px-3 py-1.5 text-xs text-muted">{h.os || "—"}</td>
                    <td className="px-3 py-1.5 text-xs text-muted truncate max-w-[200px]">
                      {h.referrer || "direct"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SlugFilterBar({
  items,
  value,
  onChange,
}: {
  items: { slug: string; hit_count: number; favorite: boolean }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      return b.hit_count - a.hit_count;
    });
  }, [items]);
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-panel/50 border border-border">
      <span className="text-[11px] uppercase tracking-wider text-muted shrink-0">Slug</span>
      <div className="flex gap-1 overflow-x-auto scrollbar-thin">
        <Chip active={value === ""} onClick={() => onChange("")}>
          All
        </Chip>
        {sorted.map((r) => (
          <Chip key={r.slug} active={value === r.slug} onClick={() => onChange(r.slug)} mono>
            /{r.slug}
            <span className="ml-1.5 text-[10px] text-muted tabular-nums">{r.hit_count}</span>
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  mono,
  children,
}: {
  active: boolean;
  onClick: () => void;
  mono?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-2.5 py-1 rounded-md text-xs border whitespace-nowrap transition-colors ${
        active
          ? "bg-accent/15 border-accent/40 text-accent"
          : "bg-panel2 border-border text-muted hover:text-text"
      } ${mono ? "font-mono" : ""}`}
    >
      {children}
    </button>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-panel p-4 shadow-card">
      <div className="text-[11px] uppercase tracking-wider text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function bucketHits(events: HitEvent[], buckets: number): number[] {
  if (events.length === 0) return new Array(buckets).fill(0);
  const now = Date.now();
  const oldest = Math.min(...events.map((e) => new Date(e.at).getTime()));
  const span = Math.max(now - oldest, 60 * 1000);
  const step = span / buckets;
  const counts = new Array(buckets).fill(0);
  for (const e of events) {
    const t = new Date(e.at).getTime();
    const idx = Math.min(buckets - 1, Math.floor((t - oldest) / step));
    counts[idx]++;
  }
  return counts;
}

function Sparkline({ buckets }: { buckets: number[] }) {
  const max = Math.max(1, ...buckets);
  return (
    <div className="flex items-end gap-0.5 h-24 px-1">
      {buckets.map((c, i) => (
        <div
          key={i}
          className="flex-1 bg-accent/40 hover:bg-accent rounded-sm transition-colors"
          style={{ height: `${(c / max) * 100}%`, minHeight: c > 0 ? 2 : 0 }}
          title={`${c} hits`}
        />
      ))}
    </div>
  );
}
