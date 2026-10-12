import { useState } from "react";
import QRCodeSvg from "./QRCodeSvg";
import { toast } from "./Toast";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  issueId: string;
  issueTitle: string;
  issueHeadline?: string;
  coverImage?: string;
}

export default function ShareModal({
  isOpen,
  onClose,
  issueId,
  issueTitle,
  issueHeadline = "Read the latest edition on the digital noticeboard.",
  coverImage = "https://images.unsplash.com/photo-1576495199011-eb94736d05d6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=85&w=1200",
}: ShareModalProps) {
  const [activePlatform, setActivePlatform] = useState<"twitter" | "slack" | "imessage">("twitter");
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "https://newsletter.singulr.tech";
  const readerPath = `/read/${issueId}`;
  const fullShareUrl = `${origin}${readerPath}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullShareUrl);
      setCopied(true);
      toast.success("Public reader link copied to clipboard!", "Link Copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy automatically. Please copy the URL manually.");
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: issueTitle,
          text: issueHeadline,
          url: fullShareUrl,
        });
      } catch {
        // Ignored or dismissed
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="my-8 w-full max-w-3xl rounded-2xl border border-black/15 bg-[#f8f5ed] p-6 shadow-2xl sm:p-8 dark:border-white/15 dark:bg-[#1a1916] dark:text-[#f3f0e8]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-black/10 pb-4 dark:border-white/10">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">
              Publishing & Distribution
            </span>
            <h2 className="mt-1 font-serif text-3xl font-bold tracking-tight">
              Share Edition
            </h2>
            <p className="mt-1 text-xs text-black/55 dark:text-white/60">
              Distribute the reader view or preview how it appears when shared on socials.
            </p>
          </div>
          <button
            className="text-2xl text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white transition"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        {/* Link & QR Section */}
        <div className="mt-6 grid gap-6 sm:grid-cols-[1.5fr_1fr]">
          <div className="flex flex-col justify-between rounded-xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-[#20201d]">
            <div>
              <label className="block font-mono text-[9px] font-bold uppercase tracking-wider text-black/50 dark:text-white/50 mb-1.5">
                Public Reader URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  className="w-full rounded-lg border border-black/15 bg-black/5 px-3 py-2 font-mono text-xs text-black dark:border-white/15 dark:bg-white/5 dark:text-white outline-none select-all"
                  readOnly
                  type="text"
                  value={fullShareUrl}
                />
                <button
                  className="shrink-0 rounded-lg bg-[#ef5a35] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#d44826] transition shadow-xs"
                  onClick={handleCopyLink}
                  type="button"
                >
                  {copied ? "✓ Copied" : "Copy"}
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                <a
                  className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#ef5a35] hover:underline"
                  href={readerPath}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span>Open Public Edition ↗</span>
                </a>
                <span className="text-black/30 dark:text-white/30">·</span>
                <button
                  className="text-[11px] font-semibold text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
                  onClick={handleNativeShare}
                  type="button"
                >
                  System Share Sheet
                </button>
              </div>
            </div>

            <div className="mt-4 border-t border-black/10 pt-3 text-[10px] text-black/50 dark:border-white/10 dark:text-white/50">
              Anyone with this link can view, read, and flip through pages without an editor account.
            </div>
          </div>

          {/* Quick Mobile Scan */}
          <div className="flex flex-col items-center justify-center rounded-xl border border-black/10 bg-white/70 p-4 text-center dark:border-white/10 dark:bg-[#20201d]">
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-black/50 dark:text-white/50 mb-2">
              Scan for Mobile Reading
            </span>
            <div className="rounded-lg border border-black/15 bg-white p-2 shadow-xs">
              <QRCodeSvg size={110} value={fullShareUrl} />
            </div>
            <span className="mt-2 text-[9px] text-black/45 dark:text-white/45">
              Live responsive layout
            </span>
          </div>
        </div>

        {/* Social Card Mockup Switcher */}
        <div className="mt-8">
          <div className="flex items-center justify-between border-b border-black/10 pb-2 dark:border-white/10">
            <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-black/50 dark:text-white/50">
              Social Link Preview (OpenGraph Mockup)
            </span>
            <div className="flex items-center gap-1 rounded-full border border-black/10 bg-black/5 p-0.5 dark:border-white/10 dark:bg-white/5">
              {(["twitter", "slack", "imessage"] as const).map((tab) => (
                <button
                  className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider transition ${
                    activePlatform === tab
                      ? "bg-[#171714] text-white dark:bg-white dark:text-black"
                      : "text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
                  }`}
                  key={tab}
                  onClick={() => setActivePlatform(tab)}
                  type="button"
                >
                  {tab === "twitter" ? "Twitter / X" : tab === "slack" ? "Slack" : "iMessage"}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex justify-center">
            {activePlatform === "twitter" && (
              <div className="w-full max-w-md overflow-hidden rounded-2xl border border-black/15 bg-white shadow-md dark:border-white/15 dark:bg-[#121210]">
                <img
                  alt="Social preview banner"
                  className="aspect-[1.91] w-full object-cover"
                  src={coverImage}
                />
                <div className="p-3.5">
                  <span className="text-[10px] text-black/40 dark:text-white/40">
                    newsletter.singulr.tech
                  </span>
                  <p className="font-serif text-sm font-bold text-black dark:text-white leading-snug mt-0.5">
                    {issueTitle}
                  </p>
                  <p className="mt-1 text-xs text-black/60 dark:text-white/60 line-clamp-2">
                    {issueHeadline}
                  </p>
                </div>
              </div>
            )}

            {activePlatform === "slack" && (
              <div className="w-full max-w-md rounded-lg border-l-4 border-[#ef5a35] bg-white p-3.5 shadow-sm dark:bg-[#20201d]">
                <span className="text-[11px] font-bold text-black/80 dark:text-white/80">
                  In Other Words
                </span>
                <p className="font-serif text-sm font-bold text-[#1264a3] dark:text-[#36c5f0] hover:underline cursor-pointer mt-0.5">
                  {issueTitle}
                </p>
                <p className="mt-1 text-xs text-black/70 dark:text-white/70">
                  {issueHeadline}
                </p>
                <img
                  alt="Slack preview attachment"
                  className="mt-2.5 max-h-36 rounded border border-black/10 object-cover"
                  src={coverImage}
                />
              </div>
            )}

            {activePlatform === "imessage" && (
              <div className="w-full max-w-xs overflow-hidden rounded-2xl border border-black/10 bg-[#e9e9eb] shadow-sm dark:border-white/10 dark:bg-[#2c2c2e]">
                <img
                  alt="iMessage preview"
                  className="aspect-[1.8] w-full object-cover"
                  src={coverImage}
                />
                <div className="p-3">
                  <p className="font-serif text-xs font-bold text-black dark:text-white">
                    {issueTitle}
                  </p>
                  <p className="mt-0.5 text-[10px] text-black/50 dark:text-white/50 truncate">
                    newsletter.singulr.tech
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            className="rounded-full bg-[#171714] px-5 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#ef5a35] dark:bg-white dark:text-black dark:hover:bg-[#ef5a35] dark:hover:text-white transition"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
