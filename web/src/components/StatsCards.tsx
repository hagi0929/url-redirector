import { Link2, MousePointerClick, Star, Activity, Zap, type LucideIcon } from "lucide-react";
import type { Stats } from "../api";
import { formatNumber } from "../lib/format";

type Props = { stats?: Stats; loading: boolean };

export function StatsCards({ stats, loading }: Props) {
  const cards = [
    {
      label: "Total Redirects",
      value: formatNumber(stats?.total_redirects ?? 0),
      icon: Link2,
      accent: "from-accent/30 to-accent/0 text-accent",
      sub: stats ? `${formatNumber(stats.favorite_count)} starred` : undefined,
    },
    {
      label: "Total Hits",
      value: formatNumber(stats?.total_hits ?? 0),
      icon: MousePointerClick,
      accent: "from-accent2/30 to-accent2/0 text-accent2",
    },
    {
      label: "Last 24h",
      value: formatNumber(stats?.hits_last_24h ?? 0),
      icon: Activity,
      accent: "from-success/30 to-success/0 text-success",
      sub: stats ? `${formatNumber(stats.active_slugs_24h)} active slugs` : undefined,
    },
    {
      label: "Favorites",
      value: formatNumber(stats?.favorite_count ?? 0),
      icon: Star,
      accent: "from-warning/30 to-warning/0 text-warning",
    },
    {
      label: "Top Slug",
      value: stats?.top_slugs?.[0]?.slug ?? "—",
      icon: Zap,
      accent: "from-accent/30 to-accent/0 text-accent",
      mono: true,
      sub: stats?.top_slugs?.[0] ? `${formatNumber(stats.top_slugs[0].hit_count)} hits` : "no data",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
      {cards.map((c, i) => (
        <Card key={c.label} {...c} loading={loading} delay={i * 30} />
      ))}
    </div>
  );
}

type CardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  accent: string;
  mono?: boolean;
  loading: boolean;
  delay: number;
};
function Card({ icon: Icon, label, value, sub, accent, mono, loading, delay }: CardProps) {
  return (
    <div
      className="relative rounded-xl border border-border bg-panel p-4 shadow-card overflow-hidden animate-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`absolute -top-8 -right-8 size-24 rounded-full blur-2xl bg-gradient-to-br ${accent} opacity-50`} />
      <div className="relative flex items-center justify-between text-muted text-[11px] uppercase tracking-wider">
        <span>{label}</span>
        <Icon size={16} className={accent.split(" ").pop()} />
      </div>
      <div
        className={`relative mt-2 text-2xl font-semibold tracking-tight truncate ${mono ? "font-mono" : ""}`}
        title={value}
      >
        {loading ? <span className="opacity-40">—</span> : value}
      </div>
      {sub && <div className="relative mt-1 text-xs text-muted truncate">{sub}</div>}
    </div>
  );
}
