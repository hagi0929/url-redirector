import { useMemo, useState } from "react";
import { Copy, ExternalLink, Pencil, Trash2, ArrowUpDown, ArrowDown, ArrowUp, Search } from "lucide-react";
import type { Redirect } from "../api";
import { formatNumber, formatRelative, originForRedirect, truncate } from "../lib/format";
import { useToast } from "./Toast";

type Sort = { key: "slug" | "hit_count" | "created_at" | "updated_at"; dir: "asc" | "desc" };

type Props = {
  items: Redirect[];
  loading: boolean;
  onEdit: (r: Redirect) => void;
  onDelete: (r: Redirect) => void;
};

export function RedirectsTable({ items, loading, onEdit, onDelete }: Props) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>({ key: "hit_count", dir: "desc" });
  const toast = useToast();

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let arr = items;
    if (term) {
      arr = arr.filter(
        (r) => r.slug.toLowerCase().includes(term) || r.target_url.toLowerCase().includes(term),
      );
    }
    const k = sort.key;
    const dir = sort.dir === "asc" ? 1 : -1;
    arr = [...arr].sort((a, b) => {
      const av = a[k];
      const bv = b[k];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    return arr;
  }, [items, q, sort]);

  function toggleSort(key: Sort["key"]) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Copied ${label}`);
    } catch {
      toast.error("Copy failed");
    }
  }

  return (
    <div className="rounded-xl border border-border bg-panel shadow-card overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search slug or target…"
            className="w-full pl-8 pr-3 py-2 text-sm bg-panel2 border border-border rounded-md outline-none focus:border-accent"
          />
        </div>
        <div className="text-xs text-muted">
          {loading ? "Loading…" : `${filtered.length} of ${items.length}`}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted bg-panel2/40">
            <tr>
              <Th onClick={() => toggleSort("slug")} sorted={sort.key === "slug" ? sort.dir : undefined}>
                Slug
              </Th>
              <th className="px-4 py-2.5 text-left font-medium">Target</th>
              <th className="px-4 py-2.5 text-left font-medium">Status</th>
              <Th onClick={() => toggleSort("hit_count")} sorted={sort.key === "hit_count" ? sort.dir : undefined} align="right">
                Hits
              </Th>
              <Th onClick={() => toggleSort("created_at")} sorted={sort.key === "created_at" ? sort.dir : undefined}>
                Created
              </Th>
              <th className="px-4 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted">
                  {items.length === 0 ? "No redirects yet. Click ‘New' to create one." : "No matches."}
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.slug} className="border-t border-border/60 hover:bg-panel2/40 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-accent">/{r.slug}</span>
                      <IconBtn onClick={() => copy(originForRedirect(r.slug), "short URL")} title="Copy short URL">
                        <Copy size={13} />
                      </IconBtn>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5 max-w-md">
                      <span className="font-mono text-muted truncate" title={r.target_url}>
                        {truncate(r.target_url, 70)}
                      </span>
                      <IconBtn onClick={() => copy(r.target_url, "target URL")} title="Copy target URL">
                        <Copy size={13} />
                      </IconBtn>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="px-2 py-0.5 rounded text-xs font-mono bg-panel2 border border-border text-muted">
                      {r.status_code}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{formatNumber(r.hit_count)}</td>
                  <td className="px-4 py-2.5 text-muted text-xs" title={r.created_at}>
                    {formatRelative(r.created_at)}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-1">
                      <IconBtn
                        as="a"
                        href={r.target_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open target"
                      >
                        <ExternalLink size={14} />
                      </IconBtn>
                      <IconBtn onClick={() => onEdit(r)} title="Edit">
                        <Pencil size={14} />
                      </IconBtn>
                      <IconBtn onClick={() => onDelete(r)} title="Delete" danger>
                        <Trash2 size={14} />
                      </IconBtn>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  children,
  onClick,
  sorted,
  align,
}: {
  children: React.ReactNode;
  onClick: () => void;
  sorted?: "asc" | "desc";
  align?: "left" | "right";
}) {
  return (
    <th
      onClick={onClick}
      className={`px-4 py-2.5 font-medium cursor-pointer select-none hover:text-text ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      <span className={`inline-flex items-center gap-1 ${sorted ? "text-text" : ""}`}>
        {children}
        {sorted === undefined ? (
          <ArrowUpDown size={11} className="opacity-50" />
        ) : sorted === "asc" ? (
          <ArrowUp size={11} />
        ) : (
          <ArrowDown size={11} />
        )}
      </span>
    </th>
  );
}

type IconBtnProps = {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  danger?: boolean;
  as?: "button" | "a";
  href?: string;
  target?: string;
  rel?: string;
};
function IconBtn({ children, onClick, title, danger, as = "button", href, target, rel }: IconBtnProps) {
  const cls = `p-1.5 rounded-md text-muted transition-colors ${
    danger ? "hover:text-danger hover:bg-danger/10" : "hover:text-text hover:bg-panel2"
  }`;
  if (as === "a") {
    return (
      <a href={href} target={target} rel={rel} title={title} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <button onClick={onClick} title={title} className={cls}>
      {children}
    </button>
  );
}
