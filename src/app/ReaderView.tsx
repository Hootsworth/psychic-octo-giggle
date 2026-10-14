import { useEffect, useState, useMemo } from "react";
import { Link, useParams } from "react-router";
import { loadWorkspace, type Issue } from "./store";
import BrandLogo from "./BrandLogo";
import SubscribeForm from "./components/SubscribeForm";
import SudokuSection from "./games/SudokuSection";
import WordSearchSection from "./games/WordSearchSection";
import type { CrosswordData, SudokuData, WordSearchData } from "./games/types";
import { DEFAULT_CAMPUS_MINI_CROSSWORD, DEFAULT_SUDOKU, DEFAULT_WORD_SEARCH } from "./games/presets";
import QRCodeSvg from "./components/QRCodeSvg";

interface Section {
  id: string;
  type: string;
  width: number;
  height: string;
  content?: {
    eyebrow?: string;
    title?: string;
    body?: string;
    byline?: string;
    noticeDetails?: string;
    qrUrl?: string;
    qrEnabled?: boolean;
    qrLabel?: string;
    qrCampaign?: string;
    useTrackingParams?: boolean;
    crossword?: CrosswordData;
    sudoku?: SudokuData;
    wordsearch?: WordSearchData;
  };
}

type Pages = Section[][];

const CAMPUS_IMAGE =
  "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=85&w=1600";

const PALETTES: Record<string, { accent: string; paper: string; ink: string; workspace: string }> = {
  campus: { accent: "#ef5a35", paper: "#f8f5ed", ink: "#171714", workspace: "#dedbd3" },
  library: { accent: "#3e6a59", paper: "#f3f0e7", ink: "#18201c", workspace: "#d9ddd8" },
  literary: { accent: "#7d5a87", paper: "#f7f1eb", ink: "#241b26", workspace: "#dfd8df" },
  academic: { accent: "#315b75", paper: "#f3f4f1", ink: "#17232a", workspace: "#d9dfe1" },
  monochrome: { accent: "#171714", paper: "#ffffff", ink: "#111111", workspace: "#ddddda" },
};

const FONT_PAIRS: Record<string, { serif: string; sans: string }> = {
  newsreader: { serif: '"Newsreader", Georgia, serif', sans: '"DM Sans", sans-serif' },
  classic: { serif: "Georgia, serif", sans: "Arial, sans-serif" },
  modern: { serif: "Arial, sans-serif", sans: "Arial, sans-serif" },
  traditional: { serif: '"Times New Roman", serif', sans: "Helvetica, Arial, sans-serif" },
};

export default function ReaderView() {
  const { issueId = "issue-08" } = useParams();
  const [copied, setCopied] = useState(false);
  const [readingTheme, setReadingTheme] = useState<"warm" | "cream" | "night">("warm");
  const [pollVoted, setPollVoted] = useState<number | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Load workspace & issue
  const workspace = useMemo(() => loadWorkspace(), []);
  const issue: Issue = useMemo(() => {
    return (
      workspace.issues.find((item) => item.id === issueId) ?? {
        id: issueId,
        title: "Campus Edition",
        description: "Weekly student voices, campus notes, and long-form features.",
        date: "September 2026",
        volume: "Vol. 1 · No. 8",
        status: "published",
        pages: [],
      }
    );
  }, [workspace, issueId]);

  // Load pages layout
  const pages: Pages = useMemo(() => {
    try {
      const stored = localStorage.getItem(`iow-layout-${issueId}`);
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return issue.pages.length ? issue.pages : [[]];
  }, [issueId, issue.pages]);

  // Palette & Font
  const paletteId = localStorage.getItem(`iow-palette-${issueId}`) ?? "campus";
  const fontId = localStorage.getItem(`iow-font-${issueId}`) ?? "newsreader";
  const palette = PALETTES[paletteId] ?? PALETTES.campus;
  const fontPair = FONT_PAIRS[fontId] ?? FONT_PAIRS.newsreader;

  // Stored content
  const storedContent = useMemo(() => {
    try {
      const raw = localStorage.getItem(`iow-content-${issueId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [issueId]);

  // Populate innerHTML from storedContent once mounted
  useEffect(() => {
    if (Array.isArray(storedContent)) {
      const elements = document.querySelectorAll<HTMLElement>("#reader-document .reader-editable");
      elements.forEach((el, index) => {
        if (storedContent[index] !== undefined) {
          el.innerHTML = storedContent[index];
        }
      });
    }
  }, [storedContent, pages]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: issue.title,
          text: `Read "${issue.title}" on In Other Words`,
          url,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const themeClasses = {
    warm: "bg-[#e8e5de] text-[#171714]",
    cream: "bg-[#f5f2ea] text-[#1a1917]",
    night: "bg-[#141412] text-[#e8e5de]",
  }[readingTheme];

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${themeClasses}`}
      style={{
        "--editor-accent": palette.accent,
        "--editor-paper": readingTheme === "night" ? "#1e1e1b" : palette.paper,
        "--editor-ink": readingTheme === "night" ? "#f3f0e8" : palette.ink,
        "--editor-workspace": palette.workspace,
        "--editor-serif": fontPair.serif,
        "--editor-sans": fontPair.sans,
      } as React.CSSProperties}
    >
      {/* Top Reader Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-black/10 bg-[#f4f1e9]/95 px-4 py-3 backdrop-blur-md md:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-black/60 hover:text-[#ef5a35]"
              to="/archive"
            >
              <span>←</span>
              <span className="hidden sm:inline">Archive</span>
            </Link>
            <span className="h-4 w-px bg-black/15" />
            <BrandLogo className="h-8 w-20" />
            <div className="hidden md:block">
              <span className="text-[11px] font-semibold text-black/80">{issue.title}</span>
              <span className="mx-2 text-[10px] text-black/35">·</span>
              <span className="text-[10px] uppercase tracking-[0.1em] text-black/50">{issue.volume}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme switcher */}
            <div className="flex items-center rounded-full border border-black/15 bg-white/60 p-0.5 text-[9px] font-bold uppercase">
              <button
                className={`rounded-full px-2.5 py-1 ${readingTheme === "warm" ? "bg-[#171714] text-white" : "text-black/60"}`}
                onClick={() => setReadingTheme("warm")}
                title="Warm paper theme"
                type="button"
              >
                Paper
              </button>
              <button
                className={`rounded-full px-2.5 py-1 ${readingTheme === "night" ? "bg-[#171714] text-white" : "text-black/60"}`}
                onClick={() => setReadingTheme("night")}
                title="Night reading theme"
                type="button"
              >
                Night
              </button>
            </div>

            {/* Print / Save button */}
            <button
              className="hidden rounded-full border border-black/15 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] hover:border-[#ef5a35] hover:text-[#ef5a35] sm:inline-flex"
              onClick={() => window.print()}
              type="button"
            >
              Print / PDF
            </button>

            {/* Share link button */}
            <button
              className="relative rounded-full bg-[#171714] px-4 py-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white hover:bg-[#ef5a35]"
              onClick={handleShare}
              type="button"
            >
              {copied ? "Link Copied ✓" : "Share"}
            </button>

            {/* Edit Issue Link */}
            <Link
              className="rounded-full border border-black/15 bg-white/50 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-black/70 hover:bg-[#ef5a35] hover:text-white"
              to={`/editor/${issueId}`}
            >
              Edit
            </Link>
          </div>
        </div>
      </header>

      {/* Main Reading Container */}
      <main className="mx-auto max-w-[940px] px-3 py-8 sm:px-6 md:py-14">
        <div id="reader-document">
          {pages.map((sections, pageIndex) => (
            <article
              className="page mb-10 overflow-hidden bg-[#f8f5ed] shadow-xl"
              key={pageIndex}
              style={{
                backgroundColor: readingTheme === "night" ? "#1e1e1b" : palette.paper,
                color: readingTheme === "night" ? "#f3f0e8" : palette.ink,
              }}
            >
              {/* Clean Masthead Header */}
              <div className="mx-6 flex items-end justify-between border-b border-black/20 pb-3 pt-7 sm:mx-10 md:mx-14">
                <BrandLogo className="h-12 w-24 object-left" />
                <div className="flex items-center gap-5 text-[9px] font-semibold uppercase tracking-[0.18em]">
                  <span>The University Edition</span>
                  <span className="text-[#ef5a35]">
                    {String(pageIndex + 1).padStart(2, "0")} / {String(pages.length).padStart(2, "0")}
                  </span>
                </div>
              </div>

              {/* Page Grid */}
              <div className="page-grid">
                {sections.map((section) => (
                  <div
                    className={`builder-block height-${section.height}`}
                    key={section.id}
                    style={{ gridColumn: `span ${section.width}` }}
                  >
                    <ReaderSectionContent
                      isPlayingAudio={isPlayingAudio}
                      onAudioToggle={() => setIsPlayingAudio(!isPlayingAudio)}
                      onVote={(opt) => setPollVoted(opt)}
                      pollVoted={pollVoted}
                      section={section}
                      storageKey={`photo-${issueId}-${section.id}`}
                    />
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>

        {/* Reader Footer & Newsletter Subscription */}
        <section className="my-16 rounded-2xl border border-black/15 bg-[#f8f5ed] p-8 shadow-sm md:p-12">
          <div className="mx-auto max-w-xl text-center">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">
              Enjoyed this edition?
            </span>
            <h3 className="mt-3 font-serif text-3xl sm:text-4xl">
              Stay in the conversation.
            </h3>
            <p className="mt-3 text-xs leading-relaxed text-black/60">
              In Other Words is published weekly by students, for students. Receive new essays, campus investigations, audio playlists, and club dispatches straight to your inbox every Sunday morning.
            </p>

            <div className="mt-8 text-left">
              <SubscribeForm />
            </div>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4 border-t border-black/10 pt-6 text-[10px] uppercase tracking-[0.14em] text-black/50">
              <Link className="hover:text-[#ef5a35]" to="/archive">
                Browse Past Issues
              </Link>
              <span>·</span>
              <button
                className="hover:text-[#ef5a35]"
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                type="button"
              >
                Back to Top ↑
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function ReaderSectionContent({
  section,
  storageKey,
  pollVoted,
  onVote,
  isPlayingAudio,
  onAudioToggle,
}: {
  section: Section;
  storageKey: string;
  pollVoted: number | null;
  onVote: (index: number) => void;
  isPlayingAudio: boolean;
  onAudioToggle: () => void;
}) {
  const { type, content } = section;
  const storedPhoto = localStorage.getItem(storageKey);

  if (type === "cover") {
    return (
      <div className="grid h-full gap-8 p-7 sm:p-10 md:grid-cols-[1fr_2.15fr] md:p-14">
        <div className="flex flex-col justify-between gap-10">
          <p className="reader-editable text-[10px] font-bold uppercase leading-relaxed tracking-[0.16em]">
            {content?.body ?? "Weekly notes, campus voices & everything in between"}
          </p>
          <p className="reader-editable text-xs leading-relaxed text-black/55">
            Issue No. 08<br />September 22–28
          </p>
        </div>
        <div>
          <p className="reader-editable mb-4 text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">
            {content?.eyebrow ?? "This week on campus"}
          </p>
          <h1 className="reader-editable headline font-serif text-[clamp(3.5rem,8vw,6.5rem)] leading-[0.85] tracking-[-0.065em]">
            {content?.title ?? "Back to where ideas begin."}
          </h1>
        </div>
      </div>
    );
  }

  if (type === "heading") {
    return (
      <div className="h-full p-7 sm:p-10 md:p-12">
        <p className="reader-editable mb-3 text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">
          {content?.eyebrow ?? "The university edit"}
        </p>
        <h1 className="reader-editable font-serif text-5xl leading-none tracking-[-0.055em] sm:text-7xl">
          {content?.title ?? "Student voices"}
        </h1>
      </div>
    );
  }

  if (type === "article") {
    return (
      <div className="grid h-full bg-[#f8f5ed] md:grid-cols-[0.8fr_1.2fr]">
        <div className="bg-[#ef5a35] p-7 text-white sm:p-10">
          <p className="reader-editable text-[9px] font-bold uppercase tracking-[0.18em]">{content?.eyebrow ?? "Feature"}</p>
          <h2 className="reader-editable mt-12 font-serif text-4xl leading-[0.95] tracking-[-0.04em]">
            {content?.title ?? "A new week, a blank page."}
          </h2>
        </div>
        <div className="p-7 sm:p-10">
          <p className="reader-editable drop-cap whitespace-pre-line font-serif text-lg leading-[1.7] text-black/80">
            {content?.body ?? "The campus feels different in September. New notebooks, old buildings, and the pleasant sense that anything might happen. This space belongs to the students filling it—with questions, stories, plans, and ideas."}
          </p>
          <p className="reader-editable mt-5 text-[10px] font-bold uppercase tracking-[0.14em]">
            — The editorial team
          </p>
        </div>
      </div>
    );
  }

  if (type === "photo") {
    return (
      <div className="flex h-full flex-col">
        <div className="relative min-h-[320px] flex-1 overflow-hidden bg-[#e8e5de]">
          <img
            alt={content?.body ?? "Campus visual"}
            className="h-full w-full object-cover"
            src={storedPhoto || CAMPUS_IMAGE}
          />
        </div>
        <p className="reader-editable px-5 py-3 text-[9px] uppercase tracking-[0.13em] text-black/50">
          {content?.body ?? "Campus in motion · Photography"}
        </p>
      </div>
    );
  }

  if (type === "poem") {
    return (
      <div className="h-full p-7 sm:p-10">
        <p className="reader-editable text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">
          {content?.eyebrow ?? "Featured poem"}
        </p>
        <h2 className="reader-editable mt-5 font-serif text-4xl tracking-[-0.04em]">{content?.title ?? "Library at 4:17"}</h2>
        <p className="reader-editable mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-black/50">
          {content?.byline ?? "By Maya Chen · English, Year III"}
        </p>
        <p className="reader-editable mt-9 border-l border-black pl-7 font-serif text-xl italic leading-[1.8] sm:text-2xl">
          {content?.body ? <span className="whitespace-pre-line">{content.body}</span> : <>The afternoon leans<br />through tall windows,<br />dust turning slowly<br />like a thought<br />we haven’t finished.<br /><br />Someone closes a book.<br />The whole room listens.</>}
        </p>
      </div>
    );
  }

  if (type === "quote") {
    return (
      <div className="flex h-full flex-col justify-between bg-[#ef5a35] p-8 text-white sm:p-10">
        <p className="reader-editable text-[9px] font-bold uppercase tracking-[0.18em]">In their own words</p>
        <h2 className="reader-editable my-10 font-serif text-3xl italic leading-tight sm:text-4xl">
          {content?.body ?? "“The university is not just where we learn. It is what we make together.”"}
        </h2>
        <p className="reader-editable text-[10px] uppercase tracking-[0.14em]">— Student contributor</p>
      </div>
    );
  }

  if (type === "events") {
    return (
      <div className="h-full p-7 sm:p-10">
        <h2 className="reader-editable mb-6 font-serif text-4xl tracking-[-0.04em]">{content?.title ?? "This week"}</h2>
        {content?.body ? (
          <p className="reader-editable whitespace-pre-line border-y border-black/30 py-6 font-serif text-xl leading-[1.8]">{content.body}</p>
        ) : [
          ["MON 22", "Open mic night", "Student Union · 7:30 PM"],
          ["WED 24", "Astronomy Club stargazing", "East Lawn · 9:00 PM"],
          ["THU 25", "Women’s football: Home game", "University Field · 5:00 PM"],
          ["SAT 27", "Autumn societies fair", "Main Quad · 11:00 AM"],
        ].map(([date, title, place]) => (
          <div className="grid gap-2 border-t border-black/30 py-5 sm:grid-cols-[70px_1fr]" key={title}>
            <span className="text-[9px] font-bold text-[#ef5a35]">{date}</span>
            <div>
              <h3 className="reader-editable font-serif text-2xl leading-tight">{title}</h3>
              <p className="reader-editable mt-1 text-[9px] uppercase tracking-[0.12em] text-black/45">{place}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === "interview") {
    return (
      <div className="grid h-full bg-[#171714] text-[#f8f5ed] md:grid-cols-[0.65fr_1.35fr]">
        <div className="flex flex-col justify-between border-b border-white/15 p-7 md:border-b-0 md:border-r sm:p-9">
          <p className="reader-editable text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">{content?.eyebrow ?? "Five questions"}</p>
          <h2 className="reader-editable mt-12 font-serif text-3xl leading-[0.95] tracking-[-0.04em] sm:text-4xl">{content?.title ?? "A conversation with someone shaping campus"}</h2>
          <p className="reader-editable mt-7 text-[9px] uppercase tracking-[0.14em] text-white/40">{content?.byline ?? "Interview by the editorial team"}</p>
        </div>
        <p className="reader-editable whitespace-pre-line p-7 font-serif text-lg leading-[1.65] text-white/75 sm:p-9">
          {content?.body ?? "Q — What idea are you carrying with you this semester?\n\nA — That the most useful work often begins as a conversation between people who see the same problem differently.\n\nQ — Where should students begin?\n\nA — With curiosity, and with one another."}
        </p>
      </div>
    );
  }

  if (type === "audio") {
    return (
      <div className="flex h-full flex-col justify-between border-y border-black/15 bg-[#171714] p-7 text-white sm:p-9">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">Campus Audio · Playlist</span>
            <span className="flex items-center gap-1.5 text-[8px] uppercase tracking-[0.14em] text-white/50">
              <span className={`h-1.5 w-1.5 rounded-full bg-[#ef5a35] ${isPlayingAudio ? "animate-ping" : ""}`} />
              {isPlayingAudio ? "Now Playing" : "Campus Radio"}
            </span>
          </div>
          <h3 className="reader-editable mt-3 font-serif text-3xl sm:text-4xl">
            {content?.title ?? "Tracks from the Library Basement"}
          </h3>
          <p className="reader-editable mt-2 text-xs leading-relaxed text-white/60">
            {content?.body ?? "Curated by the Campus Radio Society. Songs playing across study halls, rehearsal rooms, and dorm kitchens this week."}
          </p>
        </div>
        <div className="mt-6 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-3">
            <button
              className="grid h-10 w-10 place-items-center rounded-full bg-[#ef5a35] text-white shadow-md transition hover:scale-105"
              onClick={onAudioToggle}
              title={isPlayingAudio ? "Pause preview" : "Play preview"}
              type="button"
            >
              {isPlayingAudio ? "❚❚" : "▶"}
            </button>
            <div>
              <p className="text-xs font-semibold text-white">
                Track 01 · Late Autumn Reverie
              </p>
              <p className="text-[10px] text-white/45">
                The Student Quartet · 3:42
              </p>
            </div>
          </div>
          <span className="rounded-full border border-white/20 px-3 py-1 text-[8px] font-bold uppercase tracking-[0.12em] text-white/60">
            Spotify / Apple Music
          </span>
        </div>
      </div>
    );
  }

  if (type === "poll") {
    const defaultOptions = [
      { label: "Quiet corner in the Law Library", votes: 64 },
      { label: "Student Union Coffee Shop", votes: 38 },
      { label: "Empty seminar rooms after 5 PM", votes: 26 },
      { label: "The East Lawn benches", votes: 12 },
    ];
    const totalVotes = defaultOptions.reduce((acc, curr) => acc + curr.votes, 0) + (pollVoted !== null ? 1 : 0);

    return (
      <div className="flex h-full flex-col justify-between border border-black/15 bg-[#f8f5ed] p-7 sm:p-9">
        <div>
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">Campus Pulse · Student Poll</span>
          <h3 className="reader-editable mt-3 font-serif text-2xl sm:text-3xl">
            {content?.title ?? "Where is the best place to write on campus?"}
          </h3>
          <p className="reader-editable mt-1.5 text-xs text-black/55">
            {content?.body ?? "Cast your vote below. Results update in real-time across the university edition."}
          </p>
        </div>
        <div className="mt-5 space-y-2.5">
          {defaultOptions.map((opt, i) => {
            const votes = opt.votes + (pollVoted === i ? 1 : 0);
            const pct = Math.round((votes / totalVotes) * 100);
            const isSelected = pollVoted === i;
            return (
              <button
                className={`relative w-full overflow-hidden rounded-lg border p-3 text-left transition ${isSelected ? "border-[#ef5a35] bg-[#ef5a35]/10" : "border-black/15 bg-white hover:border-black/30"}`}
                key={i}
                onClick={() => onVote(i)}
                type="button"
              >
                <div
                  className="absolute inset-y-0 left-0 bg-[#ef5a35]/15 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex items-center justify-between text-xs font-medium">
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${isSelected ? "bg-[#ef5a35]" : "border border-black/30"}`} />
                    {opt.label}
                  </span>
                  <span className="font-mono text-[10px] text-black/55">{pct}%</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (type === "notice") {
    const qrEnabled = content?.qrEnabled !== false;
    const rawUrl = content?.qrUrl || "https://newsletter.singulr.tech/submit";
    const qrLabel = content?.qrLabel || "Scan to Submit Work";
    const campaign = content?.qrCampaign || "submissions";
    const useTracking = content?.useTrackingParams !== false;

    let finalTrackedUrl = rawUrl;
    if (useTracking) {
      try {
        const parsed = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
        parsed.searchParams.set("utm_source", "newsletter_noticeboard");
        parsed.searchParams.set("utm_medium", "qr_code");
        if (campaign) parsed.searchParams.set("utm_campaign", campaign);
        parsed.searchParams.set("ref", "noticeboard_qr");
        finalTrackedUrl = parsed.toString();
      } catch {
        const sep = rawUrl.includes("?") ? "&" : "?";
        finalTrackedUrl = `${rawUrl}${sep}utm_source=newsletter_noticeboard&utm_medium=qr_code&ref=noticeboard_qr`;
      }
    }

    return (
      <div className="flex h-full flex-col justify-between border border-black bg-[#f8f5ed] p-6 sm:p-7">
        <div>
          <p className="reader-editable text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">
            {content?.eyebrow ?? "Noticeboard"}
          </p>
          <h2 className="reader-editable mt-4 font-serif text-3xl leading-tight">
            {content?.title ?? "Submit your work"}
          </h2>
          <p className="reader-editable mt-4 whitespace-pre-line text-sm leading-relaxed">
            {content?.body ?? "Poetry, short fiction, essays, photography, illustration, or fragments we don’t have a name for yet."}
          </p>
        </div>

        <div className="mt-6 border-t border-black/15 pt-5">
          <p className="reader-editable text-xs leading-relaxed text-black/60">
            {content?.noticeDetails ?? "Send up to 1,500 words to words@university.edu by Friday at noon."}
          </p>

          {qrEnabled && (
            <a
              className="mt-4 flex items-center gap-3.5 rounded-xl border border-black/15 bg-white/85 p-3 shadow-xs hover:border-[#ef5a35] hover:shadow-sm transition group cursor-pointer text-[#171714] no-underline"
              href={finalTrackedUrl}
              rel="noopener noreferrer"
              target="_blank"
              title="Click or scan with phone to submit"
            >
              <div className="shrink-0 rounded-lg border border-black/10 bg-white p-1.5 shadow-xs">
                <QRCodeSvg
                  fgColor="#171714"
                  size={64}
                  title={qrLabel}
                  value={finalTrackedUrl}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#ef5a35]" />
                  <span className="text-[8.5px] font-bold uppercase tracking-widest text-[#ef5a35]">
                    Submissions Portal
                  </span>
                </div>
                <p className="mt-0.5 font-serif text-sm font-semibold leading-tight text-[#171714] truncate group-hover:text-[#ef5a35]">
                  {qrLabel} ↗
                </p>
                <p className="mt-1 text-[9px] text-black/50 truncate font-mono">
                  {finalTrackedUrl.replace(/^https?:\/\//, "")}
                </p>
              </div>
            </a>
          )}
        </div>
      </div>
    );
  }

  if (type === "statistics") {
    return (
      <div className="h-full bg-[#efe8d8] p-7 sm:p-9">
        <p className="reader-editable text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">{content?.eyebrow ?? "By the numbers"}</p>
        <h2 className="reader-editable mt-4 font-serif text-4xl tracking-[-0.04em]">{content?.title ?? "A snapshot of campus"}</h2>
        {content?.body ? (
          <p className="reader-editable mt-8 whitespace-pre-line font-serif text-3xl leading-[1.5]">{content.body}</p>
        ) : (
          <div className="mt-8 grid grid-cols-3 divide-x divide-black/20 border-y border-black/20 py-6">
            {[["42", "Student clubs"], ["18", "Events this week"], ["7K", "Ideas shared"]].map(([value, label]) => (
              <div className="px-3 text-center" key={label}>
                <p className="reader-editable font-serif text-4xl">{value}</p>
                <p className="reader-editable mt-2 text-[8px] uppercase tracking-[0.12em] text-black/45">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (type === "timeline") {
    const items = content?.body?.split("\n").filter(Boolean) ?? [
      "09:00 — Doors open",
      "11:30 — The main conversation",
      "14:00 — Workshops across campus",
      "18:30 — Music on the quad",
    ];
    return (
      <div className="h-full p-7 sm:p-9">
        <p className="reader-editable text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">{content?.eyebrow ?? "Follow the day"}</p>
        <h2 className="reader-editable mt-4 font-serif text-4xl tracking-[-0.04em]">{content?.title ?? "A campus timeline"}</h2>
        <div className="mt-8 border-l border-black/25 pl-6">
          {items.map((item, index) => (
            <div className="relative border-b border-black/10 py-4 last:border-0" key={`${item}-${index}`}>
              <span className="absolute -left-[29px] top-5 h-2 w-2 rounded-full bg-[#ef5a35]" />
              <p className="reader-editable font-serif text-lg">{item}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === "divider") {
    return (
      <div className="flex h-full items-center gap-5 px-7 py-6 sm:px-10">
        <span className="h-px flex-1 bg-black" />
        <span className="reader-editable text-[9px] font-bold uppercase tracking-[0.2em]">{content?.title ?? "A new chapter"}</span>
        <span className="h-px flex-1 bg-black" />
      </div>
    );
  }

  if (type === "footer") {
    return (
      <div className="flex h-full flex-col justify-between border-t border-black p-7 sm:p-10">
        <h2 className="reader-editable font-serif text-4xl">{content?.title ?? "Until next week, stay curious."}</h2>
        <p className="reader-editable text-[10px] uppercase tracking-[0.16em] text-black/50">
          Published weekly by the University Editorial Guild · Distributed across campus
        </p>
      </div>
    );
  }

  if (type === "crossword") {
    return (
      <div className="flex h-full min-h-[260px] flex-col items-center justify-center border border-dashed border-black/25 bg-[#f8f5ed] p-8 text-center">
        <svg className="h-8 w-8 text-[#ef5a35]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v.163a.75.75 0 01-.75.75h-.326c-.355 0-.676-.186-.959-.401a2.025 2.025 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401h.163a.75.75 0 01.75.75v.326c0 .355-.186.676-.401.959a2.025 2.025 0 00-.349 1.003c0 1.036 1.007 1.875 2.25 1.875s2.25-.84 2.25-1.875a2.025 2.025 0 00-.349-1.003.75.75 0 01-.401-.959v-.163a.75.75 0 01.75-.75h.326c.355 0 .676.186.959.401.29.221.634.349 1.003.349 1.036 0 1.875-1.007 1.875-2.25s-.84-2.25-1.875-2.25a2.025 2.025 0 00-1.003.349.75.75 0 01-.959.401h-.163a.75.75 0 01-.75-.75v-.326z" />
        </svg>
        <span className="mt-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">Newspaper Games</span>
        <h3 className="mt-2 font-serif text-2xl font-bold tracking-tight text-[#171714]">Crossword Puzzle — Coming Soon</h3>
        <p className="mt-2 max-w-sm text-xs leading-relaxed text-black/55">
          The interactive crossword puzzle is currently being redesigned with custom grid geometry and clue assistance. Stay tuned for the upcoming release!
        </p>
      </div>
    );
  }

  if (type === "sudoku") {
    return (
      <SudokuSection
        data={content?.sudoku || DEFAULT_SUDOKU}
        isEditor={false}
      />
    );
  }

  if (type === "wordsearch") {
    return (
      <WordSearchSection
        data={content?.wordsearch || DEFAULT_WORD_SEARCH}
      />
    );
  }

  // Fallback
  return (
    <div className="h-full p-7">
      <h3 className="reader-editable font-serif text-2xl">{content?.title ?? "Section"}</h3>
      <p className="reader-editable mt-2 text-sm leading-relaxed">{content?.body}</p>
    </div>
  );
}
