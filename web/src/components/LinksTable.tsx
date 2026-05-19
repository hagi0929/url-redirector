import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Copy,
  ExternalLink,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { api, ApiError, type Redirect } from "../api";
import { usePublicBaseURL } from "../lib/config";
import { formatNumber, formatRelative, originForRedirect, truncate } from "../lib/format";
import { STATUS, STATUS_CODES, statusMeta, type StatusCode } from "../lib/status";
import { useToast } from "./Toast";

const SLUG_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;

type Props = {
  items: Redirect[];
  loading: boolean;
};

export function LinksTable({ items, loading }: Props) {
  const qc = useQueryClient();
  const toast = useToast();
  const publicBase = usePublicBaseURL();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<StatusCode>>(new Set());
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let arr = items;
    if (favoritesOnly) arr = arr.filter((r) => r.favorite);
    if (statusFilter.size > 0) arr = arr.filter((r) => statusFilter.has(r.status_code as StatusCode));
    if (term) {
      arr = arr.filter(
        (r) => r.slug.toLowerCase().includes(term) || r.target_url.toLowerCase().includes(term),
      );
    }
    return [...arr].sort((a, b) => {
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      if (a.hit_count !== b.hit_count) return b.hit_count - a.hit_count;
      return a.slug.localeCompare(b.slug);
    });
  }, [items, q, statusFilter, favoritesOnly]);

  function invalidate() {
    qc.invalidateQueries({ queryKey: ["redirects"] });
    qc.invalidateQueries({ queryKey: ["stats"] });
  }

  function handleError(err: unknown, fallback: string) {
    if (err instanceof ApiError) toast.error(err.detail || `${fallback} (${err.status})`);
    else toast.error(fallback);
  }

  const favMut = useMutation({
    mutationFn: ({ slug, favorite }: { slug: string; favorite: boolean }) =>
      api.setFavorite(slug, favorite),
    onSuccess: invalidate,
    onError: (e) => handleError(e, "Favorite failed"),
  });
  const renameMut = useMutation({
    mutationFn: ({ slug, newSlug }: { slug: string; newSlug: string }) =>
      api.rename(slug, newSlug),
    onSuccess: () => {
      invalidate();
      toast.success("Slug renamed");
    },
    onError: (e) => handleError(e, "Rename failed"),
  });
  const updateMut = useMutation({
    mutationFn: ({ slug, target, status }: { slug: string; target?: string; status?: number }) =>
      api.update(slug, { target_url: target, status_code: status }),
    onSuccess: invalidate,
    onError: (e) => handleError(e, "Update failed"),
  });
  const deleteMut = useMutation({
    mutationFn: (slug: string) => api.remove(slug),
    onSuccess: () => {
      invalidate();
      toast.success("Deleted");
    },
    onError: (e) => handleError(e, "Delete failed"),
  });
  const createMut = useMutation({
    mutationFn: ({ slug, target, status }: { slug: string; target: string; status: number }) =>
      api.create({ slug, target_url: target, status_code: status }),
    onSuccess: () => {
      invalidate();
      toast.success("Created");
    },
    onError: (e) => handleError(e, "Create failed"),
  });

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Copied ${label}`);
    } catch {
      toast.error("Copy failed");
    }
  }

  function setStatusFilterTo(code: StatusCode) {
    const next = new Set(statusFilter);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setStatusFilter(next);
  }

  const showFiltered = statusFilter.size > 0 || favoritesOnly || q.trim().length > 0;

  return (
    <div className="rounded-xl border border-border bg-panel shadow-card overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 border-b border-border">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search slug or target…"
            className="w-full pl-8 pr-3 py-2 text-sm bg-panel2 border border-border rounded-md outline-none focus:border-accent"
          />
        </div>
        <button
          onClick={() => setFavoritesOnly((v) => !v)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border ${
            favoritesOnly
              ? "bg-warning/10 text-warning border-warning/40"
              : "bg-panel2 border-border text-muted hover:text-text"
          }`}
        >
          <Star size={12} fill={favoritesOnly ? "currentColor" : "none"} />
          Favorites
        </button>
        <div className="inline-flex items-center gap-1">
          {STATUS_CODES.map((c) => {
            const on = statusFilter.has(c);
            const meta = STATUS[c];
            return (
              <button
                key={c}
                onClick={() => setStatusFilterTo(c)}
                title={meta.label}
                className={`px-2 py-1 rounded text-[11px] font-mono border transition-colors ${
                  on
                    ? "bg-accent/15 border-accent/40 text-accent"
                    : "bg-panel2 border-border text-muted hover:text-text"
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
        <div className="text-xs text-muted ml-auto">
          {loading ? "Loading…" : showFiltered ? `${filtered.length} of ${items.length}` : `${items.length} total`}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted bg-panel2/40">
            <tr>
              <th className="w-9 px-2 py-2.5"></th>
              <th className="px-3 py-2.5 text-left font-medium w-[22%]">Slug</th>
              <th className="px-3 py-2.5 text-left font-medium">Target URL</th>
              <th className="px-3 py-2.5 text-left font-medium w-[110px]">Status</th>
              <th className="px-3 py-2.5 text-right font-medium w-[70px]">Hits</th>
              <th className="px-3 py-2.5 text-left font-medium w-[110px]">Last hit</th>
              <th className="px-2 py-2.5 w-[40px]"></th>
            </tr>
          </thead>
          <tbody>
            <NewRow onCreate={(slug, target, status) => createMut.mutate({ slug, target, status })} />
            {loading && items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-muted">
                  {items.length === 0
                    ? "No redirects yet. Type in the row above to create your first."
                    : "No matches."}
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <RedirectRow
                  key={r.slug}
                  r={r}
                  publicBase={publicBase}
                  onToggleFav={() => favMut.mutate({ slug: r.slug, favorite: !r.favorite })}
                  onRename={(newSlug) => renameMut.mutate({ slug: r.slug, newSlug })}
                  onUpdateTarget={(target) => updateMut.mutate({ slug: r.slug, target })}
                  onUpdateStatus={(status) => updateMut.mutate({ slug: r.slug, status })}
                  onDelete={() => deleteMut.mutate(r.slug)}
                  onCopy={copy}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RedirectRow({
  r,
  publicBase,
  onToggleFav,
  onRename,
  onUpdateTarget,
  onUpdateStatus,
  onDelete,
  onCopy,
}: {
  r: Redirect;
  publicBase: string;
  onToggleFav: () => void;
  onRename: (newSlug: string) => void;
  onUpdateTarget: (target: string) => void;
  onUpdateStatus: (status: number) => void;
  onDelete: () => void;
  onCopy: (text: string, label: string) => void;
}) {
  return (
    <tr className="border-t border-border/60 hover:bg-panel2/30 transition-colors">
      <td className="px-2 py-1.5">
        <button
          onClick={onToggleFav}
          className={`p-1.5 rounded-md transition-colors ${
            r.favorite ? "text-warning hover:bg-warning/10" : "text-muted hover:text-warning hover:bg-panel2"
          }`}
          title={r.favorite ? "Unfavorite" : "Favorite"}
        >
          <Star size={14} fill={r.favorite ? "currentColor" : "none"} />
        </button>
      </td>
      <td className="px-3 py-1.5">
        <SlugCell
          value={r.slug}
          onSave={(v) => v !== r.slug && onRename(v)}
          onCopy={() => onCopy(originForRedirect(r.slug, publicBase), "short URL")}
        />
      </td>
      <td className="px-3 py-1.5">
        <TargetCell
          value={r.target_url}
          onSave={(v) => v !== r.target_url && onUpdateTarget(v)}
          onCopy={() => onCopy(r.target_url, "target URL")}
        />
      </td>
      <td className="px-3 py-1.5">
        <StatusPicker value={r.status_code} onChange={onUpdateStatus} />
      </td>
      <td className="px-3 py-1.5 text-right tabular-nums">{formatNumber(r.hit_count)}</td>
      <td className="px-3 py-1.5 text-muted text-xs">{formatRelative(r.last_accessed)}</td>
      <td className="px-2 py-1.5 text-right">
        <button
          onClick={() => {
            if (confirm(`Delete /${r.slug}?`)) onDelete();
          }}
          className="p-1.5 rounded-md text-muted hover:text-danger hover:bg-danger/10"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
}

function SlugCell({ value, onSave, onCopy }: { value: string; onSave: (v: string) => void; onCopy: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setDraft(value), [value, editing]);

  function commit() {
    const v = draft.trim();
    if (v === value) {
      setEditing(false);
      setError(null);
      return;
    }
    if (!SLUG_RE.test(v)) {
      setError("Letters, digits, _ -");
      return;
    }
    onSave(v);
    setEditing(false);
    setError(null);
  }
  function cancel() {
    setDraft(value);
    setEditing(false);
    setError(null);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
          }}
          autoFocus
          className={`flex-1 min-w-0 px-2 py-1 rounded bg-panel2 border text-sm font-mono outline-none ${
            error ? "border-danger" : "border-accent"
          }`}
        />
        {error && <span className="text-[10px] text-danger">{error}</span>}
      </div>
    );
  }
  return (
    <div className="group flex items-center gap-1.5">
      <button
        onClick={() => setEditing(true)}
        className="font-mono text-accent text-left truncate hover:underline decoration-dotted underline-offset-4"
        title={value}
      >
        /{value}
      </button>
      <button
        onClick={onCopy}
        className="p-1 rounded-md text-muted opacity-0 group-hover:opacity-100 hover:text-text hover:bg-panel2 transition-opacity"
        title="Copy short URL"
      >
        <Copy size={12} />
      </button>
    </div>
  );
}

function TargetCell({ value, onSave, onCopy }: { value: string; onSave: (v: string) => void; onCopy: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setDraft(value), [value, editing]);

  function commit() {
    const v = draft.trim();
    if (v === value) {
      setEditing(false);
      setError(null);
      return;
    }
    try {
      const u = new URL(v);
      if (!u.protocol.startsWith("http")) throw new Error();
    } catch {
      setError("Invalid URL");
      return;
    }
    onSave(v);
    setEditing(false);
    setError(null);
  }
  function cancel() {
    setDraft(value);
    setEditing(false);
    setError(null);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") cancel();
          }}
          autoFocus
          type="url"
          className={`flex-1 min-w-0 px-2 py-1 rounded bg-panel2 border text-sm font-mono outline-none ${
            error ? "border-danger" : "border-accent"
          }`}
        />
        {error && <span className="text-[10px] text-danger whitespace-nowrap">{error}</span>}
      </div>
    );
  }
  return (
    <div className="group flex items-center gap-1.5 min-w-0">
      <button
        onClick={() => setEditing(true)}
        className="font-mono text-muted text-left truncate hover:text-text"
        title={value}
      >
        {truncate(value, 70)}
      </button>
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="p-1 rounded-md text-muted opacity-0 group-hover:opacity-100 hover:text-text hover:bg-panel2 transition-opacity"
        title="Open"
      >
        <ExternalLink size={12} />
      </a>
      <button
        onClick={onCopy}
        className="p-1 rounded-md text-muted opacity-0 group-hover:opacity-100 hover:text-text hover:bg-panel2 transition-opacity"
        title="Copy"
      >
        <Copy size={12} />
      </button>
    </div>
  );
}

function StatusPicker({ value, onChange }: { value: number; onChange: (code: number) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const meta = statusMeta(value);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", off);
    return () => document.removeEventListener("mousedown", off);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`px-2 py-1 rounded text-[11px] border inline-flex items-center gap-1.5 ${
          meta.kind === "permanent"
            ? "bg-accent/10 border-accent/30 text-accent"
            : "bg-panel2 border-border text-muted hover:text-text"
        }`}
        title={meta.desc}
      >
        <span className="font-mono">{meta.code}</span>
        <span className="opacity-75">{meta.short}</span>
      </button>
      {open && (
        <div className="absolute z-20 mt-1 left-0 w-56 rounded-md border border-border bg-panel shadow-card overflow-hidden text-xs">
          {STATUS_CODES.map((c) => {
            const m = STATUS[c];
            const selected = c === value;
            return (
              <button
                key={c}
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                }}
                className={`w-full px-3 py-2 text-left flex items-start gap-2 hover:bg-panel2 ${
                  selected ? "bg-accent/10" : ""
                }`}
              >
                <span className="font-mono text-accent shrink-0 mt-0.5">{c}</span>
                <span className="min-w-0 flex-1">
                  <div className="text-text">{m.label}</div>
                  <div className="text-muted text-[10px]">{m.desc.split(" · ")[1] ?? ""}</div>
                </span>
                {selected && <Check size={12} className="text-accent mt-1 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NewRow({ onCreate }: { onCreate: (slug: string, target: string, status: number) => void }) {
  const [slug, setSlug] = useState("");
  const [target, setTarget] = useState("");
  const [status, setStatus] = useState<number>(302);
  const [slugErr, setSlugErr] = useState<string | null>(null);
  const [targetErr, setTargetErr] = useState<string | null>(null);

  function submit() {
    const s = slug.trim();
    const t = target.trim();
    let ok = true;
    if (!s || !SLUG_RE.test(s)) {
      setSlugErr("Required");
      ok = false;
    }
    try {
      const u = new URL(t);
      if (!u.protocol.startsWith("http")) throw new Error();
    } catch {
      setTargetErr("Invalid URL");
      ok = false;
    }
    if (!ok) return;
    onCreate(s, t, status);
    setSlug("");
    setTarget("");
    setStatus(302);
    setSlugErr(null);
    setTargetErr(null);
  }

  function clear() {
    setSlug("");
    setTarget("");
    setStatus(302);
    setSlugErr(null);
    setTargetErr(null);
  }

  const hasInput = slug.length > 0 || target.length > 0;

  return (
    <tr className="border-t border-border/60 bg-panel2/20">
      <td className="px-2 py-1.5">
        <div className="p-1.5 text-accent" title="New redirect">
          <Plus size={14} />
        </div>
      </td>
      <td className="px-3 py-1.5">
        <input
          value={slug}
          onChange={(e) => {
            setSlug(e.target.value);
            setSlugErr(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="new-slug"
          className={`w-full px-2 py-1 rounded bg-panel2 border text-sm font-mono outline-none focus:border-accent ${
            slugErr ? "border-danger" : "border-border"
          }`}
        />
      </td>
      <td className="px-3 py-1.5">
        <input
          value={target}
          onChange={(e) => {
            setTarget(e.target.value);
            setTargetErr(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="https://example.com"
          type="url"
          className={`w-full px-2 py-1 rounded bg-panel2 border text-sm font-mono outline-none focus:border-accent ${
            targetErr ? "border-danger" : "border-border"
          }`}
        />
      </td>
      <td className="px-3 py-1.5">
        <StatusPicker value={status} onChange={setStatus} />
      </td>
      <td colSpan={2} className="px-3 py-1.5 text-xs text-muted">
        {slugErr || targetErr || (hasInput ? "Enter to create" : "Add new redirect")}
      </td>
      <td className="px-2 py-1.5 text-right">
        {hasInput ? (
          <div className="inline-flex gap-0.5">
            <button onClick={submit} className="p-1.5 rounded-md text-accent hover:bg-accent/10" title="Create">
              <Check size={14} />
            </button>
            <button onClick={clear} className="p-1.5 rounded-md text-muted hover:text-text hover:bg-panel2" title="Clear">
              <X size={14} />
            </button>
          </div>
        ) : null}
      </td>
    </tr>
  );
}
