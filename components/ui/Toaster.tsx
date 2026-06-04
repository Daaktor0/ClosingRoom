"use client";

import { ShieldAlert, X } from "lucide-react";
import { useDealStore } from "@/lib/store";

export function Toaster() {
  const toasts = useDealStore((state) => state.toasts);
  const dismissToast = useDealStore((state) => state.dismissToast);

  if (!toasts.length) return null;

  return (
    <div className="fixed right-4 top-4 z-50 grid w-[min(28rem,calc(100vw-2rem))] gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className="rounded-md border border-red-700/30 bg-red-700/10 p-4 text-sm text-[var(--danger)] shadow-xl backdrop-blur"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert size={18} className="mt-0.5 shrink-0" aria-hidden />
            <div className="min-w-0">
              <p className="font-semibold">{toast.title}</p>
              <p className="mt-1 leading-relaxed">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="ml-auto rounded p-1 text-[var(--danger)] transition hover:bg-red-700/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--danger)]"
              aria-label="Dismiss notification"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
