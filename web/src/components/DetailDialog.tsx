import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Copy, ExternalLink, Pencil, Star, Trash2, X, MousePointerClick, Clock } from "lucide-react";
import { api, ApiError, type Redirect } from "../api";
import { Dialog } from "./Dialog";
import { HitsChart } from "./HitsChart";
import { Donut } from "./Donut";
import { ReferrerList } from "./ReferrerList";
import { useToast } from "./Toast";
import { formatNumber, formatRelative, originForRedirect } from "../lib/format";

type Props = {
  open: boolean;
  redirect: Redirect | null;
  onClose: () => void;
  onEdit: (r: Redirect) => void;
  onDelete: (r: Redirect) => void;
};

export function DetailDialog({ open, redirect, onClose, onEdit, onDelete }: Props) {
  const qc = useQueryClient();
  const toast = useToast();
  const slug = redirect?.slug;

  const metrics = useQuery({
    queryKey: ["metrics", slug],
    queryFn: () => api.metrics(slug!),
    enabled: open && !!slug,
    refetchInterval: open ? 5_000 : false,
  });

  const favMutation = useMutation({
    mutationFn: () => api.setFavorite(slug!, !redirect!.favorite),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["redirects"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.detail || `Failed (${err.status})` : "Failed"),
  });

  if (!redirect) {
    return <Dialog open={open} onClose={onClose} title="" width={920} />;
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Copied ${label}`);
    } catch {
      toast.error("Copy failed");
    }
  }

  const m = metrics.data;
  return (
    <Dialog open={open} onClose={onClose} title="" width={920}>
      <div className="-mx-5 -mt-3">
        <div className="px-5 pt-3 pb-4 border-b border-border">
          <div className="flex items-start gap-3">
            <button
              onClick={() => favMutation.mutate()}
              className={`shrink-0 size-9 rounded-md inline-flex items-center justify-center transition-colors ${
                redirect.favorite
                  ? "bg-warning/15 text-warning hover:bg-warning/25"
                  : "text-muted hover:text-warning hover:bg-panel2"
              }`}
              title={redirect.favorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Star size={18} fill={redirect.favorite ? "currentColor" : "none"} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg text-accent">/{redirect.slug}</span>
                <button onClick={() => copy(originForRedirect(redirect.slug), "short URL")} className="p-1 text-muted hover:text-text rounded">
                  <Copy size={13} />
                </button>
                <span className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-panel2 border border-border text-muted">
                  {redirect.status_code}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm text-muted">
                <span>→</span>
                <span className="font-mono truncate" title={redirect.target_url}>
                  {redirect.target_url}
                </span>
                <button onClick={() => copy(redirect.target_url, "target URL")} className="p-1 text-muted hover:text-text rounded">
                  <Copy size={13} />
                </button>
                <a href={redirect.target_url} target="_blank" rel="noopener noreferrer" className="p-1 text-muted hover:text-text rounded">
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onEdit(redirect)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted hover:text-text hover:bg-panel2"
              >
                <Pencil size={13} /> Edit
              </button>
              <button
                onClick={() => onDelete(redirect)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-muted hover:text-danger hover:bg-danger/10"
              >
                <Trash2 size={13} /> Delete
              </button>
              <button onClick={onClose} className="p-1.5 text-muted hover:text-text rounded-md hover:bg-panel2">
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MiniStat icon={<MousePointerClick size={13} />} label="Total Hits" value={formatNumber(redirect.hit_count)} tone="text-accent" />
            <MiniStat
              icon={<Clock size={13} />}
              label="Last Access"
              value={formatRelative(redirect.last_accessed)}
              tone="text-success"
            />
            <MiniStat label="Created" value={formatRelative(redirect.created_at)} />
            <MiniStat label="Updated" value={formatRelative(redirect.updated_at)} />
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          <Section title="Hits — Last 24 hours (hourly, UTC)">
            <HitsChart data={m?.hourly_hits ?? {}} granularity="hourly" />
          </Section>
          <Section title="Hits — Last 30 days (daily, UTC)">
            <HitsChart data={m?.daily_hits ?? {}} granularity="daily" />
          </Section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Donut data={m?.browsers ?? {}} title="Browsers" />
            <Donut data={m?.oses ?? {}} title="Operating Systems" />
            <ReferrerList data={m?.referrers ?? {}} />
          </div>
        </div>
      </div>
    </Dialog>
  );
}

function MiniStat({
  icon,
  label,
  value,
  tone,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg bg-panel2 border border-border px-3 py-2">
      <div className={`flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted ${tone ?? ""}`}>
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-sm font-semibold truncate" title={value}>
        {value}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-panel p-4 shadow-card">
      <h4 className="text-xs uppercase tracking-wider text-muted mb-2">{title}</h4>
      {children}
    </div>
  );
}
