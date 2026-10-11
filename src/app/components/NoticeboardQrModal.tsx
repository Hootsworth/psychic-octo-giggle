import { useState, useMemo } from "react";
import QRCodeSvg from "./QRCodeSvg";

export interface NoticeboardQrConfig {
  qrUrl?: string;
  qrEnabled?: boolean;
  qrLabel?: string;
  qrCampaign?: string;
  useTrackingParams?: boolean;
}

interface NoticeboardQrModalProps {
  initialConfig: NoticeboardQrConfig;
  sectionId: string;
  issueTitle?: string;
  onSave: (config: NoticeboardQrConfig) => void;
  onClose: () => void;
}

export default function NoticeboardQrModal({
  initialConfig,
  sectionId,
  issueTitle = "Campus Issue",
  onSave,
  onClose,
}: NoticeboardQrModalProps) {
  const [url, setUrl] = useState(
    initialConfig.qrUrl || "https://newsletter.singulr.tech/submit"
  );
  const [enabled, setEnabled] = useState(
    initialConfig.qrEnabled !== undefined ? initialConfig.qrEnabled : true
  );
  const [label, setLabel] = useState(
    initialConfig.qrLabel || "Scan to Submit Work"
  );
  const [campaign, setCampaign] = useState(
    initialConfig.qrCampaign ||
      issueTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24) ||
      "issue-submissions"
  );
  const [useTracking, setUseTracking] = useState(
    initialConfig.useTrackingParams !== undefined
      ? initialConfig.useTrackingParams
      : true
  );
  const [copied, setCopied] = useState(false);

  // Local scan count tracking
  const scanStorageKey = `iow-qr-scans-${sectionId}`;
  const [scanCount, setScanCount] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem(scanStorageKey) || "0", 10);
    } catch {
      return 0;
    }
  });

  // Compute final tracking URL
  const finalTrackedUrl = useMemo(() => {
    const raw = url.trim();
    if (!raw) return "https://newsletter.singulr.tech/submit";
    if (!useTracking) return raw;

    try {
      const parsed = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
      parsed.searchParams.set("utm_source", "newsletter_noticeboard");
      parsed.searchParams.set("utm_medium", "qr_code");
      if (campaign.trim()) {
        parsed.searchParams.set("utm_campaign", campaign.trim());
      }
      parsed.searchParams.set("ref", "noticeboard_qr");
      return parsed.toString();
    } catch {
      // If relative or non-standard
      const sep = raw.includes("?") ? "&" : "?";
      return `${raw}${sep}utm_source=newsletter_noticeboard&utm_medium=qr_code&utm_campaign=${encodeURIComponent(
        campaign.trim() || "issue"
      )}&ref=noticeboard_qr`;
    }
  }, [url, useTracking, campaign]);

  const handleCopy = () => {
    navigator.clipboard.writeText(finalTrackedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleTestLink = () => {
    const nextCount = scanCount + 1;
    setScanCount(nextCount);
    try {
      localStorage.setItem(scanStorageKey, String(nextCount));
    } catch {
      // ignore
    }
    window.open(finalTrackedUrl, "_blank", "noopener,noreferrer");
  };

  const handleResetScans = () => {
    setScanCount(0);
    try {
      localStorage.removeItem(scanStorageKey);
    } catch {
      // ignore
    }
  };

  const handleSave = () => {
    onSave({
      qrUrl: url.trim(),
      qrEnabled: enabled,
      qrLabel: label.trim(),
      qrCampaign: campaign.trim(),
      useTrackingParams: useTracking,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-black/15 bg-[#fbf9f4] p-6 shadow-2xl text-[#171714] dark:border-white/15 dark:bg-[#1f1e1b] dark:text-[#f3f0e8] sm:p-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-black/10 pb-4 dark:border-white/10">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">
              Noticeboard Tracking
            </span>
            <h2 className="mt-1 font-serif text-2xl sm:text-3xl font-bold tracking-tight">
              Submission QR Code Studio
            </h2>
            <p className="mt-1 text-xs text-black/60 dark:text-[#f3f0e8]/60">
              Generate tracked QR codes for student submissions, pitches, and letters to the editor.
            </p>
          </div>
          <button
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full text-lg text-black/40 hover:bg-black/10 hover:text-black dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_170px]">
          {/* Controls */}
          <div className="space-y-4 text-xs">
            {/* Enable switch */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                checked={enabled}
                className="h-4 w-4 rounded border-black/20 text-[#ef5a35] focus:ring-[#ef5a35]"
                onChange={(e) => setEnabled(e.target.checked)}
                type="checkbox"
              />
              <span className="font-semibold">Display QR Code in Noticeboard</span>
            </label>

            {/* Target URL */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-black/60 dark:text-white/60">
                Destination Link URL
              </label>
              <input
                className="mt-1.5 w-full rounded-lg border border-black/20 bg-white px-3 py-2 text-xs text-[#171714] shadow-sm focus:border-[#ef5a35] focus:outline-none focus:ring-1 focus:ring-[#ef5a35] dark:border-white/20 dark:bg-black/30 dark:text-[#f3f0e8]"
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://forms.gle/... or https://university.edu/submit"
                type="url"
                value={url}
              />
              <p className="mt-1 text-[10px] text-black/45 dark:text-white/45">
                Paste your Google Form, Typeform, Airtable, or submission page link.
              </p>
            </div>

            {/* QR Label */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-black/60 dark:text-white/60">
                Call-To-Action Caption
              </label>
              <input
                className="mt-1.5 w-full rounded-lg border border-black/20 bg-white px-3 py-2 text-xs text-[#171714] shadow-sm focus:border-[#ef5a35] focus:outline-none focus:ring-1 focus:ring-[#ef5a35] dark:border-white/20 dark:bg-black/30 dark:text-[#f3f0e8]"
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Scan to Submit Work"
                type="text"
                value={label}
              />
            </div>

            {/* Tracking Settings */}
            <div className="rounded-xl border border-black/10 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.02]">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  checked={useTracking}
                  className="h-3.5 w-3.5 rounded text-[#ef5a35] focus:ring-[#ef5a35]"
                  onChange={(e) => setUseTracking(e.target.checked)}
                  type="checkbox"
                />
                <span className="font-semibold text-[11px]">
                  Append Automated UTM Tracking
                </span>
              </label>

              {useTracking && (
                <div className="mt-2.5 pl-6">
                  <label className="block text-[10px] font-medium text-black/60 dark:text-white/60">
                    Campaign / Issue Identifier:
                  </label>
                  <input
                    className="mt-1 w-full rounded border border-black/15 bg-white px-2 py-1 text-[11px] dark:border-white/15 dark:bg-black/40"
                    onChange={(e) => setCampaign(e.target.value)}
                    placeholder="issue-08"
                    type="text"
                    value={campaign}
                  />
                  <span className="mt-1 block text-[9px] text-black/40 dark:text-white/40">
                    Tracks incoming visits as <code>utm_source=newsletter_noticeboard</code>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* QR Preview Column */}
          <div className="flex flex-col items-center justify-between rounded-xl border border-black/10 bg-white p-4 text-center dark:border-white/10 dark:bg-black/20">
            <div className="w-full">
              <span className="text-[9px] font-bold uppercase tracking-wider text-black/40 dark:text-white/40">
                Live QR Preview
              </span>
              <div className="mt-2 grid place-items-center rounded-lg border border-black/10 bg-[#f8f5ed] p-2 dark:border-white/10 dark:bg-white">
                <QRCodeSvg
                  fgColor="#171714"
                  size={120}
                  title="Noticeboard Submission QR"
                  value={finalTrackedUrl}
                />
              </div>
              <p className="mt-2 font-serif text-[11px] font-medium text-black/75 dark:text-white/80 truncate">
                {label}
              </p>
            </div>

            {/* Scan Count Meter */}
            <div className="mt-3 w-full border-t border-black/10 pt-2 text-center dark:border-white/10">
              <span className="text-[9px] font-bold uppercase text-black/50 dark:text-white/50">
                Logged Scans
              </span>
              <p className="font-serif text-lg font-bold text-[#ef5a35]">
                {scanCount}
              </p>
              <div className="mt-1 flex items-center justify-center gap-2 text-[9px]">
                <button
                  className="text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white underline"
                  onClick={handleTestLink}
                  type="button"
                >
                  Test Link ↗
                </button>
                <span>·</span>
                <button
                  className="text-black/40 hover:text-red-500 dark:text-white/40"
                  onClick={handleResetScans}
                  type="button"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Computed Tracking URL pill */}
        <div className="mt-5 rounded-xl border border-black/10 bg-black/5 p-3 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-bold uppercase tracking-wider text-black/50 dark:text-white/50">
              Full Tracked URL
            </span>
            <button
              className="text-[9px] font-bold uppercase tracking-wider text-[#ef5a35] hover:underline"
              onClick={handleCopy}
              type="button"
            >
              {copied ? "✓ Copied!" : "Copy Link"}
            </button>
          </div>
          <p className="mt-1 font-mono text-[10px] text-black/70 dark:text-white/70 break-all select-all">
            {finalTrackedUrl}
          </p>
        </div>

        {/* Action Footer */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-black/10 pt-4 dark:border-white/10">
          <button
            className="rounded-full border border-black/20 px-5 py-2 text-xs font-semibold text-black/70 hover:bg-black/5 dark:border-white/20 dark:text-white/70 dark:hover:bg-white/5 transition"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-full bg-[#171714] px-6 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#ef5a35] dark:bg-white dark:text-[#171714] dark:hover:bg-[#ef5a35] dark:hover:text-white shadow-md transition"
            onClick={handleSave}
            type="button"
          >
            Apply to Noticeboard
          </button>
        </div>
      </div>
    </div>
  );
}
