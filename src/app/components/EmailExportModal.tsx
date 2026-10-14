import { useState, useMemo, useEffect } from "react";
import { generateEmailHtml, sendTestEmailViaResend, type EmailGenerationOptions } from "../emailGenerator";
import { toast } from "./Toast";

interface EmailExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  issue: {
    id: string;
    title: string;
    week?: string;
    status?: string;
  };
  pages: any[][];
  palette?: {
    accent: string;
    paper: string;
    ink: string;
  };
  publicationName?: string;
}

type ViewMode = "desktop" | "mobile" | "code" | "send";

const RESEND_KEY_STORAGE = "iow-resend-api-key";

export default function EmailExportModal({
  isOpen,
  onClose,
  issue,
  pages,
  palette,
  publicationName = "In Other Words",
}: EmailExportModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");
  const [subject, setSubject] = useState(() => `[${publicationName}] ${issue.title || "Latest Issue"}`);
  const [previewText, setPreviewText] = useState("Weekly notes, student voices, and everything in between.");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [apiKey, setApiKey] = useState(() => {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem(RESEND_KEY_STORAGE) || "";
    }
    return "";
  });
  const [senderFrom, setSenderFrom] = useState("In Other Words <onboarding@resend.dev>");
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string; simulated?: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  // Sync default recipient from logged-in user if available
  useEffect(() => {
    if (!recipientEmail && typeof localStorage !== "undefined") {
      try {
        const authData = localStorage.getItem("sb-make-server-auth-token") || localStorage.getItem("supabase.auth.token");
        if (authData) {
          const parsed = JSON.parse(authData);
          if (parsed?.user?.email) {
            setRecipientEmail(parsed.user.email);
          }
        }
      } catch {
        // fallback
      }
    }
  }, [recipientEmail]);

  // Generate responsive HTML dynamically based on settings
  const emailHtml = useMemo(() => {
    const opts: EmailGenerationOptions = {
      issue,
      pages,
      palette,
      publicationName,
      subject,
      previewText,
    };
    return generateEmailHtml(opts);
  }, [issue, pages, palette, publicationName, subject, previewText]);

  if (!isOpen) return null;

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(emailHtml);
      setCopied(true);
      toast.success("Responsive email HTML copied to clipboard! Ready to paste into Mailchimp, Substack, or Beehiiv.", "HTML Copied");
      setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error("Failed to copy automatically. Please copy the code from the HTML Code tab.");
    }
  };

  const handleDownloadHtml = () => {
    const blob = new Blob([emailHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${issue.id || "newsletter"}-email.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded email HTML template file.", "File Saved");
  };

  const handleSaveApiKey = (value: string) => {
    setApiKey(value);
    localStorage.setItem(RESEND_KEY_STORAGE, value.trim());
  };

  const handleSendTest = async () => {
    if (!recipientEmail || !recipientEmail.includes("@")) {
      toast.error("Please enter a valid recipient email address.");
      return;
    }

    setIsSending(true);
    setSendResult(null);

    const result = await sendTestEmailViaResend({
      apiKey,
      from: senderFrom,
      to: recipientEmail,
      subject,
      html: emailHtml,
    });

    setIsSending(false);

    if (result.success) {
      if (result.simulated) {
        setSendResult({
          success: true,
          simulated: true,
          message: `Test email validated and simulated successfully for ${recipientEmail}. To deliver to a real inbox, add your free Resend API key below.`,
        });
        toast.info(`Simulated email test dispatched for ${recipientEmail}`, "Simulation Mode");
      } else {
        setSendResult({
          success: true,
          simulated: false,
          message: `Live test email successfully delivered to ${recipientEmail} via Resend (ID: ${result.id})! Check your inbox.`,
        });
        toast.success(`Live test email delivered to ${recipientEmail}!`, "Email Delivered");
      }
    } else {
      setSendResult({
        success: false,
        message: result.error || "Failed to deliver email.",
      });
      toast.error(result.error || "Could not send test email.");
    }
  };

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-black/15 bg-[#f8f5ed] text-[#171714] shadow-2xl dark:border-white/15 dark:bg-[#1a1916] dark:text-[#f3f0e8]">
        
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between border-b border-black/10 px-6 py-4 dark:border-white/10">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#ef5a35]/15 text-[#ef5a35]">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </span>
            <div>
              <h2 className="font-serif text-xl font-bold tracking-tight">Responsive Email Studio</h2>
              <p className="text-[10px] uppercase tracking-wider text-black/50 dark:text-white/50">
                Universal HTML email export & test inbox delivery
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 rounded-full bg-[#ef5a35] px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#d44826]"
              onClick={handleCopyHtml}
              type="button"
            >
              <span>{copied ? "✓ Copied" : "Copy HTML"}</span>
            </button>
            <button
              className="rounded-full border border-black/15 px-3 py-2 text-[10px] font-bold uppercase tracking-wider hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
              onClick={handleDownloadHtml}
              type="button"
            >
              Download .html
            </button>
            <button
              aria-label="Close modal"
              className="grid h-8 w-8 place-items-center rounded-full text-black/50 hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/10"
              onClick={onClose}
              type="button"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Campaign Metadata Row */}
        <div className="grid gap-3 border-b border-black/10 bg-black/[0.02] p-4 sm:grid-cols-2 dark:border-white/10 dark:bg-white/[0.02]">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-[9px] font-bold uppercase tracking-wider text-black/60 dark:text-white/60">
                Email Subject Line
              </label>
              <span className={`text-[9px] font-mono ${subject.length > 60 ? "text-amber-600 font-bold" : "text-black/40 dark:text-white/40"}`}>
                {subject.length} chars {subject.length > 60 ? "(try <60 for mobile)" : ""}
              </span>
            </div>
            <input
              className="mt-1 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-[#ef5a35] dark:border-white/15 dark:bg-[#252420]"
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. [Weekly Edition] Back to where ideas begin"
              type="text"
              value={subject}
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-[9px] font-bold uppercase tracking-wider text-black/60 dark:text-white/60">
                Preheader Snippet (Inbox preview text)
              </label>
              <span className="text-[9px] font-mono text-black/40 dark:text-white/40">
                {previewText.length} chars
              </span>
            </div>
            <input
              className="mt-1 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-[#ef5a35] dark:border-white/15 dark:bg-[#252420]"
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="Snippet appearing right after the subject in recipient inboxes"
              type="text"
              value={previewText}
            />
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center justify-between border-b border-black/10 px-6 py-2 bg-white/50 dark:border-white/10 dark:bg-[#1a1916]/50">
          <div className="flex items-center gap-1">
            <button
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider transition ${viewMode === "desktop" ? "bg-[#171714] text-white dark:bg-white dark:text-black" : "text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10"}`}
              onClick={() => setViewMode("desktop")}
              type="button"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Desktop (600px)</span>
            </button>
            <button
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider transition ${viewMode === "mobile" ? "bg-[#171714] text-white dark:bg-white dark:text-black" : "text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10"}`}
              onClick={() => setViewMode("mobile")}
              type="button"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>Mobile (375px)</span>
            </button>
            <button
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider transition ${viewMode === "code" ? "bg-[#171714] text-white dark:bg-white dark:text-black" : "text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/10"}`}
              onClick={() => setViewMode("code")}
              type="button"
            >
              <span>&lt;/&gt; HTML Code</span>
            </button>
            <button
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider transition ${viewMode === "send" ? "bg-[#ef5a35] text-white" : "text-[#ef5a35] hover:bg-[#ef5a35]/10 font-bold"}`}
              onClick={() => setViewMode("send")}
              type="button"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
              <span>Send Test Email</span>
            </button>
          </div>

          <span className="hidden text-[10px] text-black/40 sm:inline dark:text-white/40">
            Rendered with universal email table tags
          </span>
        </div>

        {/* Body Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6" style={{ minHeight: "440px" }}>
          
          {/* Desktop Preview */}
          {viewMode === "desktop" && (
            <div className="flex justify-center">
              <div className="w-[600px] overflow-hidden rounded-lg border border-black/10 bg-white shadow-xl dark:border-white/10">
                <iframe
                  className="h-[520px] w-full border-none"
                  sandbox="allow-same-origin"
                  srcDoc={emailHtml}
                  title="Desktop Email Preview"
                />
              </div>
            </div>
          )}

          {/* Mobile Preview */}
          {viewMode === "mobile" && (
            <div className="flex justify-center">
              <div className="w-[375px] overflow-hidden rounded-3xl border-4 border-black/80 bg-white shadow-2xl dark:border-white/40">
                <div className="h-4 bg-black/90 text-center text-[7px] text-white">9:41</div>
                <iframe
                  className="h-[520px] w-full border-none"
                  sandbox="allow-same-origin"
                  srcDoc={emailHtml}
                  title="Mobile Email Preview"
                />
              </div>
            </div>
          )}

          {/* HTML Code View */}
          {viewMode === "code" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-black/60 dark:text-white/60">
                  Ready to copy and paste into Mailchimp, Substack, Beehiiv, Klaviyo, Brevo, or send via custom SMTP.
                </p>
                <button
                  className="rounded bg-[#171714] px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-white hover:bg-[#ef5a35] dark:bg-white dark:text-black"
                  onClick={handleCopyHtml}
                  type="button"
                >
                  {copied ? "✓ Copied" : "Copy Code"}
                </button>
              </div>
              <pre className="max-h-[500px] overflow-auto rounded-xl border border-black/10 bg-black/5 p-4 font-mono text-[11px] leading-relaxed select-all dark:border-white/10 dark:bg-white/5">
                {emailHtml}
              </pre>
            </div>
          )}

          {/* Send Test Email View */}
          {viewMode === "send" && (
            <div className="mx-auto max-w-xl space-y-6 py-4">
              <div className="rounded-xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#20201d]">
                <h3 className="font-serif text-xl font-bold">Dispatch a live test proof</h3>
                <p className="mt-1 text-xs text-black/60 dark:text-white/60">
                  Send this newsletter directly to your inbox to inspect rendering, image display, and links in Gmail, Apple Mail, or Outlook.
                </p>

                <div className="mt-5 space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-black/60 dark:text-white/60">
                      Recipient Email Address *
                    </label>
                    <input
                      className="mt-1 w-full rounded-lg border border-black/15 bg-[#f8f5ed] px-3.5 py-2.5 text-xs outline-none focus:border-[#ef5a35] dark:border-white/15 dark:bg-[#171714]"
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="e.g. editor@university.edu or you@gmail.com"
                      type="email"
                      value={recipientEmail}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-black/60 dark:text-white/60">
                        Resend API Key (Optional for live delivery)
                      </label>
                      <a
                        className="text-[9px] font-bold uppercase tracking-wider text-[#ef5a35] hover:underline"
                        href="https://resend.com/api-keys"
                        rel="noreferrer"
                        target="_blank"
                      >
                        Get free key ↗
                      </a>
                    </div>
                    <input
                      className="mt-1 w-full rounded-lg border border-black/15 bg-[#f8f5ed] px-3.5 py-2.5 font-mono text-xs outline-none focus:border-[#ef5a35] dark:border-white/15 dark:bg-[#171714]"
                      onChange={(e) => handleSaveApiKey(e.target.value)}
                      placeholder="re_..."
                      type="password"
                      value={apiKey}
                    />
                    <p className="mt-1 text-[9px] text-black/45 dark:text-white/45">
                      {apiKey
                        ? "✓ Saved securely in browser storage. Real delivery enabled."
                        : "No key? Click below to run a full payload delivery simulation, or paste a Resend key for real inbox delivery."}
                    </p>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-black/60 dark:text-white/60">
                      Sender &quot;From&quot; Name &amp; Domain
                    </label>
                    <input
                      className="mt-1 w-full rounded-lg border border-black/15 bg-[#f8f5ed] px-3.5 py-2.5 text-xs outline-none focus:border-[#ef5a35] dark:border-white/15 dark:bg-[#171714]"
                      onChange={(e) => setSenderFrom(e.target.value)}
                      placeholder="In Other Words <onboarding@resend.dev>"
                      type="text"
                      value={senderFrom}
                    />
                    <span className="mt-1 block text-[9px] text-black/40 dark:text-white/40">
                      Use onboarding@resend.dev for test testing or your own verified domain.
                    </span>
                  </div>

                  {sendResult && (
                    <div
                      className={`rounded-lg border p-4 text-xs ${
                        sendResult.success
                          ? "border-emerald-500/30 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
                          : "border-red-500/30 bg-red-50 text-red-900 dark:bg-red-950/30 dark:text-red-200"
                      }`}
                    >
                      <p className="font-bold">{sendResult.success ? (sendResult.simulated ? "Simulation Passed" : "✓ Email Sent Successfully") : "✕ Delivery Failed"}</p>
                      <p className="mt-1">{sendResult.message}</p>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      className="w-full rounded-xl bg-[#ef5a35] py-3 text-xs font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-[#d44826] disabled:opacity-50"
                      disabled={isSending}
                      onClick={handleSendTest}
                      type="button"
                    >
                      {isSending ? "Dispatching Email..." : apiKey ? "Send Live Proof to Inbox" : "Run Test Email Simulation"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between border-t border-black/10 bg-[#f8f5ed] px-6 py-3.5 dark:border-white/10 dark:bg-[#1a1916]">
          <span className="text-[10px] text-black/50 dark:text-white/50">
            600px width · Inlined CSS · Web-safe fallback typography · CAN-SPAM footer
          </span>
          <div className="flex items-center gap-3">
            <button
              className="rounded-full border border-black/20 px-4 py-2 text-[10px] font-bold uppercase tracking-wider hover:border-black dark:border-white/20 dark:hover:border-white"
              onClick={onClose}
              type="button"
            >
              Done
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
