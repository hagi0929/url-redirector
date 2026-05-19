import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog } from "./Dialog";
import { api, ApiError, type Redirect } from "../api";
import { useToast } from "./Toast";
import { Loader2 } from "lucide-react";

type Props = {
  mode: "create" | "edit";
  open: boolean;
  initial?: Redirect | null;
  onClose: () => void;
};

const STATUSES = [301, 302, 303, 307, 308];

export function RedirectDialog({ mode, open, initial, onClose }: Props) {
  const qc = useQueryClient();
  const toast = useToast();
  const [slug, setSlug] = useState("");
  const [targetURL, setTargetURL] = useState("");
  const [statusCode, setStatusCode] = useState<number>(302);
  const [errors, setErrors] = useState<{ slug?: string; target_url?: string }>({});

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      setSlug(initial.slug);
      setTargetURL(initial.target_url);
      setStatusCode(initial.status_code || 302);
    } else {
      setSlug("");
      setTargetURL("");
      setStatusCode(302);
    }
    setErrors({});
  }, [open, mode, initial]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (mode === "create") {
        return api.create({ slug, target_url: targetURL, status_code: statusCode });
      }
      return api.update(initial!.slug, { target_url: targetURL, status_code: statusCode });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["redirects"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
      toast.success(mode === "create" ? `Created /${slug}` : `Updated /${initial!.slug}`);
      onClose();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        toast.error(err.detail || `Failed (${err.status})`);
      } else {
        toast.error("Request failed");
      }
    },
  });

  function validate(): boolean {
    const e: typeof errors = {};
    if (mode === "create") {
      if (!slug) e.slug = "Required";
      else if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(slug))
        e.slug = "Letters, digits, _ and - only. Must start with letter or digit.";
      else if (slug.length > 128) e.slug = "Max 128 characters";
    }
    if (!targetURL) e.target_url = "Required";
    else {
      try {
        const u = new URL(targetURL);
        if (!u.protocol.startsWith("http")) e.target_url = "Must be http(s) URL";
      } catch {
        e.target_url = "Invalid URL";
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function submit() {
    if (mutation.isPending) return;
    if (!validate()) return;
    mutation.mutate();
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={mode === "create" ? "New Redirect" : `Edit /${initial?.slug}`}
      description={mode === "create" ? "Create a new short link." : "Update the destination or status code."}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md text-sm text-muted hover:text-text"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={mutation.isPending}
            className="px-3 py-1.5 rounded-md text-sm bg-accent hover:bg-accent/90 text-white inline-flex items-center gap-2 disabled:opacity-60"
          >
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
            {mode === "create" ? "Create" : "Save"}
          </button>
        </>
      }
    >
      <form id="redirect-form" onSubmit={onSubmit} className="space-y-3">
        <Field label="Slug" hint={mode === "edit" ? "Slugs cannot be renamed." : "URL path segment. e.g. 'gh' → /gh"} error={errors.slug}>
          <input
            type="text"
            value={slug}
            disabled={mode === "edit"}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="gh"
            className="w-full bg-panel2 border border-border rounded-md px-3 py-2 text-sm font-mono outline-none focus:border-accent disabled:opacity-60"
            autoFocus={mode === "create"}
          />
        </Field>
        <Field label="Target URL" error={errors.target_url}>
          <input
            type="url"
            value={targetURL}
            onChange={(e) => setTargetURL(e.target.value)}
            placeholder="https://github.com"
            className="w-full bg-panel2 border border-border rounded-md px-3 py-2 text-sm font-mono outline-none focus:border-accent"
            autoFocus={mode === "edit"}
          />
        </Field>
        <Field label="Status Code" hint="301/308 = permanent. 302 (default) = temporary.">
          <div className="flex gap-1.5">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusCode(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-mono border transition-colors ${
                  statusCode === s
                    ? "bg-accent/15 border-accent/40 text-accent"
                    : "bg-panel2 border-border text-muted hover:text-text"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </Field>
      </form>
    </Dialog>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted mb-1.5">{label}</label>
      {children}
      {error ? (
        <div className="mt-1 text-xs text-danger">{error}</div>
      ) : hint ? (
        <div className="mt-1 text-xs text-muted">{hint}</div>
      ) : null}
    </div>
  );
}
