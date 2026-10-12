import { useEffect, useState } from "react";

export type ToastType = "success" | "info" | "warning" | "error";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

const TOAST_EVENT = "iow-toast-event";

export const toast = {
  show(message: string, type: ToastType = "info", title?: string, duration = 3500) {
    if (typeof window === "undefined") return;
    const detail: ToastMessage = {
      id: `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type,
      title,
      message,
      duration,
    };
    window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail }));
  },
  success(message: string, title = "Success", duration = 3500) {
    this.show(message, "success", title, duration);
  },
  info(message: string, title?: string, duration = 3500) {
    this.show(message, "info", title, duration);
  },
  warning(message: string, title = "Notice", duration = 4000) {
    this.show(message, "warning", title, duration);
  },
  error(message: string, title = "Error", duration = 5000) {
    this.show(message, "error", title, duration);
  },
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<ToastMessage>;
      if (!customEvent.detail) return;
      const newToast = customEvent.detail;
      setToasts((prev) => [...prev, newToast]);

      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
        }, newToast.duration);
      }
    };

    window.addEventListener(TOAST_EVENT, handleToast);
    return () => window.removeEventListener(TOAST_EVENT, handleToast);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (!toasts.length) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-[150] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      {toasts.map((item) => {
        const isSuccess = item.type === "success";
        const isError = item.type === "error";
        const isWarning = item.type === "warning";

        const icon = isSuccess ? "✓" : isError ? "✕" : isWarning ? "⚠" : "ℹ";

        return (
          <div
            className="pointer-events-auto flex items-start gap-3 rounded-xl border border-black/15 bg-[#f8f5ed]/95 p-3.5 shadow-2xl backdrop-blur-md transition-all duration-200 animate-in slide-in-from-bottom-2 dark:border-white/15 dark:bg-[#20201d]/95 dark:text-[#f3f0e8]"
            key={item.id}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                isSuccess
                  ? "bg-[#3e6a59]"
                  : isError
                  ? "bg-red-600"
                  : isWarning
                  ? "bg-[#ef5a35]"
                  : "bg-[#171714] dark:bg-white dark:text-black"
              }`}
            >
              {icon}
            </span>

            <div className="flex-1 min-w-0 pr-1">
              {item.title && (
                <p className="font-serif text-sm font-bold leading-tight text-[#171714] dark:text-[#f3f0e8]">
                  {item.title}
                </p>
              )}
              <p className="mt-0.5 text-xs leading-relaxed text-black/70 dark:text-[#f3f0e8]/75">
                {item.message}
              </p>
            </div>

            <button
              className="text-black/35 hover:text-black text-sm px-1 dark:text-white/40 dark:hover:text-white transition"
              onClick={() => removeToast(item.id)}
              type="button"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
