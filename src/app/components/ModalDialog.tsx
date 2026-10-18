import { useState, useEffect, useRef, createContext, useContext, ReactNode } from "react";

export interface AlertOptions {
  title: string;
  message?: string;
  confirmText?: string;
  tone?: "info" | "success" | "warning" | "danger";
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

export interface PromptOptions {
  title: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
}

type DialogConfig =
  | {
      type: "alert";
      options: AlertOptions;
      resolve: () => void;
    }
  | {
      type: "confirm";
      options: ConfirmOptions;
      resolve: (value: boolean) => void;
    }
  | {
      type: "prompt";
      options: PromptOptions;
      resolve: (value: string | null) => void;
    };

interface DialogContextValue {
  showAlert: (options: AlertOptions | string) => Promise<void>;
  showConfirm: (options: ConfirmOptions | string) => Promise<boolean>;
  showPrompt: (options: PromptOptions | string) => Promise<string | null>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

// Global dispatcher reference so functions can be called anywhere
let globalDialogDispatcher: DialogContextValue | null = null;

export const dialog = {
  alert: (options: AlertOptions | string): Promise<void> => {
    if (globalDialogDispatcher) {
      return globalDialogDispatcher.showAlert(options);
    }
    // Fallback if provider is not mounted
    window.alert(typeof options === "string" ? options : `${options.title}\n\n${options.message || ""}`);
    return Promise.resolve();
  },
  confirm: (options: ConfirmOptions | string): Promise<boolean> => {
    if (globalDialogDispatcher) {
      return globalDialogDispatcher.showConfirm(options);
    }
    const msg = typeof options === "string" ? options : `${options.title}\n\n${options.message || ""}`;
    return Promise.resolve(window.confirm(msg));
  },
  prompt: (options: PromptOptions | string): Promise<string | null> => {
    if (globalDialogDispatcher) {
      return globalDialogDispatcher.showPrompt(options);
    }
    const msg = typeof options === "string" ? options : `${options.title}\n\n${options.message || ""}`;
    const def = typeof options === "string" ? "" : options.defaultValue || "";
    return Promise.resolve(window.prompt(msg, def));
  },
};

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    return {
      showAlert: dialog.alert,
      showConfirm: dialog.confirm,
      showPrompt: dialog.prompt,
    };
  }
  return ctx;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [currentDialog, setCurrentDialog] = useState<DialogConfig | null>(null);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const showAlert = (options: AlertOptions | string): Promise<void> => {
    const opts: AlertOptions =
      typeof options === "string" ? { title: options } : options;
    return new Promise((resolve) => {
      setCurrentDialog({
        type: "alert",
        options: opts,
        resolve: () => {
          setCurrentDialog(null);
          resolve();
        },
      });
    });
  };

  const showConfirm = (options: ConfirmOptions | string): Promise<boolean> => {
    const opts: ConfirmOptions =
      typeof options === "string" ? { title: options } : options;
    return new Promise((resolve) => {
      setCurrentDialog({
        type: "confirm",
        options: opts,
        resolve: (val) => {
          setCurrentDialog(null);
          resolve(val);
        },
      });
    });
  };

  const showPrompt = (options: PromptOptions | string): Promise<string | null> => {
    const opts: PromptOptions =
      typeof options === "string" ? { title: options } : options;
    setInputValue(opts.defaultValue || "");
    return new Promise((resolve) => {
      setCurrentDialog({
        type: "prompt",
        options: opts,
        resolve: (val) => {
          setCurrentDialog(null);
          resolve(val);
        },
      });
    });
  };

  const contextValue: DialogContextValue = {
    showAlert,
    showConfirm,
    showPrompt,
  };

  // Register global proxy
  useEffect(() => {
    globalDialogDispatcher = contextValue;
    return () => {
      if (globalDialogDispatcher === contextValue) {
        globalDialogDispatcher = null;
      }
    };
  });

  // Focus prompt input when shown
  useEffect(() => {
    if (currentDialog?.type === "prompt") {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [currentDialog]);

  // Global keydown handler for Escape & Enter
  useEffect(() => {
    if (!currentDialog) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (currentDialog.type === "alert") {
          currentDialog.resolve();
        } else if (currentDialog.type === "confirm") {
          currentDialog.resolve(false);
        } else if (currentDialog.type === "prompt") {
          currentDialog.resolve(null);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentDialog]);

  const handleClose = () => {
    if (!currentDialog) return;
    if (currentDialog.type === "alert") {
      currentDialog.resolve();
    } else if (currentDialog.type === "confirm") {
      currentDialog.resolve(false);
    } else if (currentDialog.type === "prompt") {
      currentDialog.resolve(null);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentDialog) return;

    if (currentDialog.type === "alert") {
      currentDialog.resolve();
    } else if (currentDialog.type === "confirm") {
      currentDialog.resolve(true);
    } else if (currentDialog.type === "prompt") {
      currentDialog.resolve(inputValue.trim());
    }
  };

  return (
    <DialogContext.Provider value={contextValue}>
      {children}

      {/* Custom Editorial Dialog Modal Overlay */}
      {currentDialog && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onMouseDown={handleClose}
        >
          <div
            aria-modal="true"
            className="relative w-full max-w-md rounded-2xl border border-black/15 bg-[#f8f5ed] p-6 shadow-2xl dark:border-white/15 dark:bg-[#1a1a17] dark:text-[#f3f0e8]"
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
          >
            {/* Editorial Kicker */}
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">
                {currentDialog.type === "prompt"
                  ? "Input Required"
                  : currentDialog.type === "confirm"
                    ? (currentDialog.options as ConfirmOptions).danger
                      ? "Action Confirmation"
                      : "Confirmation"
                    : "Workspace Notice"}
              </span>

              <button
                aria-label="Close dialog"
                className="grid h-6 w-6 place-items-center rounded-full text-black/40 hover:bg-black/10 hover:text-black dark:text-[#f3f0e8]/40 dark:hover:bg-white/10 dark:hover:text-white"
                onClick={handleClose}
                type="button"
              >
                ✕
              </button>
            </div>

            {/* Dialog Title */}
            <h3 className="mt-2 font-serif text-2xl font-bold tracking-tight text-black dark:text-[#f3f0e8]">
              {currentDialog.options.title}
            </h3>

            {/* Dialog Message */}
            {currentDialog.options.message && (
              <p className="mt-2 text-xs leading-relaxed text-black/65 dark:text-[#f3f0e8]/75">
                {currentDialog.options.message}
              </p>
            )}

            {/* Form for Prompt or Buttons */}
            <form onSubmit={handleSubmit}>
              {currentDialog.type === "prompt" && (
                <div className="mt-4">
                  <input
                    className="w-full rounded-lg border border-black/15 bg-white px-3.5 py-2.5 text-sm font-medium text-black outline-none focus:border-[#ef5a35] dark:border-white/15 dark:bg-[#252521] dark:text-[#f3f0e8]"
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={(currentDialog.options as PromptOptions).placeholder || ""}
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 flex items-center justify-end gap-2.5">
                {currentDialog.type !== "alert" && (
                  <button
                    className="rounded-full border border-black/15 px-4 py-2 text-xs font-semibold text-black/70 hover:bg-black/5 dark:border-white/15 dark:text-[#f3f0e8]/70 dark:hover:bg-white/5"
                    onClick={handleClose}
                    type="button"
                  >
                    {(currentDialog.options as ConfirmOptions | PromptOptions).cancelText || "Cancel"}
                  </button>
                )}

                <button
                  className={`rounded-full px-5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition ${
                    currentDialog.type === "confirm" && (currentDialog.options as ConfirmOptions).danger
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-[#171714] hover:bg-[#ef5a35] dark:bg-[#ef5a35] dark:hover:bg-[#d44826]"
                  }`}
                  type="submit"
                >
                  {currentDialog.type === "alert"
                    ? (currentDialog.options as AlertOptions).confirmText || "OK"
                    : (currentDialog.options as ConfirmOptions | PromptOptions).confirmText ||
                      (currentDialog.type === "confirm" ? "Confirm" : "Save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}
