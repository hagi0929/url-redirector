import { useMemo } from "react";
import { Globe } from "lucide-react";

type Props = { data: Record<string, number> };

export function ReferrerList({ data }: Props) {
  const items = useMemo(() => {
    return Object.entries(data || {})
      .map(([k, v]) => ({ host: k, count: v }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [data]);

  const max = Math.max(1, ...items.map((i) => i.count));

  return (
    <div className="rounded-xl border border-border bg-panel p-4 shadow-card">
      <h4 className="text-xs uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5">
        <Globe size={12} /> Top Referrers
      </h4>
      {items.length === 0 ? (
        <div className="text-sm text-muted py-6 text-center">no data</div>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => {
            const pct = (it.count / max) * 100;
            return (
              <li key={it.host} className="text-xs">
                <div className="flex justify-between gap-2 mb-1">
                  <span className="truncate" title={it.host}>
                    {it.host}
                  </span>
                  <span className="text-muted tabular-nums shrink-0">{it.count}</span>
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
