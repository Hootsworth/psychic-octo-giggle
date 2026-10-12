interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  const sections = [
    {
      category: "History & Document Flow",
      shortcuts: [
        { keys: ["⌘", "Z"], desc: "Undo last edit or layout change" },
        { keys: ["⌘", "⇧", "Z"], desc: "Redo previously undone change" },
        { keys: ["⌘", "S"], desc: "Instant force-save to storage & peer sync" },
        { keys: ["⌘", "P"], desc: "Toggle clean reader preview mode" },
      ],
    },
    {
      category: "Page & Navigation",
      shortcuts: [
        { keys: ["1", "2", "3"], desc: "Jump directly to page number" },
        { keys: ["Esc"], desc: "Close open modals, drawers, or menus" },
        { keys: ["?", "or", "⌘", "/"], desc: "Show / hide this shortcuts cheat sheet" },
      ],
    },
    {
      category: "Section Controls & Layout",
      shortcuts: [
        { keys: ["Alt", "↑"], desc: "Move focused section up" },
        { keys: ["Alt", "↓"], desc: "Move focused section down" },
        { keys: ["⌘", "D"], desc: "Duplicate highlighted section" },
        { keys: ["W"], desc: "Cycle section column span (1/3 → 1/2 → 2/3 → Full)" },
      ],
    },
    {
      category: "Smart Writing Mode",
      shortcuts: [
        { keys: ["/"], desc: "Trigger slash command menu in source editor" },
        { keys: ["↑", "↓"], desc: "Navigate slash command suggestions" },
        { keys: ["Enter"], desc: "Insert chosen section block template" },
      ],
    },
  ];

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-black/15 bg-[#f8f5ed] p-6 shadow-2xl sm:p-8 dark:border-white/15 dark:bg-[#1a1916] dark:text-[#f3f0e8]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-black/10 pb-4 dark:border-white/10">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">
              Editorial Reference Desk
            </span>
            <h2 className="mt-1 font-serif text-3xl font-bold tracking-tight">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            className="text-2xl text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white transition"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {sections.map((sec) => (
            <div key={sec.category}>
              <h3 className="font-mono text-[9px] font-bold uppercase tracking-wider text-black/50 dark:text-white/50 mb-3">
                {sec.category}
              </h3>
              <div className="space-y-2.5">
                {sec.shortcuts.map((sc, i) => (
                  <div
                    className="flex items-center justify-between gap-3 text-xs"
                    key={i}
                  >
                    <span className="text-black/75 dark:text-[#f3f0e8]/80 text-[11px]">
                      {sc.desc}
                    </span>
                    <div className="flex shrink-0 items-center gap-1 font-mono">
                      {sc.keys.map((k, ki) =>
                        k === "or" ? (
                          <span
                            className="text-[9px] text-black/40 dark:text-white/40 px-0.5"
                            key={ki}
                          >
                            or
                          </span>
                        ) : (
                          <kbd
                            className="rounded border border-black/20 bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold text-black/80 shadow-2xs dark:border-white/20 dark:bg-[#2b2b27] dark:text-white"
                            key={ki}
                          >
                            {k}
                          </kbd>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-black/10 pt-4 text-[10px] text-black/50 dark:border-white/10 dark:text-white/50">
          <p>
            Pro-tip: Press <kbd className="font-mono font-semibold">?</kbd> at any time to toggle this window.
          </p>
          <button
            className="rounded-full bg-[#171714] px-4 py-1.5 font-bold uppercase tracking-wider text-white hover:bg-[#ef5a35] dark:bg-white dark:text-black dark:hover:bg-[#ef5a35] dark:hover:text-white transition"
            onClick={onClose}
            type="button"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
