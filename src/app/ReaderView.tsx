import { useEffect, useState, useMemo } from "react";
import { Link, useParams } from "react-router";
import { loadPublishedIssueDocument, loadWorkspace, type Issue, type IssueDocument } from "./store";
import BrandLogo from "./BrandLogo";
import NewspaperMasthead, { type NewspaperMastheadSettings } from "./NewspaperMasthead";
import SubscribeForm from "./components/SubscribeForm";
import SudokuSection from "./games/SudokuSection";
import WordSearchSection from "./games/WordSearchSection";
import CrosswordSection from "./games/CrosswordSection";
import type { CrosswordData, SudokuData, WordSearchData } from "./games/types";
import { DEFAULT_CAMPUS_MINI_CROSSWORD, DEFAULT_SUDOKU, DEFAULT_WORD_SEARCH } from "./games/presets";
import QRCodeSvg from "./components/QRCodeSvg";

interface Section {
  id: string;
  type: string;
  width: number;
  height: string;
  freeform?: { x: number; y: number; width: number; height: number };
  content?: {
    eyebrow?: string;
    title?: string;
    layoutVariant?: string;
    mastheadStyle?: NewspaperMastheadSettings["mastheadStyle"];
    mastheadLogo?: string;
    mastheadTitle?: string;
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
    shapeKind?: "rectangle" | "circle" | "line" | "quote";
  };
}

type Pages = Section[][];
type ReaderIssue = Issue & { description?: string; date?: string; volume?: string; pages?: Pages };

const SECTION_LAYOUT_DEFAULTS: Record<string, string> = {
  events: "list", notice: "submission", interview: "feature", statistics: "dashboard",
  quote: "poster", recommendations: "shortlist", footer: "sign-off", gallery: "diptych",
};

const CAMPUS_IMAGE =
  "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=85&w=1600";

const PALETTES: Record<string, { accent: string; paper: string; ink: string; workspace: string }> = {
  campus: { accent: "#ef5a35", paper: "#f8f5ed", ink: "#171714", workspace: "#dedbd3" },
  library: { accent: "#3e6a59", paper: "#f3f0e7", ink: "#18201c", workspace: "#d9ddd8" },
  literary: { accent: "#7d5a87", paper: "#f7f1eb", ink: "#241b26", workspace: "#dfd8df" },
  academic: { accent: "#315b75", paper: "#f3f4f1", ink: "#17232a", workspace: "#d9dfe1" },
  monochrome: { accent: "#171714", paper: "#ffffff", ink: "#111111", workspace: "#ddddda" },
  "rv-classic": { accent: "#D7AC54", paper: "#EBEBD3", ink: "#233039", workspace: "#deded0" },
};

const FONT_PAIRS: Record<string, { serif: string; sans: string }> = {
  newsreader: { serif: '"Newsreader", Georgia, serif', sans: '"DM Sans", sans-serif' },
  classic: { serif: "Georgia, serif", sans: "Arial, sans-serif" },
  modern: { serif: "Arial, sans-serif", sans: "Arial, sans-serif" },
  traditional: { serif: '"Times New Roman", serif', sans: "Helvetica, Arial, sans-serif" },
  "rv-classic": { serif: '"Playfair Display", Georgia, serif', sans: '"Cantarell", "Helvetica Neue", Arial, sans-serif' },
};

export default function ReaderView() {
  const { issueId = "issue-08" } = useParams();
  const [copied, setCopied] = useState(false);
  const [readingTheme, setReadingTheme] = useState<"warm" | "cream" | "night">("warm");
  const [pollVoted, setPollVoted] = useState<number | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [publishedIssue, setPublishedIssue] = useState<Issue | null>(null);
  const [remoteDocument, setRemoteDocument] = useState<IssueDocument | null>(null);

  useEffect(() => {
    let active = true;
    loadPublishedIssueDocument(issueId).then((published) => {
      if (!active || !published) return;
      setPublishedIssue(published.issue);
      setRemoteDocument(published.document);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [issueId]);

  // Load workspace & issue
  const workspace = useMemo(() => loadWorkspace(), []);
  const issue: ReaderIssue = useMemo(() => {
    return (
      publishedIssue ?? workspace.issues.find((item) => item.id === issueId) ?? {
        id: issueId,
        title: "Campus Edition",
        week: "September 2026",
        description: "Weekly student voices, campus notes, and long-form features.",
        date: "September 2026",
        volume: "Vol. 1 · No. 8",
        status: "published",
        folderId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pages: [],
      }
    );
  }, [workspace, issueId, publishedIssue]);

  // Load pages layout
  const pages: Pages = useMemo(() => {
    if (remoteDocument?.pages) return remoteDocument.pages as Pages;
    try {
      const stored = localStorage.getItem(`iow-layout-${issueId}`);
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    return issue.pages?.length ? issue.pages : [[]];
  }, [issueId, issue.pages, remoteDocument]);

  // Palette & Font
  const paletteId = remoteDocument?.paletteId ?? localStorage.getItem(`iow-palette-${issueId}`) ?? "campus";
  const fontId = remoteDocument?.fontId ?? localStorage.getItem(`iow-font-${issueId}`) ?? "newsreader";
  const palette = PALETTES[paletteId] ?? PALETTES.campus;
  const fontPair = FONT_PAIRS[fontId] ?? FONT_PAIRS.newsreader;
  const newspaper = pages[0]?.[0]?.id === "paper-masthead";
  const freeformMode = remoteDocument?.freeformMode ?? localStorage.getItem(`iow-freeform-${issueId}`) === "true";
  const masthead = pages[0]?.find((section) => section.id === "paper-masthead")?.content;

  // Stored content
  const storedContent = useMemo(() => {
    if (remoteDocument?.content) return remoteDocument.content;
    try {
      const raw = localStorage.getItem(`iow-content-${issueId}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [issueId, remoteDocument]);

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
          {pages.map((sections, pageIndex) => {
            let fallbackY = 12;
            const freeformRects = sections.map((section) => {
              const defaultHeight = section.height === "tall" ? 480 : section.height === "compact" ? 190 : 330;
              const rect = section.freeform ?? { x: 4, y: fallbackY, width: 92, height: defaultHeight };
              fallbackY = Math.max(fallbackY, rect.y + rect.height + 18);
              return rect;
            });
            return (
            <article
              className="page mb-10 overflow-hidden bg-[#f8f5ed] shadow-xl"
              key={pageIndex}
              style={{
                backgroundColor: readingTheme === "night" ? "#1e1e1b" : palette.paper,
                color: readingTheme === "night" ? "#f3f0e8" : palette.ink,
              }}
            >
              {/* Publication masthead */}
              {newspaper ? (
                <div className="mx-6 border-b-4 border-double border-black px-1 pb-3 pt-6 sm:mx-10 md:mx-14">
                  <div className="flex items-center justify-between border-b border-black/40 pb-2 text-[8px] font-bold uppercase tracking-[0.16em]"><span>Independent student press</span><span>Vol. 01 · No. {String(pageIndex + 1).padStart(2, "0")}</span><span>University edition</span></div>
                  <NewspaperMasthead className="my-1" settings={masthead} />
                  <p className="mb-1 text-center font-serif text-[9px] uppercase tracking-[0.2em]">News · Opinion · Arts · Campus life</p>
                  <div className="flex justify-between border-t border-black/40 pt-2 font-serif text-[9px] uppercase tracking-[0.1em]"><span>Reporting from campus</span><span>Edition {String(pageIndex + 1).padStart(2, "0")} of {String(pages.length).padStart(2, "0")}</span></div>
                </div>
              ) : (
                <div className="mx-6 flex items-end justify-between border-b border-black/20 pb-3 pt-7 sm:mx-10 md:mx-14">
                  <BrandLogo className="h-12 w-24 object-left" />
                  <div className="flex items-center gap-5 text-[9px] font-semibold uppercase tracking-[0.18em]">
                    <span>The University Edition</span>
                    <span className="text-[#ef5a35]">{String(pageIndex + 1).padStart(2, "0")} / {String(pages.length).padStart(2, "0")}</span>
                  </div>
                </div>
              )}

              {/* Page Grid */}
              <div className={`page-grid ${freeformMode ? "page-grid-freeform" : ""}`} style={freeformMode ? { minHeight: Math.max(1100, fallbackY + 24) } : undefined}>
                {sections.map((section, sectionIndex) => (
                  <div
                    className={`builder-block height-${section.height}`}
                    data-section-type={section.type}
                    data-layout-variant={section.content?.layoutVariant ?? SECTION_LAYOUT_DEFAULTS[section.type]}
                    key={section.id}
                    style={freeformMode ? { position: "absolute", left: `${freeformRects[sectionIndex].x}%`, top: freeformRects[sectionIndex].y, width: `${freeformRects[sectionIndex].width}%`, height: freeformRects[sectionIndex].height, minHeight: 0 } : { gridColumn: `span ${section.width}` }}
                  >
                    <ReaderSectionContent
                      isPlayingAudio={isPlayingAudio}
                      onAudioToggle={() => setIsPlayingAudio(!isPlayingAudio)}
                      onVote={(opt) => setPollVoted(opt)}
                      pollVoted={pollVoted}
                      section={section}
                      storageKey={`iow-media-${issueId}-${section.id}`}
                    />
                  </div>
                ))}
              </div>
            </article>
          ); })}
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
  let photoMeta: { x?: number; y?: number; position?: string; zoom?: number } = {};
  try { photoMeta = JSON.parse(localStorage.getItem(`${storageKey}-meta`) ?? "{}"); } catch { /* Center the image when crop data cannot be read. */ }

  if (type === "textBox") return <div className="flex h-full flex-col justify-center gap-3 border border-black/15 p-6 sm:p-9"><h2 className="reader-editable font-serif text-3xl leading-tight">{content?.title ?? "Text"}</h2><p className="reader-editable whitespace-pre-line text-sm leading-relaxed">{content?.body ?? ""}</p></div>;
  if (type === "shapeBox") {
    const shape = content?.shapeKind ?? "rectangle";
    return <div className="grid h-full min-h-24 place-items-center p-6"><div className={`grid h-full min-h-24 w-full place-items-center border border-black/15 bg-[#eee9df] px-5 py-4 text-center ${shape === "circle" ? "rounded-full" : shape === "quote" ? "border-l-4 border-l-[#ef5a35] bg-transparent text-left" : ""} ${shape === "line" ? "min-h-0 h-px border-0 bg-black/70 p-0" : ""}`}>{shape !== "line" && <p className="reader-editable font-serif text-xl">{content?.title ?? ""}</p>}</div></div>;
  }
  if (type === "imageBox") return <div className="relative h-full min-h-24 overflow-hidden bg-[#e8e5de]">{storedPhoto && <img alt={content?.body ?? "Editorial photograph"} className="h-full w-full object-cover" src={storedPhoto} style={{ objectPosition: photoMeta.x !== undefined ? `${photoMeta.x}% ${photoMeta.y ?? 50}%` : photoMeta.position, transform: `scale(${(photoMeta.zoom ?? 100) / 100})` }} />}</div>;

  if (type === "cover") {
    return (
      <div className="grid h-full gap-8 bg-[#f8f5ed] p-7 text-[#25231f] sm:p-10 md:grid-cols-[1fr_2.15fr] md:p-14">
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
            style={{ objectPosition: photoMeta.x !== undefined ? `${photoMeta.x}% ${photoMeta.y ?? 50}%` : photoMeta.position, transform: `scale(${(photoMeta.zoom ?? 100) / 100})` }}
          />
        </div>
        <p className="reader-editable px-5 py-3 text-[9px] uppercase tracking-[0.13em] text-black/50">
          {content?.body ?? "Campus in motion · Photography"}
        </p>
      </div>
    );
  }

  if (type === "gallery") {
    const variant = content?.layoutVariant ?? "diptych";
    const sources = ["a", "b", "c"].map((suffix) => localStorage.getItem(`${storageKey}-${suffix}`));
    return (
      <div className={`grid h-full gap-2 bg-[#eee8dc] p-2 ${variant === "feature" ? "sm:grid-cols-[1.6fr_1fr]" : variant === "filmstrip" ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {sources.slice(0, variant === "filmstrip" ? 3 : 2).map((src, index) => (
          <figure className="relative min-h-48 overflow-hidden bg-[#d8d0c1]" key={index}>
            {src ? <img alt={`Campus gallery photograph ${index + 1}`} className="absolute inset-0 h-full w-full object-cover" src={src} /> : <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(145deg,#ded5c6,#c7bdac)]"><span className="font-serif text-sm italic text-[#51483e]/65">Photograph {String(index + 1).padStart(2, "0")}</span></div>}
            <figcaption className="absolute bottom-0 left-0 bg-[#171714]/75 px-3 py-2 text-[8px] font-semibold uppercase tracking-[0.12em] text-white">Campus dispatch · {String(index + 1).padStart(2, "0")}</figcaption>
          </figure>
        ))}
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
    const variant = content?.layoutVariant ?? "poster";
    return (
      <div className={`flex h-full flex-col justify-between p-8 sm:p-10 ${variant === "pull-quote" ? "bg-[#f2ecdf] text-[#25231f]" : variant === "framed" ? "border-4 border-double border-black/45 bg-[#f8f5ed] text-[#25231f]" : "bg-[#f8f5ed] text-[#25231f]"}`}>
        <p className="reader-editable text-[9px] font-bold uppercase tracking-[0.18em] text-[#a14b32]">In their own words</p>
        <h2 className={`reader-editable my-10 font-serif italic leading-tight ${variant === "pull-quote" ? "border-l-4 border-[#a84e38] pl-7 text-4xl sm:text-5xl" : "text-3xl sm:text-4xl"}`}>
          {content?.body ?? "“The university is not just where we learn. It is what we make together.”"}
        </h2>
        <p className="reader-editable text-[10px] uppercase tracking-[0.14em]">{content?.byline ?? "— Student contributor"}</p>
      </div>
    );
  }

  if (type === "events") {
    const variant = content?.layoutVariant ?? "list";
    return (
      <div className={`h-full p-7 sm:p-10 ${variant === "calendar" ? "bg-[#f2ecdf]" : ""}`}>
        <h2 className="reader-editable mb-6 font-serif text-4xl tracking-[-0.04em]">{content?.title ?? "This week"}</h2>
        {content?.body ? (
          <div className={variant === "calendar" ? "grid gap-3 sm:grid-cols-2" : ""}><p className="reader-editable whitespace-pre-line border-y border-black/30 py-6 font-serif text-xl leading-[1.8]">{content.body}</p></div>
        ) : (
        <div className={variant === "calendar" ? "grid gap-3 sm:grid-cols-2" : ""}>
        {[
          ["MON 22", "Open mic night", "Student Union · 7:30 PM"],
          ["WED 24", "Astronomy Club stargazing", "East Lawn · 9:00 PM"],
          ["THU 25", "Women’s football: Home game", "University Field · 5:00 PM"],
          ["SAT 27", "Autumn societies fair", "Main Quad · 11:00 AM"],
        ].map(([date, title, place]) => (
          <div className={`grid gap-2 border-t py-5 sm:grid-cols-[70px_1fr] ${variant === "calendar" ? "rounded-sm border-[#302b25]/15 bg-white/65 px-4" : "border-black/30"}`} key={title}>
            <span className="text-[9px] font-bold text-[#a14b32]">{date}</span>
            <div>
              <h3 className="reader-editable font-serif text-2xl leading-tight">{title}</h3>
              <p className="reader-editable mt-1 text-[9px] uppercase tracking-[0.12em] text-black/45">{place}</p>
            </div>
          </div>
        ))}
        </div>
        )}
      </div>
    );
  }

  if (type === "interview") {
    const variant = content?.layoutVariant ?? "feature";
    return (
      <div className={`grid h-full bg-[#f8f5ed] text-[#25231f] ${variant === "profile" ? "md:grid-cols-2" : variant === "rapid-fire" ? "md:grid-cols-[0.4fr_1.6fr]" : "md:grid-cols-[0.65fr_1.35fr]"}`}>
        <div className="flex flex-col justify-between border-b border-black/15 p-7 md:border-b-0 md:border-r sm:p-9">
          <p className="reader-editable text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">{content?.eyebrow ?? "Five questions"}</p>
          <h2 className="reader-editable mt-12 font-serif text-3xl leading-[0.95] tracking-[-0.04em] sm:text-4xl">{content?.title ?? "A conversation with someone shaping campus"}</h2>
          <p className="reader-editable mt-7 text-[9px] uppercase tracking-[0.14em] text-black/45">{content?.byline ?? "Interview by the editorial team"}</p>
        </div>
        <p className="reader-editable whitespace-pre-line p-7 font-serif text-lg leading-[1.65] text-black/75 sm:p-9">
          {content?.body ?? "Q — What idea are you carrying with you this semester?\n\nA — That the most useful work often begins as a conversation between people who see the same problem differently.\n\nQ — Where should students begin?\n\nA — With curiosity, and with one another."}
        </p>
      </div>
    );
  }

  if (type === "audio") {
    return (
      <div className="flex h-full flex-col justify-between border-y border-black/15 bg-[#f2ecdf] p-7 text-[#25231f] sm:p-9">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">Campus Audio · Playlist</span>
            <span className="flex items-center gap-1.5 text-[8px] uppercase tracking-[0.14em] text-black/50">
              <span className={`h-1.5 w-1.5 rounded-full bg-[#ef5a35] ${isPlayingAudio ? "animate-ping" : ""}`} />
              {isPlayingAudio ? "Now Playing" : "Campus Radio"}
            </span>
          </div>
          <h3 className="reader-editable mt-3 font-serif text-3xl sm:text-4xl">
            {content?.title ?? "Tracks from the Library Basement"}
          </h3>
          <p className="reader-editable mt-2 text-xs leading-relaxed text-black/60">
            {content?.body ?? "Curated by the Campus Radio Society. Songs playing across study halls, rehearsal rooms, and dorm kitchens this week."}
          </p>
        </div>
        <div className="mt-6 flex items-center justify-between border-t border-black/15 pt-4">
          <div className="flex items-center gap-3">
            <button
              className="grid h-10 w-10 place-items-center rounded-full border border-black/15 bg-[#f8f5ed] text-[#a14b32] transition hover:scale-105"
              onClick={onAudioToggle}
              title={isPlayingAudio ? "Pause preview" : "Play preview"}
              type="button"
            >
              {isPlayingAudio ? "❚❚" : "▶"}
            </button>
            <div>
              <p className="text-xs font-semibold text-black/80">
                Track 01 · Late Autumn Reverie
              </p>
              <p className="text-[10px] text-black/45">
                The Student Quartet · 3:42
              </p>
            </div>
          </div>
          <span className="rounded-full border border-black/15 px-3 py-1 text-[8px] font-bold uppercase tracking-[0.12em] text-black/55">
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
    const variant = content?.layoutVariant ?? "submission";
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
      <div className={`flex h-full flex-col justify-between border p-6 sm:p-7 ${variant === "announcement" ? "border-black/25 bg-[#f8f5ed]" : variant === "classifieds" ? "border-dashed border-black/35 bg-[#f8f5ed]" : "border-black bg-[#f8f5ed]"}`}>
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
    const variant = content?.layoutVariant ?? "dashboard";
    return (
      <div className={`h-full p-7 sm:p-9 ${variant === "comparison" ? "bg-[#f2ecdf]" : ""}`}>
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

  if (type === "recommendations") {
    const variant = content?.layoutVariant ?? "shortlist";
    const picks = content?.body?.split("\n").filter(Boolean) ?? [
      "01 · Read · A book to carry between lectures",
      "02 · Watch · A film everyone will be discussing",
      "03 · Listen · The conversation of the week",
    ];
    return (
      <div className={`h-full p-7 sm:p-9 ${variant === "shelf" ? "bg-[#f2ecdf]" : ""}`}>
        <p className="reader-editable text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">{content?.eyebrow ?? "The shortlist"}</p>
        <h2 className="reader-editable mt-4 font-serif text-4xl tracking-[-0.04em]">{content?.title ?? "Things worth your time"}</h2>
        <div className="mt-7 divide-y divide-black/20 border-y border-black/20">
          {picks.map((pick, index) => {
            const [kind, ...rest] = pick.split(" · ");
            return (
              <div className={`grid gap-3 py-4 ${variant === "categories" ? "border-l-2 border-[#a14b32] pl-4 sm:grid-cols-[100px_1fr]" : variant === "shelf" ? "mx-1 my-2 border border-black/10 bg-white/55 px-4 grid-cols-[34px_1fr] sm:grid-cols-[42px_90px_1fr]" : "grid-cols-[34px_1fr] sm:grid-cols-[42px_90px_1fr]"}`} key={`${pick}-${index}`}>
                {variant !== "categories" && <span className="font-mono text-[9px] font-bold text-[#a24b35]">{String(index + 1).padStart(2, "0")}</span>}
                {variant === "categories" ? <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-[#a24b35]">{kind.split(" · ").pop()}</span> : <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-black/45">{kind.split(" · ").pop()}</span>}
                <p className="reader-editable font-serif text-lg leading-tight">{rest.join(" · ") || pick}</p>
              </div>
            );
          })}
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
    const variant = content?.layoutVariant ?? "sign-off";
    return (
      <div className={`flex h-full flex-col justify-between border-t border-black p-7 sm:p-10 ${variant === "contact" ? "bg-[#faf8f2]" : variant === "subscribe" ? "items-center bg-[#f2ecdf] text-center" : ""}`}>
        <h2 className="reader-editable font-serif text-4xl">{content?.title ?? "Until next week, stay curious."}</h2>
        <p className="reader-editable whitespace-pre-line text-[10px] uppercase tracking-[0.16em] text-black/50">
          {content?.body ?? (variant === "contact" ? "Write to the editorial desk · editor@university.edu\nFind us on campus · Student Union, Room 204" : variant === "subscribe" ? "Get the next edition in your inbox · Join the weekly campus dispatch" : "Published weekly by the University Editorial Guild · Distributed across campus")}
        </p>
      </div>
    );
  }

  if (type === "crossword") {
    return <CrosswordSection data={content?.crossword || DEFAULT_CAMPUS_MINI_CROSSWORD} />;
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
