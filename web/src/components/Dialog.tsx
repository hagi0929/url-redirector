import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
};

export function Dialog({ open, onClose, title, description, children, footer, width = 480 }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const handler = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    el.addEventListener("cancel", handler);
    return () => el.removeEventListener("cancel", handler);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div
        className="rounded-2xl border border-border bg-panel shadow-card overflow-hidden"
        style={{ width: Math.min(width, window.innerWidth - 32) }}
      >
        <div className="flex items-start justify-between px-5 pt-4 pb-3">
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-text -mt-1 -mr-1 p-1 rounded-md hover:bg-panel2"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 pb-4">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-border bg-panel2/40 flex justify-end gap-2">{footer}</div>}
      </div>
    </dialog>
  );
}
