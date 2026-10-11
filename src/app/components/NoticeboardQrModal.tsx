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

const PRESETS = [
  {
    name: "Submissions Form",
    url: "https://newsletter.singulr.tech/submit",
    label: "Scan to Submit Writing & Art",
    campaign: "submissions",
  },
  {
    name: "Pitch a Story",
    url: "https://newsletter.singulr.tech/pitches",
    label: "Pitch an Article or Story",
    campaign: "pitches",
  },
  {
    name: "Letters to Editor",
    url: "https://newsletter.singulr.tech/letters",
    label: "Send a Letter to the Editor",
    campaign: "letters",
  },
  {
    name: "Staff Application",
    url: "https://newsletter.singulr.tech/join",
    label: "Join the Editorial Staff",
    campaign: "recruitment",
  },
];

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
      const sep = raw.includes("?") ? "&" : "?";
      return `${raw}${sep}utm_source=newsletter_noticeboard&utm_medium=qr_code&utm_campaign=${encodeURIComponent(
        campaign.trim() || "issue"
      )}&ref=noticeboard_qr`;
    }
  }, [url, useTracking, campaign]);

  const handleCopy = () => {
    navigator.clipboard.writeText(finalTrackedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  const applyPreset = (preset: (typeof PRESETS)[0]) => {
    setUrl(preset.url);
    setLabel(preset.label);
    setCampaign(preset.campaign);
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 sm:p-6 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        aria-modal="true"
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-black/15 bg-[#f8f5ed] p-6 shadow-2xl text-[#171714] dark:border-white/15 dark:bg-[#1a1a17] dark:text-[#f3f0e8] sm:p-8"
        role="dialog"
      >
        {/* Subtle Newspaper Masthead Header */}
        <div className="flex items-start justify-between border-b border-black/15 pb-5 dark:border-white/15">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-[0.24em] text-[#ef5a35]">
                Noticeboard // Circulation Desk
              </span>
              <span className="hidden sm:inline-block text-[9px] font-mono text-black/30 dark:text-white/30">
                · REF // {sectionId}
              </span>
            </div>
            <h2 className="mt-1 font-serif text-3xl sm:text-4xl font-bold tracking-tight text-black dark:text-[#f3f0e8]">
              Submission QR Studio
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-black/60 dark:text-[#f3f0e8]/65 font-sans">
              Print a verified scannable route for student submissions, pitches, and tracked correspondence.
            </p>
          </div>
          <button
            aria-label="Close"
            className="grid h-7 w-7 place-items-center rounded-full border border-black/15 text-sm text-black/40 hover:border-[#ef5a35] hover:text-[#ef5a35] dark:border-white/15 dark:text-white/40 dark:hover:border-[#ef5a35] dark:hover:text-[#ef5a35] transition"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        {/* Editorial Presets Bar */}
        <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1 text-[9px]">
          <span className="shrink-0 font-bold uppercase tracking-wider text-black/40 dark:text-white/40">
            Presets:
          </span>
          {PRESETS.map((preset) => (
            <button
              className="shrink-0 rounded-full border border-black/15 bg-white/60 px-3 py-1 font-semibold text-black/75 transition hover:border-[#ef5a35] hover:bg-white hover:text-[#ef5a35] dark:border-white/15 dark:bg-[#242420] dark:text-white/75 dark:hover:border-[#ef5a35] dark:hover:text-[#ef5a35]"
              key={preset.name}
              onClick={() => applyPreset(preset)}
              type="button"
            >
              {preset.name}
            </button>
          ))}
        </div>

        {/* Content Body: Left Controls & Right Stamp Preview */}
        <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_210px]">
          {/* Controls Column */}
          <div className="space-y-4 text-xs">
            {/* Display Switch styled as editorial toggle */}
            <div className="flex items-center justify-between rounded-xl border border-black/10 bg-white/50 p-3 dark:border-white/10 dark:bg-[#22221e]">
              <div>
                <p className="text-xs font-semibold">Display in Noticeboard</p>
                <p className="text-[10px] text-black/50 dark:text-white/50">
                  Render scannable barcode stamp in this section
                </p>
              </div>
              <button
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  enabled ? "bg-[#ef5a35]" : "bg-black/20 dark:bg-white/20"
                }`}
                onClick={() => setEnabled(!enabled)}
                role="switch"
                type="button"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    enabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Destination URL */}
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-[0.16em] text-black/60 dark:text-white/60">
                Destination Link URL
              </label>
              <input
                className="mt-1.5 w-full rounded-xl border border-black/15 bg-white/80 px-3.5 py-2 text-xs text-[#171714] placeholder:text-black/30 shadow-xs focus:border-[#ef5a35] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#ef5a35] dark:border-white/15 dark:bg-[#252520] dark:text-[#f3f0e8] dark:placeholder:text-white/30"
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://forms.gle/... or https://university.edu/submit"
                type="url"
                value={url}
              />
              <p className="mt-1 text-[9.5px] text-black/45 dark:text-white/45">
                Paste your submission form, Typeform, Airtable, or drive link.
              </p>
            </div>

            {/* Call-to-action Caption */}
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-[0.16em] text-black/60 dark:text-white/60">
                Notice Caption / Call-To-Action
              </label>
              <input
                className="mt-1.5 w-full rounded-xl border border-black/15 bg-white/80 px-3.5 py-2 text-xs text-[#171714] shadow-xs focus:border-[#ef5a35] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#ef5a35] dark:border-white/15 dark:bg-[#252520] dark:text-[#f3f0e8]"
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Scan to Submit Work"
                type="text"
                value={label}
              />
            </div>

            {/* Automated Attribution & UTM Tracking */}
            <div className="rounded-xl border border-black/10 bg-white/40 p-3.5 dark:border-white/10 dark:bg-[#22221e]">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  checked={useTracking}
                  className="h-3.5 w-3.5 rounded border-black/25 text-[#ef5a35] focus:ring-[#ef5a35] dark:border-white/25"
                  onChange={(e) => setUseTracking(e.target.checked)}
                  type="checkbox"
                />
                <span className="text-[10px] font-bold uppercase tracking-wider text-black/80 dark:text-white/80">
                  Append Editorial UTM Attribution
                </span>
              </label>

              {useTracking && (
                <div className="mt-3 pl-6">
                  <label className="block text-[9px] font-medium text-black/55 dark:text-white/55 uppercase tracking-wider">
                    Issue / Campaign Identifier:
                  </label>
                  <input
                    className="mt-1 w-full rounded-lg border border-black/15 bg-white px-2.5 py-1.5 font-mono text-[11px] text-black/80 shadow-xs dark:border-white/15 dark:bg-[#1a1a17] dark:text-white/80"
                    onChange={(e) => setCampaign(e.target.value)}
                    placeholder="issue-submissions"
                    type="text"
                    value={campaign}
                  />
                  <span className="mt-1 block text-[9px] text-black/40 dark:text-white/40 font-mono">
                    Tagged as utm_source=newsletter_noticeboard
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Authentic Letterpress QR Stamp Preview */}
          <div className="flex flex-col items-center justify-between rounded-2xl border border-black/15 bg-[#f4efe2] p-4 text-center shadow-xs dark:border-white/15 dark:bg-[#23221e]">
            <div className="w-full">
              <div className="flex items-center justify-between border-b border-black/10 pb-2 dark:border-white/10">
                <span className="font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">
                  Stamp // QR-01
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#ef5a35]" />
              </div>

              {/* QR Image Frame */}
              <div className="mt-3 grid place-items-center rounded-xl border border-black/15 bg-white p-2.5 shadow-sm">
                <QRCodeSvg
                  bgColor="#ffffff"
                  fgColor="#171714"
                  size={128}
                  title="Noticeboard Submission QR"
                  value={finalTrackedUrl}
                />
              </div>

              <p className="mt-3 font-serif text-xs font-semibold text-black/85 dark:text-white/90 line-clamp-2">
                "{label || "Scan to Submit"}"
              </p>
              <p className="mt-0.5 font-mono text-[8.5px] text-black/45 dark:text-white/45 truncate">
                {finalTrackedUrl.replace(/^https?:\/\//, "")}
              </p>
            </div>

            {/* Circulation Counter */}
            <div className="mt-4 w-full border-t border-black/10 pt-3 dark:border-white/10">
              <span className="block font-mono text-[8px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50">
                Reader Scan Tally
              </span>
              <p className="font-serif text-3xl font-bold text-[#ef5a35] tracking-tight">
                {scanCount}
              </p>
              <div className="mt-1.5 flex items-center justify-center gap-2 text-[9px]">
                <button
                  className="font-semibold text-black/60 hover:text-[#ef5a35] dark:text-white/60 dark:hover:text-[#ef5a35] transition"
                  onClick={handleTestLink}
                  title="Simulate scan and open link in new tab"
                  type="button"
                >
                  Test Link ↗
                </button>
                <span className="text-black/30 dark:text-white/30">·</span>
                <button
                  className="text-black/40 hover:text-red-600 dark:text-white/40 dark:hover:text-red-400 transition"
                  onClick={handleResetScans}
                  title="Reset recorded scan count"
                  type="button"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Dispatch Wire URL Bar */}
        <div className="mt-5 rounded-xl border border-black/15 bg-white/70 p-3 shadow-xs dark:border-white/15 dark:bg-[#20201d]">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[8.5px] font-bold uppercase tracking-widest text-black/50 dark:text-white/50">
              Dispatch Wire Destination
            </span>
            <button
              className="inline-flex items-center gap-1 rounded-full border border-black/10 bg-white px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#ef5a35] hover:bg-[#ef5a35] hover:text-white transition shadow-2xs dark:border-white/10 dark:bg-black/30"
              onClick={handleCopy}
              type="button"
            >
              <span>{copied ? "✓ Copied" : "Copy Slug"}</span>
            </button>
          </div>
          <p className="mt-1 font-mono text-[10px] text-black/80 dark:text-white/80 break-all select-all leading-normal">
            {finalTrackedUrl}
          </p>
        </div>

        {/* Action Footer */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-black/15 pt-5 dark:border-white/15">
          <button
            className="rounded-full border border-black/15 px-5 py-2.5 text-[9px] font-bold uppercase tracking-[0.14em] text-black/60 hover:border-black hover:text-black dark:border-white/15 dark:text-white/60 dark:hover:border-white dark:hover:text-white transition"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-full bg-[#171714] px-6 py-2.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white hover:bg-[#ef5a35] dark:bg-white dark:text-[#171714] dark:hover:bg-[#ef5a35] dark:hover:text-white shadow-md transition"
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
