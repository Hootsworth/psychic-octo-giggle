import { useState, useEffect } from "react";

export type LegalModalTab = "terms" | "privacy" | "faq";

interface AuthLegalModalProps {
  isOpen: boolean;
  initialTab?: LegalModalTab;
  onClose: () => void;
}

export default function AuthLegalModal({
  isOpen,
  initialTab = "terms",
  onClose,
}: AuthLegalModalProps) {
  const [activeTab, setActiveTab] = useState<LegalModalTab>(initialTab);
  const [faqSearch, setFaqSearch] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const faqs = [
    {
      q: "Who can access and edit the campus newsletter?",
      a: "Accredited student editors, section writers, photojournalists, and faculty advisers with verified institutional accounts can create and modify newsletter issues. Readers can access public editions through digital noticeboard links without signing in.",
    },
    {
      q: "How does real-time newsroom collaboration work?",
      a: "The editor features built-in peer collaboration with live presence indicators, editorial annotations, and newsroom chat. You can see active editors on the top bar and work together without overwriting each other's work.",
    },
    {
      q: "Where is my work saved if my connection drops?",
      a: "All changes are automatically cached to your browser's persistent local storage on every keystroke. You will never lose edits due to a spotty campus Wi-Fi connection. When reconnected, changes seamlessly sync.",
    },
    {
      q: "How do I export for physical print versus digital distribution?",
      a: "Click 'Export PDF' in the editor top bar for high-resolution 300 DPI print-ready documents with strict margin and safe-zone enforcement. For digital subscribers, click 'Email' to open the Responsive Email Studio, which produces universally compatible HTML emails.",
    },
    {
      q: "What should I do if a page exceeds the print boundary?",
      a: "The editor automatically tracks content height and displays a 'Print Safe-Zone' warning if a page exceeds ~1350px. You can click 'Balance Page Flow' or add a new page from the top navigation to cleanly distribute lengthy columns.",
    },
    {
      q: "Can I customize interactive games like crosswords and sudoku?",
      a: "Yes! Add a game section from the section library, then click 'Open Crossword Studio' to visually construct word grids, place black blocks, and receive automated clue suggestions.",
    },
    {
      q: "How do I recover or reset my password?",
      a: "Select 'Forgot password?' on the sign-in screen, enter your registered email address, and click 'Send reset link'. You will receive a secure token to establish a new password.",
    },
  ];

  const filteredFaqs = faqs.filter(
    (item) =>
      item.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
      item.a.toLowerCase().includes(faqSearch.toLowerCase())
  );

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="relative my-8 flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-black/15 bg-[#f8f5ed] text-[#171714] shadow-2xl dark:border-white/15 dark:bg-[#1a1916] dark:text-[#f3f0e8]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-black/10 px-6 py-4.5 dark:border-white/10">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">
              Campus Newsroom Policy &amp; Knowledge Base
            </span>
            <h2 className="mt-0.5 font-serif text-2xl font-bold tracking-tight">
              {activeTab === "terms"
                ? "Terms & Conditions"
                : activeTab === "privacy"
                ? "Privacy & Data Policy"
                : "Frequently Asked Questions"}
            </h2>
          </div>

          <button
            aria-label="Close dialog"
            className="grid h-8 w-8 place-items-center rounded-full text-black/50 hover:bg-black/5 hover:text-black dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white transition"
            onClick={onClose}
            type="button"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-black/10 bg-black/[0.02] px-6 py-2.5 dark:border-white/10 dark:bg-white/[0.02]">
          <button
            className={`rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${
              activeTab === "terms"
                ? "bg-[#171714] text-white shadow-xs dark:bg-white dark:text-black"
                : "text-black/60 hover:bg-black/5 hover:text-black dark:text-white/60 dark:hover:bg-white/10"
            }`}
            onClick={() => setActiveTab("terms")}
            type="button"
          >
            Terms &amp; Conditions
          </button>
          <button
            className={`rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${
              activeTab === "privacy"
                ? "bg-[#171714] text-white shadow-xs dark:bg-white dark:text-black"
                : "text-black/60 hover:bg-black/5 hover:text-black dark:text-white/60 dark:hover:bg-white/10"
            }`}
            onClick={() => setActiveTab("privacy")}
            type="button"
          >
            Privacy Policy
          </button>
          <button
            className={`rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${
              activeTab === "faq"
                ? "bg-[#171714] text-white shadow-xs dark:bg-white dark:text-black"
                : "text-black/60 hover:bg-black/5 hover:text-black dark:text-white/60 dark:hover:bg-white/10"
            }`}
            onClick={() => setActiveTab("faq")}
            type="button"
          >
            FAQ &amp; Help
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 text-xs leading-relaxed">
          {/* TERMS AND CONDITIONS */}
          {activeTab === "terms" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-[#ef5a35]/25 bg-[#ef5a35]/5 p-4 text-[#ef5a35] dark:border-[#ef5a35]/30 dark:bg-[#ef5a35]/10">
                <p className="font-semibold uppercase tracking-wider text-[10px]">Important Editorial Notice</p>
                <p className="mt-1 text-xs text-black/75 dark:text-white/80">
                  By continuing, you agree to follow your university’s privacy, acceptable-use, and editorial policies. Do not store sensitive student records or confidential educational files in newsletter content.
                </p>
              </div>

              <section className="space-y-2">
                <h3 className="font-serif text-base font-bold text-black dark:text-white">1. Editorial Accountability &amp; Press Freedom</h3>
                <p className="text-black/70 dark:text-white/70">
                  This editorial application serves student-run campus publications and university media guilds. All contributing writers, editors, and photographers agree to adhere to journalistic integrity, verified reporting, and standards of civil discourse. Articles, columns, and editorial opinions remain the editorial responsibility of their credited authors and editorial boards.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-serif text-base font-bold text-black dark:text-white">2. Acceptable Use &amp; Account Security</h3>
                <p className="text-black/70 dark:text-white/70">
                  Authorized access is granted strictly to enrolled student journalists, appointed section editors, and designated faculty advisers. Users are responsible for maintaining the confidentiality of their login credentials. Any automated scraping, unauthorized peer session interception, or malicious tampering with peer collaboration relays will result in immediate revocation of access.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-serif text-base font-bold text-black dark:text-white">3. Intellectual Property &amp; Student Bylines</h3>
                <p className="text-black/70 dark:text-white/70">
                  Student journalists and photographers retain intellectual ownership of their original reporting, artwork, and photography. By publishing within this newsroom platform, contributors grant the campus editorial guild a non-exclusive license to format, typeset, print, archive, and distribute the work in official print issues and web editions.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-serif text-base font-bold text-black dark:text-white">4. Prohibition of Sensitive Student Records</h3>
                <p className="text-black/70 dark:text-white/70">
                  Strict compliance with university policy and student privacy regulations (including FERPA) is required. Editors and contributors are strictly prohibited from storing, publishing, or transmitting confidential student records, grading sheets, non-directory personal contact information, or sensitive disciplinary files within newsletter articles, noticeboard items, or scratch spaces.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-serif text-base font-bold text-black dark:text-white">5. Distribution &amp; Archival Integrity</h3>
                <p className="text-black/70 dark:text-white/70">
                  Output formats (including 300 DPI print-ready PDFs and responsive HTML newsletters) are produced for legitimate educational, cultural, and informational campus circulation. Commercial exploitation or redistribution of student journalism without explicit editorial consent is strictly prohibited.
                </p>
              </section>
            </div>
          )}

          {/* PRIVACY POLICY */}
          {activeTab === "privacy" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.02]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-black/50 dark:text-white/50">
                  Last Updated: October 2026 · Campus Media Guild Standards
                </p>
                <p className="mt-1 text-xs text-black/75 dark:text-white/80">
                  We are committed to transparent, student-first privacy. We do not sell data, track browsing behaviors, or share editorial drafts with commercial ad brokers.
                </p>
              </div>

              <section className="space-y-2">
                <h3 className="font-serif text-base font-bold text-black dark:text-white">1. Information We Collect</h3>
                <p className="text-black/70 dark:text-white/70">
                  To operate the editorial workspace, we collect the following minimal data:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-black/70 dark:text-white/70">
                  <li><strong>Account Credentials:</strong> Name, university email address, and encrypted authentication tokens.</li>
                  <li><strong>Editorial Content:</strong> Article headlines, bylines, drafts, layout parameters, and editorial notes.</li>
                  <li><strong>Audience Subscriptions:</strong> Voluntary subscriber emails collected via web opt-in forms for digital issue delivery.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="font-serif text-base font-bold text-black dark:text-white">2. Local Storage &amp; Data Security</h3>
                <p className="text-black/70 dark:text-white/70">
                  Draft issues, typography pairings, and layout configurations are stored securely inside your browser's persistent local storage. Cloud authentication and remote synchronization are encrypted in transit using industry-standard TLS. Custom delivery tokens (such as Resend or Gemini API keys) remain stored on your local device and are never sent to third-party telemetry servers.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-serif text-base font-bold text-black dark:text-white">3. Student Privacy &amp; Media Consent</h3>
                <p className="text-black/70 dark:text-white/70">
                  All photography, quotes, and event coverage must respect institutional media guidelines. If an individual student requests removal or retraction of their likeness or interview from a digital archive edition, editorial requests should be submitted to the managing editor for timely review.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-serif text-base font-bold text-black dark:text-white">4. Subscriber Rights &amp; Opt-Out</h3>
                <p className="text-black/70 dark:text-white/70">
                  Campus readers subscribed to digital issues may unsubscribe at any time using the one-click unsubscribe mechanism included in the CAN-SPAM compliant footer of every broadcast email.
                </p>
              </section>
            </div>
          )}

          {/* FREQUENTLY ASKED QUESTIONS */}
          {activeTab === "faq" && (
            <div className="space-y-4">
              <div className="relative">
                <input
                  className="w-full rounded-xl border border-black/15 bg-white px-4 py-2.5 pl-9 text-xs font-medium outline-none focus:border-[#ef5a35] dark:border-white/15 dark:bg-[#20201d]"
                  onChange={(e) => setFaqSearch(e.target.value)}
                  placeholder="Search frequently asked questions..."
                  type="text"
                  value={faqSearch}
                />
                <svg
                  className="absolute left-3 top-3 h-4 w-4 text-black/40 dark:text-white/40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>

              <div className="space-y-2 pt-2">
                {filteredFaqs.length > 0 ? (
                  filteredFaqs.map((faq, idx) => {
                    const isExpanded = expandedFaq === idx;
                    return (
                      <div
                        className="overflow-hidden rounded-xl border border-black/10 bg-white/70 dark:border-white/10 dark:bg-[#20201d]"
                        key={idx}
                      >
                        <button
                          className="flex w-full items-center justify-between px-4 py-3 text-left font-serif text-sm font-bold text-black hover:text-[#ef5a35] dark:text-[#f3f0e8] dark:hover:text-[#ef5a35] transition"
                          onClick={() => setExpandedFaq(isExpanded ? null : idx)}
                          type="button"
                        >
                          <span className="pr-4">{faq.q}</span>
                          <span className="text-black/40 dark:text-white/40 font-mono text-sm">
                            {isExpanded ? "−" : "+"}
                          </span>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-black/5 px-4 pb-3.5 pt-2 text-xs leading-relaxed text-black/70 dark:border-white/5 dark:text-white/70">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="py-8 text-center text-xs text-black/50 dark:text-white/50">
                    No answers match your search term. Try searching for "print", "export", or "save".
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-black/10 bg-[#f8f5ed] px-6 py-3.5 dark:border-white/10 dark:bg-[#1a1916]">
          <span className="text-[10px] text-black/45 dark:text-white/45">
            Student Press Guild Policy · Accessible collegiate publishing
          </span>
          <button
            className="rounded-full bg-[#171714] px-5 py-2 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-[#ef5a35] transition dark:bg-white dark:text-black dark:hover:bg-[#ef5a35] dark:hover:text-white"
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
