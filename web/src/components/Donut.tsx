import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#7c5cff", "#22d3ee", "#22c55e", "#f59e0b", "#ef4444", "#8a93a6"];

type Props = {
  data: Record<string, number>;
  title: string;
  empty?: string;
  formatLabel?: (key: string) => string;
};

export function Donut({ data, title, empty = "no data", formatLabel }: Props) {
  const items = useMemo(() => {
    const arr = Object.entries(data || {})
      .map(([k, v]) => ({ name: k, value: v }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);
    const top = arr.slice(0, 5);
    const rest = arr.slice(5);
    if (rest.length) {
      const restSum = rest.reduce((s, x) => s + x.value, 0);
      top.push({ name: "Other", value: restSum });
    }
    return top;
  }, [data]);

  const total = items.reduce((s, x) => s + x.value, 0);

  return (
    <div className="rounded-xl border border-border bg-panel p-4 shadow-card">
      <h4 className="text-xs uppercase tracking-wider text-muted mb-2">{title}</h4>
      {items.length === 0 ? (
        <div className="h-36 flex items-center justify-center text-sm text-muted">{empty}</div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="h-32 w-32 shrink-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={items}
                  innerRadius={36}
                  outerRadius={56}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {items.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number, _n, p) => [`${v}`, p.payload.name]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-[10px] text-muted uppercase tracking-wider">total</div>
              <div className="text-sm font-semibold tabular-nums">{total}</div>
            </div>
          </div>
          <ul className="flex-1 space-y-1 min-w-0">
            {items.map((it, i) => {
              const pct = total ? Math.round((it.value / total) * 100) : 0;
              const label = formatLabel ? formatLabel(it.name) : it.name;
              return (
                <li key={it.name} className="flex items-center gap-2 text-xs min-w-0">
                  <span className="size-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="truncate flex-1" title={label}>
                    {label}
                  </span>
                  <span className="text-muted tabular-nums shrink-0">
                    {it.value}
                    <span className="ml-1 opacity-60">{pct}%</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
