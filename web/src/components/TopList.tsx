import type { Redirect } from "../api";
import { formatNumber, truncate } from "../lib/format";

type Props = { items: Redirect[]; loading: boolean };

export function TopList({ items, loading }: Props) {
  const max = Math.max(1, ...items.map((i) => i.hit_count));
  return (
    <div className="rounded-xl border border-border bg-panel p-4 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Top Redirects</h3>
        <span className="text-xs text-muted">by hit count</span>
      </div>
      {loading ? (
        <div className="text-sm text-muted">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-muted">No redirects yet.</div>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 5).map((r) => {
            const pct = (r.hit_count / max) * 100;
            return (
              <li key={r.slug} className="text-sm">
                <div className="flex justify-between gap-2 mb-1">
                  <span className="font-mono text-accent truncate">/{r.slug}</span>
                  <span className="text-muted text-xs shrink-0 tabular-nums">{formatNumber(r.hit_count)}</span>
                </div>
                <div className="text-[11px] text-muted truncate mb-1" title={r.target_url}>
                  → {truncate(r.target_url, 80)}
                </div>
                <div className="h-1.5 rounded-full bg-panel2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent to-accent2"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
