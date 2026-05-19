import { useQuery } from "@tanstack/react-query";
import { Activity, MonitorSmartphone, Globe } from "lucide-react";
import { api } from "../api";
import { formatRelative, truncate } from "../lib/format";

export function RecentActivity({ onSelect }: { onSelect?: (slug: string) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["recent-hits"],
    queryFn: api.recentHits,
    refetchInterval: 4_000,
  });

  const items = data?.items?.slice(0, 12) ?? [];

  return (
    <div className="rounded-xl border border-border bg-panel shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="size-6 rounded-md bg-success/15 text-success inline-flex items-center justify-center">
            <Activity size={13} />
          </span>
          <h3 className="text-sm font-semibold">Live Activity</h3>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] text-muted">
          <span className="size-1.5 rounded-full bg-success animate-pulse" />
          live
        </span>
      </div>
      <div className="max-h-[460px] overflow-y-auto">
        {isLoading ? (
          <div className="px-4 py-8 text-center text-sm text-muted">Loading…</div>
        ) : items.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted">
            <Activity size={20} className="mx-auto mb-2 opacity-40" />
            Waiting for hits…
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {items.map((h, i) => (
              <li
                key={`${h.at}-${i}`}
                className={`px-4 py-2.5 hover:bg-panel2/40 ${onSelect ? "cursor-pointer" : ""}`}
                onClick={() => onSelect?.(h.slug)}
              >
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-mono text-accent truncate">/{h.slug}</span>
                  <span className="text-[11px] text-muted shrink-0">{formatRelative(h.at)}</span>
                </div>
                <div className="text-[11px] text-muted truncate mt-0.5" title={h.target}>
                  → {truncate(h.target, 50)}
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted">
                  <span className="inline-flex items-center gap-1">
                    <MonitorSmartphone size={11} />
                    {h.browser} · {h.os}
                  </span>
                  <span className="inline-flex items-center gap-1 truncate" title={h.referrer}>
                    <Globe size={11} />
                    {h.referrer}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
