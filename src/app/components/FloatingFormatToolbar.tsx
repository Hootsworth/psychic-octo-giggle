import { useEffect, useState, useRef, useCallback } from "react";

interface FloatingFormatToolbarProps {
  onAiRewrite?: (selectedText: string) => void;
  paletteAccent?: string;
}

interface ToolbarPosition {
  top: number;
  left: number;
}

interface ActiveFormats {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  isLink: boolean;
  linkHref?: string;
  isHeading: boolean;
}

export default function FloatingFormatToolbar({
  onAiRewrite,
  paletteAccent = "#ef5a35",
}: FloatingFormatToolbarProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<ToolbarPosition>({ top: -9999, left: -9999 });
  const [selectedText, setSelectedText] = useState("");
  const [activeFormats, setActiveFormats] = useState<ActiveFormats>({
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    isLink: false,
    isHeading: false,
  });
  const [isLinkInputOpen, setIsLinkInputOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const toolbarRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);

  // Check current selection and position toolbar
  const updateToolbar = useCallback(() => {
    if (isLinkInputOpen) return; // Keep toolbar in place while typing link URL

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) {
      setVisible(false);
      setSelectedText("");
      return;
    }

    const text = selection.toString().trim();
    if (!text) {
      setVisible(false);
      setSelectedText("");
      return;
    }

    // Verify selection is within an editable element in #pdf-document or an active contentEditable
    const anchor = selection.anchorNode instanceof Element ? selection.anchorNode : selection.anchorNode?.parentElement;
    const editableEl = anchor?.closest("#pdf-document .editable, [contenteditable='true']");
    if (!editableEl) {
      setVisible(false);
      setSelectedText("");
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setVisible(false);
      return;
    }

    savedRangeRef.current = range.cloneRange();
    setSelectedText(text);

    // Calculate active formats
    const isBold = document.queryCommandState("bold");
    const isItalic = document.queryCommandState("italic");
    const isUnderline = document.queryCommandState("underline");
    const isStrike = document.queryCommandState("strikeThrough");
    const linkEl = anchor?.closest("a");
    const isLink = !!linkEl;
    const linkHref = linkEl ? linkEl.getAttribute("href") ?? "" : "";
    const parentHeading = anchor?.closest("h1, h2, h3, h4");
    const isHeading = !!parentHeading;

    setActiveFormats({
      bold: isBold,
      italic: isItalic,
      underline: isUnderline,
      strike: isStrike,
      isLink,
      linkHref,
      isHeading,
    });

    // Toolbar width estimate for centering
    const toolbarWidth = 360;
    const toolbarHeight = 44;

    let left = rect.left + rect.width / 2 - toolbarWidth / 2;
    // Boundary check for horizontal screen edges
    const padding = 12;
    if (left < padding) left = padding;
    if (left + toolbarWidth > window.innerWidth - padding) {
      left = window.innerWidth - toolbarWidth - padding;
    }

    // Position above selection if there's room, otherwise below
    let top = rect.top - toolbarHeight - 10;
    if (top < 65) {
      top = rect.bottom + 10;
    }

    setPosition({ top, left });
    setVisible(true);
  }, [isLinkInputOpen]);

  useEffect(() => {
    const handleSelectionChange = () => {
      // Debounce slightly to allow smooth dragging/selection
      window.requestAnimationFrame(() => {
        updateToolbar();
      });
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    window.addEventListener("resize", updateToolbar);
    window.addEventListener("scroll", updateToolbar, true);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      window.removeEventListener("resize", updateToolbar);
      window.removeEventListener("scroll", updateToolbar, true);
    };
  }, [updateToolbar]);

  // Execute standard formatting commands and notify canvas to auto-save & sync
  const executeCommand = (command: string, value: string | undefined = undefined) => {
    // Restore selection if needed
    if (savedRangeRef.current) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedRangeRef.current);
      }
    }

    document.execCommand(command, false, value);

    // Find active editable element and fire an input event so multiplayer sync + local storage triggers
    const selection = window.getSelection();
    const anchor = selection?.anchorNode instanceof Element ? selection.anchorNode : selection?.anchorNode?.parentElement;
    const editableEl = anchor?.closest(".editable, [contenteditable='true']");
    if (editableEl) {
      editableEl.dispatchEvent(new Event("input", { bubbles: true }));
    }

    updateToolbar();
  };

  const handleApplyLink = () => {
    if (!linkUrl.trim()) {
      setIsLinkInputOpen(false);
      return;
    }

    let url = linkUrl.trim();
    if (!/^https?:\/\//i.test(url) && !url.startsWith("mailto:") && !url.startsWith("#")) {
      url = `https://${url}`;
    }

    if (savedRangeRef.current) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(savedRangeRef.current);
      }
    }

    executeCommand("createLink", url);

    // Ensure link opens in new tab and has clean style
    const selection = window.getSelection();
    const anchor = selection?.anchorNode instanceof Element ? selection.anchorNode : selection?.anchorNode?.parentElement;
    const newLink = anchor?.closest("a");
    if (newLink) {
      newLink.setAttribute("target", "_blank");
      newLink.setAttribute("rel", "noopener noreferrer");
      newLink.style.textDecoration = "underline";
      newLink.style.color = paletteAccent;
    }

    setIsLinkInputOpen(false);
    setLinkUrl("");
  };

  const handleUnlink = () => {
    executeCommand("unlink");
    setActiveFormats((prev) => ({ ...prev, isLink: false, linkHref: undefined }));
  };

  const handleToggleHeading = () => {
    if (activeFormats.isHeading) {
      executeCommand("formatBlock", "<p>");
    } else {
      executeCommand("formatBlock", "<h2>");
    }
  };

  const handleHighlight = () => {
    // Toggle a subtle yellow marker highlight
    executeCommand("hiliteColor", "#fef08a");
  };

  if (!visible) return null;

  return (
    <div
      aria-label="Inline text formatting toolbar"
      className="editor-floating-toolbar fixed z-50 flex items-center gap-0.5 rounded-full border border-black/15 bg-[#171714] p-1 text-white shadow-2xl backdrop-blur-md transition-opacity duration-150 animate-in fade-in zoom-in-95 dark:border-white/20 dark:bg-[#1a1916]"
      ref={toolbarRef}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      {isLinkInputOpen ? (
        <div className="flex items-center gap-1.5 px-2 py-0.5">
          <svg className="h-3.5 w-3.5 text-white/50" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <input
            autoFocus
            className="w-48 bg-transparent text-xs text-white placeholder-white/40 outline-none"
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleApplyLink();
              }
              if (e.key === "Escape") {
                setIsLinkInputOpen(false);
              }
            }}
            placeholder="Paste URL (e.g. https://...)"
            ref={linkInputRef}
            type="url"
            value={linkUrl}
          />
          <button
            className="rounded bg-[#ef5a35] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white hover:bg-[#d44826]"
            onClick={handleApplyLink}
            type="button"
          >
            Apply
          </button>
          <button
            className="px-1 text-xs text-white/50 hover:text-white"
            onClick={() => setIsLinkInputOpen(false)}
            type="button"
          >
            ✕
          </button>
        </div>
      ) : (
        <>
          {/* Bold */}
          <button
            aria-label="Bold"
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition hover:bg-white/20 ${activeFormats.bold ? "bg-[#ef5a35] text-white" : "text-white/80"}`}
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("bold");
            }}
            title="Bold (⌘B)"
            type="button"
          >
            <strong>B</strong>
          </button>

          {/* Italic */}
          <button
            aria-label="Italic"
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-serif italic transition hover:bg-white/20 ${activeFormats.italic ? "bg-[#ef5a35] text-white" : "text-white/80"}`}
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("italic");
            }}
            title="Italic (⌘I)"
            type="button"
          >
            <em>I</em>
          </button>

          {/* Underline */}
          <button
            aria-label="Underline"
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs underline transition hover:bg-white/20 ${activeFormats.underline ? "bg-[#ef5a35] text-white" : "text-white/80"}`}
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("underline");
            }}
            title="Underline (⌘U)"
            type="button"
          >
            <u>U</u>
          </button>

          {/* Strikethrough */}
          <button
            aria-label="Strikethrough"
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs line-through transition hover:bg-white/20 ${activeFormats.strike ? "bg-[#ef5a35] text-white" : "text-white/80"}`}
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("strikeThrough");
            }}
            title="Strikethrough"
            type="button"
          >
            S
          </button>

          <span className="mx-0.5 h-4 w-px bg-white/20" />

          {/* Heading Toggle */}
          <button
            aria-label="Toggle Heading"
            className={`flex h-7 px-2 items-center justify-center rounded-full text-[10px] font-bold uppercase tracking-wider transition hover:bg-white/20 ${activeFormats.isHeading ? "bg-[#ef5a35] text-white" : "text-white/80"}`}
            onMouseDown={(e) => {
              e.preventDefault();
              handleToggleHeading();
            }}
            title="Heading / Paragraph"
            type="button"
          >
            H2
          </button>

          {/* Link / Unlink */}
          {activeFormats.isLink ? (
            <button
              aria-label="Remove Link"
              className="flex h-7 items-center gap-1 rounded-full bg-white/20 px-2 text-[10px] font-medium text-white transition hover:bg-red-500/80"
              onMouseDown={(e) => {
                e.preventDefault();
                handleUnlink();
              }}
              title={`Remove Link (${activeFormats.linkHref})`}
              type="button"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Unlink</span>
            </button>
          ) : (
            <button
              aria-label="Insert Link"
              className="flex h-7 w-7 items-center justify-center rounded-full text-white/80 transition hover:bg-white/20"
              onMouseDown={(e) => {
                e.preventDefault();
                setLinkUrl("");
                setIsLinkInputOpen(true);
              }}
              title="Insert Link"
              type="button"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}

          {/* Highlight Marker */}
          <button
            aria-label="Highlight Text"
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/80 transition hover:bg-white/20"
            onMouseDown={(e) => {
              e.preventDefault();
              handleHighlight();
            }}
            title="Highlight Text"
            type="button"
          >
            <span className="rounded bg-[#fef08a] px-1 font-mono text-[9px] font-bold text-black">A</span>
          </button>

          <span className="mx-0.5 h-4 w-px bg-white/20" />

          {/* Alignment */}
          <button
            aria-label="Align Left"
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/80 transition hover:bg-white/20"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("justifyLeft");
            }}
            title="Align Left"
            type="button"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M4 6h16M4 12h10M4 18h14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <button
            aria-label="Align Center"
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/80 transition hover:bg-white/20"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("justifyCenter");
            }}
            title="Align Center"
            type="button"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M4 6h16M7 12h10M5 18h14" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Clear Formatting */}
          <button
            aria-label="Clear Formatting"
            className="flex h-7 w-7 items-center justify-center rounded-full text-white/60 transition hover:bg-white/20 hover:text-white"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand("removeFormat");
            }}
            title="Clear Formatting"
            type="button"
          >
            <span className="text-[11px] font-mono">T̸</span>
          </button>

          {/* AI Rewrite Action */}
          {onAiRewrite && selectedText && (
            <>
              <span className="mx-0.5 h-4 w-px bg-white/20" />
              <button
                className="flex h-7 items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ef5a35] to-[#f97316] px-2.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm transition hover:brightness-110"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onAiRewrite(selectedText);
                }}
                title="Rewrite selection with AI"
                type="button"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
                <span>AI</span>
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
