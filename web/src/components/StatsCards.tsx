import { Link2, MousePointerClick, Flame, Clock } from "lucide-react";
import type { Stats } from "../api";
import { formatNumber, formatRelative } from "../lib/format";

type Props = { stats?: Stats; loading: boolean };

export function StatsCards({ stats, loading }: Props) {
  const top = stats?.top_slugs?.[0];
  const latest = stats?.recent?.[0];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <Card icon={<Link2 size={18} />} label="Total Redirects" value={loading ? "—" : formatNumber(stats?.total_redirects ?? 0)} accent="text-accent" />
      <Card icon={<MousePointerClick size={18} />} label="Total Hits" value={loading ? "—" : formatNumber(stats?.total_hits ?? 0)} accent="text-accent2" />
      <Card
        icon={<Flame size={18} />}
        label="Top Slug"
        value={top?.slug ?? "—"}
        sub={top ? `${formatNumber(top.hit_count)} hits` : "no data"}
        accent="text-warning"
      />
      <Card
        icon={<Clock size={18} />}
        label="Latest"
        value={latest?.slug ?? "—"}
        sub={latest ? formatRelative(latest.created_at) : "no data"}
        accent="text-success"
      />
    </div>
  );
}

function Card({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-panel p-4 shadow-card">
      <div className="flex items-center justify-between text-muted text-xs uppercase tracking-wider">
        <span>{label}</span>
        <span className={accent}>{icon}</span>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight truncate" title={value}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}
