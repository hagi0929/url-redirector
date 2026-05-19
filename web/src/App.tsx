import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link2, Plus, RefreshCw, BookOpen } from "lucide-react";
import { api, type Redirect } from "./api";
import { StatsCards } from "./components/StatsCards";
import { TopList } from "./components/TopList";
import { RedirectsTable } from "./components/RedirectsTable";
import { RedirectDialog } from "./components/RedirectDialog";
import { DeleteDialog } from "./components/DeleteDialog";

export function App() {
  const [dialog, setDialog] = useState<
    { kind: "create" } | { kind: "edit"; target: Redirect } | { kind: "delete"; target: Redirect } | null
  >(null);

  const list = useQuery({ queryKey: ["redirects"], queryFn: api.list });
  const stats = useQuery({ queryKey: ["stats"], queryFn: api.stats, refetchInterval: 15_000 });

  function refresh() {
    list.refetch();
    stats.refetch();
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-panel/70 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="size-8 rounded-md bg-gradient-to-br from-accent to-accent2 inline-flex items-center justify-center shadow-card">
              <Link2 size={16} className="text-white" />
            </span>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">URL Redirector</h1>
              <p className="text-[11px] text-muted">Manage short links</p>
            </div>
          </div>
          <div className="flex-1" />
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-muted hover:text-text hover:bg-panel2"
          >
            <BookOpen size={14} />
            API Docs
          </a>
          <button
            onClick={refresh}
            disabled={list.isFetching || stats.isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-muted hover:text-text hover:bg-panel2 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={14} className={list.isFetching || stats.isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={() => setDialog({ kind: "create" })}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-accent hover:bg-accent/90 text-white"
          >
            <Plus size={14} />
            New
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        <StatsCards stats={stats.data} loading={stats.isLoading} />

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          <RedirectsTable
            items={list.data?.items ?? []}
            loading={list.isLoading}
            onEdit={(r) => setDialog({ kind: "edit", target: r })}
            onDelete={(r) => setDialog({ kind: "delete", target: r })}
          />
          <TopList items={stats.data?.top_slugs ?? []} loading={stats.isLoading} />
        </div>

        {(list.error || stats.error) && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 text-danger p-3 text-sm">
            Failed to load data. Check that the admin API is reachable.
          </div>
        )}
      </main>

      <RedirectDialog
        mode="create"
        open={dialog?.kind === "create"}
        onClose={() => setDialog(null)}
      />
      <RedirectDialog
        mode="edit"
        open={dialog?.kind === "edit"}
        initial={dialog?.kind === "edit" ? dialog.target : null}
        onClose={() => setDialog(null)}
      />
      <DeleteDialog
        open={dialog?.kind === "delete"}
        target={dialog?.kind === "delete" ? dialog.target : null}
        onClose={() => setDialog(null)}
      />
    </div>
  );
}
