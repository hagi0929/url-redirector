import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";

type ToastKind = "success" | "error";
type Toast = { id: number; kind: ToastKind; message: string };

type ToastCtx = {
  push: (kind: ToastKind, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

export function useToast() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useToast outside provider");
  return v;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const value: ToastCtx = {
    push,
    success: (m) => push("success", m),
    error: (m) => push("error", m),
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => setToasts((arr) => arr.filter((x) => x.id !== t.id))} />
        ))}
      </div>
    </Ctx.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const [enter, setEnter] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setEnter(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const Icon = toast.kind === "success" ? CheckCircle2 : AlertTriangle;
  const tone =
    toast.kind === "success"
      ? "border-success/30 bg-success/10 text-success"
      : "border-danger/30 bg-danger/10 text-danger";
  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-card backdrop-blur-md transition-all duration-200 ${tone} ${
        enter ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
      style={{ minWidth: 280, maxWidth: 420 }}
    >
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div className="flex-1 text-sm text-text">{toast.message}</div>
      <button onClick={onClose} className="opacity-60 hover:opacity-100">
        <X size={16} />
      </button>
    </div>
  );
}
