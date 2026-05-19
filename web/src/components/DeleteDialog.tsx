import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Dialog } from "./Dialog";
import { api, ApiError, type Redirect } from "../api";
import { useToast } from "./Toast";

type Props = {
  open: boolean;
  target: Redirect | null;
  onClose: () => void;
};

export function DeleteDialog({ open, target, onClose }: Props) {
  const qc = useQueryClient();
  const toast = useToast();

  const mutation = useMutation({
    mutationFn: () => api.remove(target!.slug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["redirects"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      toast.success(`Deleted /${target!.slug}`);
      onClose();
    },
    onError: (err) => {
      if (err instanceof ApiError) toast.error(err.detail || `Delete failed (${err.status})`);
      else toast.error("Delete failed");
    },
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Delete redirect?"
      description="This cannot be undone."
      width={400}
      footer={
        <>
          <button onClick={onClose} className="px-3 py-1.5 rounded-md text-sm text-muted hover:text-text">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="px-3 py-1.5 rounded-md text-sm bg-danger hover:bg-danger/90 text-white inline-flex items-center gap-2 disabled:opacity-60"
          >
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
            Delete
          </button>
        </>
      }
    >
      {target && (
        <div className="rounded-md border border-border bg-panel2 px-3 py-2 text-sm">
          <div className="font-mono text-accent">/{target.slug}</div>
          <div className="text-xs text-muted truncate mt-0.5">→ {target.target_url}</div>
          <div className="text-xs text-muted mt-1">{target.hit_count.toLocaleString()} hits will be lost.</div>
        </div>
      )}
    </Dialog>
  );
}
