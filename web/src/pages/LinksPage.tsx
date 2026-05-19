import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import { LinksTable } from "../components/LinksTable";

export function LinksPage() {
  const list = useQuery({ queryKey: ["redirects"], queryFn: api.list, refetchInterval: 15_000 });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Links</h2>
        <p className="text-xs text-muted mt-0.5">
          Click any cell to edit. Use the row at the top to add a new redirect.
        </p>
      </div>
      <LinksTable items={list.data?.items ?? []} loading={list.isLoading} />
      {list.error && (
        <div className="rounded-lg border border-danger/30 bg-danger/10 text-danger p-3 text-sm">
          Failed to load redirects.
        </div>
      )}
    </div>
  );
}
