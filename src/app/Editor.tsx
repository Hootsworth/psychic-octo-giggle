import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Link, useParams } from "react-router";
import { activateWorkspaceOwner, hydrateWorkspace, loadIssueDocument, loadWorkspace, saveIssueDocument, updateIssue, type Issue } from "./store";
import { cloneTemplatePages, saveCustomTemplate } from "./templates";
import { rewriteWithAi } from "./ai";
import { checkAiQuota, loadPreferences } from "./settingsStore";
import BrandLogo from "./BrandLogo";
import NewspaperMasthead, { type NewspaperMastheadSettings } from "./NewspaperMasthead";
import { useAuth } from "./AuthContext";
import { useCollaboration } from "./collaboration/useCollaboration";
import MultiplayerCursors from "./collaboration/MultiplayerCursors";
import CollaboratorAvatars from "./collaboration/CollaboratorAvatars";
import CommentsPanel from "./collaboration/CommentsPanel";
import NewsroomChat from "./collaboration/NewsroomChat";
import type { DocChangePayload, EditorialComment, NewsroomMessage } from "./collaboration/types";
import SudokuSection from "./games/SudokuSection";
import WordSearchSection from "./games/WordSearchSection";
import CrosswordSection from "./games/CrosswordSection";
import CrosswordEditorModal from "./games/CrosswordEditorModal";
import type { CrosswordData, SudokuData, WordSearchData } from "./games/types";
import { DEFAULT_CAMPUS_MINI_CROSSWORD, DEFAULT_SUDOKU, DEFAULT_WORD_SEARCH } from "./games/presets";
import { dialog } from "./components/ModalDialog";
import QRCodeSvg from "./components/QRCodeSvg";
import NoticeboardQrModal, { type NoticeboardQrConfig } from "./components/NoticeboardQrModal";
import { toast } from "./components/Toast";
import KeyboardShortcutsModal from "./components/KeyboardShortcutsModal";
import ShareModal from "./components/ShareModal";
import PhotoPickerModal from "./components/PhotoPickerModal";
import FloatingFormatToolbar from "./components/FloatingFormatToolbar";
import EmailExportModal from "./components/EmailExportModal";

const CAMPUS_IMAGE =
  "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=85&w=1600";
const unsyncedMedia = new Map<string, string>();
const unsyncedMediaMeta = new Map<string, Record<string, unknown>>();

type SectionType =
  | "cover"
  | "heading"
  | "article"
  | "photo"
  | "poem"
  | "quote"
  | "events"
  | "gossip"
  | "gallery"
  | "notice"
  | "divider"
  | "footer"
  | "interview"
  | "statistics"
  | "timeline"
  | "recommendations"
  | "audio"
  | "poll"
  | "crossword"
  | "sudoku"
  | "wordsearch"
  | "textBox"
  | "shapeBox"
  | "imageBox";

type Section = {
  id: string;
  type: SectionType;
  width: number;
  height: "compact" | "regular" | "tall";
  freeform?: { x: number; y: number; width: number; height: number };
  content?: {
    eyebrow?: string;
    title?: string;
    layoutVariant?: string;
    mastheadStyle?: NewspaperMastheadSettings["mastheadStyle"];
    mastheadLogo?: string;
    mastheadTitle?: string;
    byline?: string;
    body?: string;
    articleLayout?: ArticleLayout;
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
    fillColor?: string;
    textSize?: string;
  };
};

type ArticleLayout = "classic" | "compact" | "hero" | "image-left" | "image-right" | "photo-essay";

const SECTION_LAYOUTS: Partial<Record<SectionType, { id: string; label: string }[]>> = {
  events: [{ id: "list", label: "Chronicle" }, { id: "calendar", label: "Calendar grid" }, { id: "timeline", label: "Timeline" }],
  notice: [{ id: "submission", label: "Submission call" }, { id: "announcement", label: "Announcement" }, { id: "classifieds", label: "Classifieds" }],
  interview: [{ id: "feature", label: "Feature Q&A" }, { id: "profile", label: "Profile" }, { id: "rapid-fire", label: "Rapid fire" }],
  statistics: [{ id: "dashboard", label: "Data dashboard" }, { id: "hero-number", label: "Hero statistic" }, { id: "comparison", label: "Comparison" }],
  quote: [{ id: "poster", label: "Color poster" }, { id: "pull-quote", label: "Editorial pull quote" }, { id: "framed", label: "Framed card" }],
  recommendations: [{ id: "shortlist", label: "Shortlist" }, { id: "shelf", label: "Magazine shelf" }, { id: "categories", label: "By category" }],
  footer: [{ id: "sign-off", label: "Sign-off" }, { id: "contact", label: "Contact panel" }, { id: "subscribe", label: "Subscribe panel" }],
  gallery: [{ id: "diptych", label: "Diptych" }, { id: "feature", label: "Feature pair" }, { id: "filmstrip", label: "Film strip" }],
};

type ArticleTemplate = {
  id: ArticleLayout;
  name: string;
  description: string;
  size: string;
  width: Section["width"];
  height: Section["height"];
  imageCount: number;
};

const ARTICLE_TEMPLATES: ArticleTemplate[] = [
  { id: "classic", name: "Classic column", description: "A quiet two-column feature with room to read.", size: "Full · Regular", width: 12, height: "regular", imageCount: 0 },
  { id: "compact", name: "Short read", description: "A narrow, quick-reading brief for smaller stories.", size: "2/3 · Regular", width: 8, height: "regular", imageCount: 0 },
  { id: "hero", name: "Photo lead", description: "A wide image opens the story above its headline.", size: "Full · Tall", width: 12, height: "tall", imageCount: 1 },
  { id: "image-left", name: "Image on left", description: "A portrait image paired with the story text.", size: "Full · Tall", width: 12, height: "tall", imageCount: 1 },
  { id: "image-right", name: "Image on right", description: "An offset image balances the editorial column.", size: "Full · Tall", width: 12, height: "tall", imageCount: 1 },
  { id: "photo-essay", name: "Photo essay", description: "Two images introduce one shared feature.", size: "Full · Tall", width: 12, height: "tall", imageCount: 2 },
];

type Pages = Section[][];
type PagePresetKind =
  | "blank"
  | "title-editorial"
  | "title-minimal"
  | "title-split"
  | "contents-classic"
  | "contents-grid"
  | "contents-numeric"
  | "final";
type StudioTab = "pages" | "preflight" | "history" | "templates" | "media" | "export";
type DocumentCheckpoint = {
  id: string;
  label: string;
  at: string;
  pages: Pages;
  content: string[];
  paletteId: string;
  fontId: string;
  sourceText: string;
  media: Record<string, string>;
};
type PublicationStyleGuide = { paletteId: string; fontId: string; headlineStyle: string; bylineConvention: string };
type PendingSuggestion = { id: string; original: string; proposed: string; apply: (value: string) => void; isCurrent: () => boolean };
const STYLE_GUIDE_KEY = "iow-publication-style-guide";
const loadPublicationStyleGuide = (): PublicationStyleGuide => {
  try { return JSON.parse(localStorage.getItem(STYLE_GUIDE_KEY) ?? "null") ?? { paletteId: "campus", fontId: "newsreader", headlineStyle: "Editorial serif", bylineConvention: "By the editorial team" }; }
  catch { return { paletteId: "campus", fontId: "newsreader", headlineStyle: "Editorial serif", bylineConvention: "By the editorial team" }; }
};

const SECTION_OPTIONS: { type: SectionType; name: string; description: string }[] = [
  { type: "heading", name: "Section heading", description: "Large editorial title" },
  { type: "article", name: "Article", description: "Headline and body copy" },
  { type: "photo", name: "Campus photo", description: "Uploadable image and caption" },
  { type: "imageBox", name: "Image box", description: "A freely sized image frame with crop controls" },
  { type: "textBox", name: "Text box", description: "A simple editable text frame" },
  { type: "shapeBox", name: "Shape", description: "Add a rectangle, circle, line, or quote panel" },
  { type: "poem", name: "Poetry", description: "Student poem with byline" },
  { type: "quote", name: "Pull quote", description: "Bold highlighted quotation" },
  { type: "events", name: "Events list", description: "Weekly dates and activities" },
  { type: "gossip", name: "Gossip corner", description: "Clubs and campus whispers" },
  { type: "gallery", name: "Photo pair", description: "Two uploadable images" },
  { type: "notice", name: "Noticeboard", description: "Submission call & announcement with trackable QR code" },
  { type: "divider", name: "Divider", description: "Labelled section break" },
  { type: "interview", name: "Interview", description: "Designed question and answer feature" },
  { type: "statistics", name: "By the numbers", description: "Large statistics and key figures" },
  { type: "timeline", name: "Timeline", description: "Chronological milestones or schedule" },
  { type: "recommendations", name: "Recommendations", description: "Curated books, films, links, or places" },
  { type: "audio", name: "Campus Audio", description: "Embedded playlist, podcast episode or campus radio track" },
  { type: "poll", name: "Student Poll", description: "Interactive community poll with live options" },
  { type: "crossword", name: "Crossword", description: "A beautifully typeset, interactive campus mini crossword" },
  { type: "sudoku", name: "Sudoku Puzzle", description: "Classic 9×9 newspaper number puzzle" },
  { type: "wordsearch", name: "Word Search", description: "Campus-themed word finding puzzle" },
];

const DEFAULT_PAGES = cloneTemplatePages("campus-weekly") as Pages;

const PALETTES = [
  { id: "campus", name: "Campus Orange", accent: "#ef5a35", paper: "#f8f5ed", ink: "#171714", workspace: "#dedbd3" },
  { id: "library", name: "Library Green", accent: "#3e6a59", paper: "#f3f0e7", ink: "#18201c", workspace: "#d9ddd8" },
  { id: "literary", name: "Literary Plum", accent: "#7d5a87", paper: "#f7f1eb", ink: "#241b26", workspace: "#dfd8df" },
  { id: "academic", name: "Academic Blue", accent: "#315b75", paper: "#f3f4f1", ink: "#17232a", workspace: "#d9dfe1" },
  { id: "monochrome", name: "Monochrome", accent: "#171714", paper: "#ffffff", ink: "#111111", workspace: "#ddddda" },
  { id: "rv-classic", name: "RV University Classic", accent: "#D7AC54", paper: "#EBEBD3", ink: "#233039", workspace: "#deded0" },
];

const FONT_PAIRS = [
  { id: "newsreader", name: "Newsreader + DM Sans", serif: '"Newsreader", Georgia, serif', sans: '"DM Sans", sans-serif' },
  { id: "classic", name: "Georgia + Arial", serif: "Georgia, serif", sans: "Arial, sans-serif" },
  { id: "modern", name: "Arial + Arial", serif: "Arial, sans-serif", sans: "Arial, sans-serif" },
  { id: "traditional", name: "Times + Helvetica", serif: '"Times New Roman", serif', sans: "Helvetica, Arial, sans-serif" },
  { id: "rv-classic", name: "Playfair Display + Cantarell", serif: '"Playfair Display", Georgia, serif', sans: '"Cantarell", "Helvetica Neue", Arial, sans-serif' },
];

const DESIGN_TEMPLATES = [
  { id: "rv-university", name: "RV University", description: "The current warm-paper editorial design.", paletteId: "campus", fontId: "newsreader", colors: ["#f8f5ed", "#171714", "#ef5a35"] },
  { id: "rv-classic", name: "RV University Classic", description: "Slate navy, cream, restrained gold, and literary display type.", paletteId: "rv-classic", fontId: "rv-classic", colors: ["#EBEBD3", "#233039", "#D7AC54"] },
  { id: "broadsheet", name: "The Broadsheet", description: "Crisp black ink, bright stock, and a confident red rule.", paletteId: "monochrome", fontId: "traditional", colors: ["#ffffff", "#111111", "#a8432d"] },
  { id: "library-review", name: "The Library Review", description: "Quiet ivory, forest ink, and an understated literary rhythm.", paletteId: "library", fontId: "classic", colors: ["#f3f0e7", "#18201c", "#3e6a59"] },
  { id: "modern-campus", name: "Modern Campus", description: "Cool paper and blue accents for a contemporary university edition.", paletteId: "academic", fontId: "modern", colors: ["#f3f4f1", "#17232a", "#315b75"] },
];

const sourceStarter = `/Title The week ideas took over campus
Weekly notes, student voices, and everything in between.

/Article A campus made by its people
Every corridor holds a conversation. Every noticeboard is a record of what students care about right now.

/Page
/Heading Student voices

/Poetry Library at 4:17
The afternoon leans
through tall windows,
dust turning slowly
like a thought we haven’t finished.

/Quote
The university is not just where we learn. It is what we make together.

/Page
/Heading This week on campus

/Events
/Notice Send us your work
Poetry, fiction, photography, events, and ideas are all welcome.

/Final Until next week, stay curious.`;

const SLASH_COMMANDS = [
  { command: "Title", label: "Title page", description: "Large issue opener and introduction" },
  { command: "Heading", label: "Section heading", description: "Begin a new editorial chapter" },
  { command: "Article", label: "Article", description: "Headline and long-form body copy" },
  { command: "Poetry", label: "Poetry", description: "Poem with title and student byline" },
  { command: "Quote", label: "Pull quote", description: "Highlighted editorial quotation" },
  { command: "Events", label: "Events list", description: "Dates, clubs, fixtures, and activities" },
  { command: "Photo", label: "Campus photo", description: "Uploadable image with caption" },
  { command: "Gallery", label: "Photo pair", description: "Two-image campus gallery" },
  { command: "Gossip", label: "Gossip corner", description: "Clubs and campus conversation" },
  { command: "Notice", label: "Noticeboard", description: "Submission call or announcement" },
  { command: "Interview", label: "Interview", description: "Question and answer feature" },
  { command: "Statistics", label: "By the numbers", description: "Key figures and metrics" },
  { command: "Timeline", label: "Timeline", description: "Chronological milestones" },
  { command: "Recommendations", label: "Recommendations", description: "Curated things worth sharing" },
  { command: "Divider", label: "Divider", description: "Labelled visual section break" },
  { command: "Page", label: "Page break", description: "Start the next designed page" },
  { command: "Final", label: "Final page", description: "Closing statement and footer" },
];

function pagePreset(kind: PagePresetKind): Section[] {
  const stamp = Date.now();
  if (kind === "title-editorial") {
    return [
      { id: `title-${stamp}`, type: "cover", width: 12, height: "tall", content: { eyebrow: "The university edition", title: "Your issue title here" } },
      { id: `title-photo-${stamp}`, type: "photo", width: 12, height: "regular" },
    ];
  }
  if (kind === "title-minimal") {
    return [
      { id: `minimal-title-${stamp}`, type: "heading", width: 12, height: "tall", content: { eyebrow: "Volume 01 · Issue 01", title: "A quiet title with room to breathe" } },
      { id: `minimal-divider-${stamp}`, type: "divider", width: 12, height: "compact", content: { title: "The University Edition" } },
      { id: `minimal-quote-${stamp}`, type: "quote", width: 12, height: "regular", content: { body: "A single thought to set the tone for everything that follows." } },
    ];
  }
  if (kind === "title-split") {
    return [
      { id: `split-title-${stamp}`, type: "cover", width: 8, height: "tall", content: { eyebrow: "A special campus edition", title: "Two sides of one story" } },
      { id: `split-quote-${stamp}`, type: "quote", width: 4, height: "tall", content: { body: "The best issues begin with a question worth carrying." } },
      { id: `split-photo-${stamp}`, type: "photo", width: 12, height: "regular" },
    ];
  }
  if (kind === "contents-classic") {
    return [
      { id: `contents-heading-${stamp}`, type: "heading", width: 12, height: "compact", content: { eyebrow: "Inside this issue", title: "Contents" } },
      { id: `contents-list-${stamp}`, type: "notice", width: 12, height: "tall", content: { eyebrow: "Index", title: "In this edition", body: "01  Editor’s letter\n02  Student voices\n03  Campus news\n04  Clubs and events\n05  Literature and poetry\n06  This week in pictures" } },
    ];
  }
  if (kind === "contents-grid") {
    return [
      { id: `grid-heading-${stamp}`, type: "heading", width: 12, height: "compact", content: { eyebrow: "Navigate the edition", title: "What’s inside" } },
      { id: `grid-recs-${stamp}`, type: "recommendations", width: 8, height: "tall", content: { title: "Features", body: "01  The big conversation\n02  Student voices\n03  Ideas from the faculty\n04  Campus after hours" } },
      { id: `grid-notice-${stamp}`, type: "notice", width: 4, height: "tall", content: { eyebrow: "Also inside", title: "The weekly edit", body: "Events\nClubs\nSport\nNotices\nCredits" } },
    ];
  }
  if (kind === "contents-numeric") {
    return [
      { id: `numeric-heading-${stamp}`, type: "heading", width: 12, height: "compact", content: { eyebrow: "Issue guide", title: "Start anywhere" } },
      { id: `numeric-stats-${stamp}`, type: "statistics", width: 5, height: "tall", content: { title: "This issue", body: "06 stories\n12 contributors\n04 events\n01 campus" } },
      { id: `numeric-timeline-${stamp}`, type: "timeline", width: 7, height: "tall", content: { title: "Reading order", body: "01 — Opening note\n02 — The main feature\n03 — Student work\n04 — Campus wire\n05 — Final word" } },
    ];
  }
  if (kind === "final") {
    return [
      { id: `final-quote-${stamp}`, type: "quote", width: 12, height: "tall", content: { body: "Thank you for reading, writing, photographing, and making this campus what it is." } },
      { id: `final-footer-${stamp}`, type: "footer", width: 12, height: "regular", content: { title: "Until next time, stay curious." } },
    ];
  }
  return [];
}

function compileSource(source: string): Pages {
  const blocks: { command: string; title: string; body: string }[] = [];
  let current: { command: string; title: string; lines: string[] } | null = null;
  const flush = () => {
    if (current) blocks.push({ command: current.command, title: current.title, body: current.lines.join("\n").trim() });
  };
  source.split("\n").forEach((line) => {
    const match = line.match(/^\/([A-Za-z]+)(?:\s+(.*))?$/);
    if (match) {
      flush();
      current = { command: match[1].toLowerCase(), title: match[2]?.trim() ?? "", lines: [] };
    } else if (current) {
      current.lines.push(line);
    } else if (line.trim()) {
      current = { command: "article", title: "Untitled article", lines: [line] };
    }
  });
  flush();

  const pages: Pages = [[]];
  let used = 0;
  blocks.forEach((block, index) => {
    if (block.command === "page") {
      if (pages[pages.length - 1].length) pages.push([]);
      used = 0;
      return;
    }
    const map: Record<string, SectionType> = {
      title: "cover", heading: "heading", article: "article", poetry: "poem",
      poem: "poem", quote: "quote", events: "events", photo: "photo",
      notice: "notice", divider: "divider", final: "footer", gossip: "gossip",
      gallery: "gallery", interview: "interview", statistics: "statistics",
      timeline: "timeline", recommendations: "recommendations",
    };
    const type = map[block.command] ?? "article";
    const height: Section["height"] = type === "heading" || type === "divider" ? "compact" : block.body.length > 500 || type === "cover" ? "tall" : "regular";
    const cost = height === "tall" ? 4 : height === "regular" ? 3 : 1;
    if (used + cost > 7 && pages[pages.length - 1].length) {
      pages.push([]);
      used = 0;
    }
    pages[pages.length - 1].push({
      id: `source-${index}-${type}`,
      type,
      width: type === "poem" && used > 0 ? 6 : 12,
      height,
      content: {
        eyebrow: type === "poem" ? "Student poetry" : undefined,
        title: block.title || (type === "heading" ? "New section" : type === "article" ? "Article title" : undefined),
        byline: type === "poem" ? "By student contributor" : undefined,
        body: block.body || undefined,
      },
    });
    used += cost;
  });
  return pages.length ? pages : [[]];
}

function Editable({
  as: Tag = "div",
  className = "",
  children,
}: {
  as?: "div" | "p" | "h1" | "h2" | "h3" | "span";
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag
      className={`editable ${className}`}
      contentEditable
      suppressContentEditableWarning
      spellCheck
    >
      {children}
    </Tag>
  );
}

function PhotoField({
  initialImage,
  label = "Add photo",
  storageKey,
}: {
  initialImage?: string;
  label?: string;
  storageKey: string;
}) {
  const [image, setImage] = useState(() => localStorage.getItem(storageKey) ?? initialImage);
  const [meta, setMeta] = useState<{ position?: string; x?: number; y?: number; zoom?: number; alt: string }>(() => {
    try {
      return JSON.parse(localStorage.getItem(`${storageKey}-meta`) ?? '{"position":"center","alt":"Campus scene"}');
    } catch {
      return { position: "center", x: 50, y: 50, zoom: 100, alt: "Campus scene" };
    }
  });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handlePhotoUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ storageKey: string; value?: string; meta?: { position?: string; x?: number; y?: number; zoom?: number; alt: string } }>).detail;
      if (detail?.storageKey === storageKey) {
        if (detail.value !== undefined) setImage(detail.value);
        if (detail.meta !== undefined) setMeta(detail.meta);
      }
    };
    window.addEventListener("iow-photo-update", handlePhotoUpdate);
    return () => window.removeEventListener("iow-photo-update", handlePhotoUpdate);
  }, [storageKey]);

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      let blob: Blob | null = null;
      for (const quality of [0.84, 0.74, 0.64, 0.54]) {
        blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
        if (blob && blob.size <= 2.5 * 1024 * 1024) break;
      }
      if (!blob) throw new Error("This browser could not process the selected image.");
      const value = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read the selected image."));
        reader.readAsDataURL(blob!);
      });
      setImage(value);
      unsyncedMedia.set(storageKey, value);
      try {
        localStorage.setItem(storageKey, value);
      } catch { /* Upload directly from the in-memory copy below. */ }
      window.dispatchEvent(new CustomEvent("iow-photo-update", { detail: { storageKey, value, broadcast: true } }));
    } catch (error) {
        dialog.alert({
          title: "Image Could Not Be Processed",
          message: error instanceof Error ? error.message : "Try a different image file.",
          tone: "warning",
        });
    } finally {
      event.target.value = "";
    }
  };

  const updateMeta = (next: { position?: string; x?: number; y?: number; zoom?: number; alt: string }) => {
    setMeta(next);
    unsyncedMediaMeta.set(storageKey, next);
    try { localStorage.setItem(`${storageKey}-meta`, JSON.stringify(next)); } catch { /* Keep crop metadata in memory until the cloud save completes. */ }
    window.dispatchEvent(new CustomEvent("iow-photo-update", { detail: { storageKey, meta: next, broadcast: true } }));
  };

  return (
    <div className="photo-field group relative h-full min-h-52 overflow-hidden bg-[#d7d3c8]">
      {image ? (
        <img alt={meta.alt} className="h-full w-full object-cover" src={image} style={{ objectPosition: meta.x !== undefined ? `${meta.x}% ${meta.y ?? 50}%` : meta.position, transform: `scale(${(meta.zoom ?? 100) / 100})` }} />
      ) : (
        <div className="photo-placeholder flex h-full min-h-52 items-center justify-center">
          <span className="bg-[#f8f5ed] px-3 py-2 text-[9px] font-bold uppercase tracking-[0.18em]">
            Image placeholder
          </span>
        </div>
      )}
      <input accept="image/*" className="hidden" onChange={onFile} ref={inputRef} type="file" />
      <div className="editor-only absolute bottom-4 left-4 flex max-w-[calc(100%-2rem)] flex-wrap gap-1">
        <button className="rounded-full bg-[#f8f5ed] px-3.5 py-2 text-[9px] font-bold uppercase tracking-[0.14em] shadow-md hover:bg-[#ef5a35] hover:text-white dark:bg-[#1f1e1b] dark:text-[#f3f0e8] dark:hover:bg-[#ef5a35] dark:hover:text-white" onClick={() => inputRef.current?.click()} type="button">{image ? "Upload" : label}</button>
        <button
          className="inline-flex items-center gap-1.5 rounded-full bg-[#f8f5ed] px-3.5 py-2 text-[9px] font-bold uppercase tracking-[0.12em] shadow-md hover:bg-[#ef5a35] hover:text-white dark:bg-[#1f1e1b] dark:text-[#f3f0e8] dark:hover:bg-[#ef5a35] dark:hover:text-white transition"
          onClick={() => {
            window.dispatchEvent(new CustomEvent("iow-open-photo-picker", { detail: { storageKey } }));
          }}
          title="Browse curated editorial photo library"
          type="button"
        >
          <EditorIcon name="camera" />
          <span>Library</span>
        </button>
        {image && <details className="rounded-xl bg-[#f8f5ed]/95 p-2 text-[8px] shadow-md dark:bg-[#1f1e1b]/95"><summary className="cursor-pointer px-1 font-bold uppercase tracking-[0.12em]">Crop</summary><div className="grid w-36 gap-1.5 pt-2"><label className="grid grid-cols-[28px_1fr] items-center gap-1">X<input aria-label="Horizontal crop position" max="100" min="0" onChange={(event) => updateMeta({ ...meta, x: Number(event.target.value), y: meta.y ?? 50, zoom: meta.zoom ?? 100 })} type="range" value={meta.x ?? 50} /></label><label className="grid grid-cols-[28px_1fr] items-center gap-1">Y<input aria-label="Vertical crop position" max="100" min="0" onChange={(event) => updateMeta({ ...meta, x: meta.x ?? 50, y: Number(event.target.value), zoom: meta.zoom ?? 100 })} type="range" value={meta.y ?? 50} /></label><label className="grid grid-cols-[28px_1fr] items-center gap-1">Zoom<input aria-label="Image crop zoom" max="200" min="100" onChange={(event) => updateMeta({ ...meta, x: meta.x ?? 50, y: meta.y ?? 50, zoom: Number(event.target.value) })} type="range" value={meta.zoom ?? 100} /></label></div></details>}
        {image && (
          <button
            className="rounded-full bg-[#f8f5ed] px-3 py-2 text-[9px] font-bold uppercase tracking-[0.12em] shadow-md hover:bg-[#ef5a35] hover:text-white dark:bg-[#1f1e1b] dark:text-[#f3f0e8] dark:hover:bg-[#ef5a35] dark:hover:text-white"
            onClick={async () => {
              const alt = await dialog.prompt({
                title: "Image Accessibility",
                message: "Describe this image for screen readers and accessibility:",
                defaultValue: meta.alt,
                placeholder: "e.g. Students gathered on the campus lawn",
                confirmText: "Save Alt Text",
              });
              if (alt !== null) updateMeta({ ...meta, alt: alt.trim() });
            }}
            type="button"
          >
            Alt text
          </button>
        )}
      </div>
    </div>
  );
}

function PageHeader({
  page,
  total,
  newspaper = false,
  masthead,
  onUpdateMasthead,
}: {
  page: number;
  total: number;
  newspaper?: boolean;
  masthead?: NewspaperMastheadSettings;
  onUpdateMasthead?: (patch: NewspaperMastheadSettings) => void;
}) {
  if (newspaper) return (
    <div className="mx-6 border-b-4 border-double border-black px-1 pb-3 pt-6 sm:mx-10 md:mx-14">
      <div className="flex items-center justify-between border-b border-black/40 pb-2 text-[8px] font-bold uppercase tracking-[0.16em]"><span>Independent student press</span><span>Vol. 01 · No. {String(page).padStart(2, "0")}</span><span>University edition</span></div>
      <div className="group/masthead relative">
        <NewspaperMasthead className="my-1" settings={masthead} />
        {page === 1 && onUpdateMasthead && (
          <div className="editor-only absolute right-0 top-1 z-20 flex max-w-[min(90vw,30rem)] flex-wrap items-center justify-end gap-2 border border-black/15 bg-[#fbfaf7]/95 p-2 text-[8px] opacity-0 shadow-lg backdrop-blur transition-opacity group-hover/masthead:opacity-100 group-focus-within/masthead:opacity-100">
            <label className="font-bold uppercase tracking-[0.1em] text-black/50" htmlFor="masthead-style">Masthead</label>
            <select className="rounded border border-black/15 bg-white px-2 py-1.5" id="masthead-style" onChange={(event) => onUpdateMasthead({ mastheadStyle: event.target.value as NewspaperMastheadSettings["mastheadStyle"] })} value={masthead?.mastheadStyle ?? "text"}>
              <option value="brand">Use publication logo</option>
              <option value="custom-logo">Upload a different logo</option>
              <option value="text">Use title text</option>
            </select>
            {(masthead?.mastheadStyle ?? "text") === "text" && (
              <input aria-label="Masthead title" className="w-48 rounded border border-black/15 bg-white px-2 py-1.5" defaultValue={masthead?.mastheadTitle ?? "The Campus Gazette"} key={masthead?.mastheadTitle ?? "The Campus Gazette"} onBlur={(event) => onUpdateMasthead({ mastheadTitle: event.currentTarget.value })} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} placeholder="Publication title" />
            )}
            {(masthead?.mastheadStyle ?? "text") === "custom-logo" && (
              <label className="cursor-pointer rounded border border-black/15 bg-white px-2 py-1.5 font-semibold hover:border-[#a14b32]">
                {masthead?.mastheadLogo ? "Replace logo" : "Choose image"}
                <input accept="image/*" className="sr-only" onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (!file) return;
                  if (!file.type.startsWith("image/") || file.size > 2_000_000) {
                    toast.show("Choose an image smaller than 2 MB.", "error", "Logo not uploaded");
                    event.currentTarget.value = "";
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => onUpdateMasthead({ mastheadLogo: String(reader.result ?? "") });
                  reader.readAsDataURL(file);
                }} type="file" />
              </label>
            )}
          </div>
        )}
      </div>
      <p className="mb-1 text-center font-serif text-[9px] uppercase tracking-[0.2em]">News · Opinion · Arts · Campus life</p>
      <div className="flex justify-between border-t border-black/40 pt-2 font-serif text-[9px] uppercase tracking-[0.1em]"><span>Reporting from campus</span><span>Edition {String(page).padStart(2, "0")} of {String(total).padStart(2, "0")}</span></div>
    </div>
  );
  return (
    <div className="mx-6 flex items-end justify-between border-b border-black pb-3 pt-7 sm:mx-10 md:mx-14 dark:border-white/20">
      <BrandLogo className="h-14 w-28 object-left" />
      <div className="flex items-center gap-5 text-[9px] font-semibold uppercase tracking-[0.18em]">
        <Editable as="span">The University Edition</Editable>
        <span className="text-[#ef5a35]">{String(page).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
      </div>
    </div>
  );
}

function SectionContent({
  section,
  bylineConvention,
  isCoverPhoto,
  mediaKey,
  onConfigureNoticeQr,
  onEditCrossword,
}: {
  section: Section;
  bylineConvention?: string;
  isCoverPhoto?: boolean;
  mediaKey: string;
  onConfigureNoticeQr?: () => void;
  onEditCrossword?: () => void;
}) {
  const { type, content } = section;
  if (type === "textBox") {
    return <div className="flex h-full min-h-36 flex-col justify-center gap-3 border border-dashed border-black/20 p-6 sm:p-9"><Editable as="h2" className="font-serif text-3xl leading-tight">{content?.title ?? "Type a headline"}</Editable><Editable as="p" className="whitespace-pre-line text-sm leading-relaxed text-black/65">{content?.body ?? "Click here and start writing. Use the block controls to resize this text frame."}</Editable></div>;
  }
  if (type === "shapeBox") {
    const shape = content?.shapeKind ?? "rectangle";
    return <div className="grid h-full min-h-28 place-items-center p-6"><div className={`grid h-full min-h-24 w-full place-items-center border border-black/15 bg-[#eee9df] px-5 py-4 text-center ${shape === "circle" ? "rounded-full" : shape === "quote" ? "border-l-4 border-l-[#ef5a35] bg-transparent text-left" : ""} ${shape === "line" ? "min-h-0 h-px border-0 bg-black/70 p-0" : ""}`}>{shape !== "line" && <Editable as="p" className="font-serif text-xl">{content?.title ?? (shape === "quote" ? "Add a quotation" : "Shape")}</Editable>}</div></div>;
  }
  if (type === "imageBox") {
    return <PhotoField label="Add image" storageKey={mediaKey} />;
  }
  if (type === "cover") {
    return (
      <div className="grid h-full gap-8 p-7 sm:p-10 md:grid-cols-[1fr_2.15fr] md:p-14">
        <div className="flex flex-col justify-between gap-10">
          <Editable as="p" className="text-[10px] font-bold uppercase leading-relaxed tracking-[0.16em]">
            {content?.body ?? "Weekly notes, campus voices & everything in between"}
          </Editable>
          <Editable as="p" className="text-xs leading-relaxed text-black/55">
            Issue No. 08<br />September 22–28
          </Editable>
        </div>
        <div>
          <Editable as="p" className="mb-4 text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">
            {content?.eyebrow ?? "This week on campus"}
          </Editable>
          <Editable as="h1" className="headline font-serif text-[clamp(4rem,9vw,7rem)] leading-[0.8] tracking-[-0.065em]">
            {content?.title ?? "Back to where ideas begin."}
          </Editable>
        </div>
      </div>
    );
  }

  if (type === "heading") {
    return (
      <div className="h-full p-7 sm:p-10 md:p-12">
        <Editable as="p" className="mb-3 text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">
          {content?.eyebrow ?? "The university edit"}
        </Editable>
        <Editable as="h1" className="font-serif text-6xl leading-none tracking-[-0.055em] sm:text-8xl">
          {content?.title ?? "Student voices"}
        </Editable>
      </div>
    );
  }

  if (type === "article") {
    const layout = content?.articleLayout ?? "classic";
    const kicker = (
      <Editable as="p" className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#a14b32]">
        {content?.eyebrow ?? "Feature · Campus life"}
      </Editable>
    );
    const headline = (
      <Editable as="h2" className="mt-3 font-serif text-4xl leading-[0.98] tracking-[-0.04em] sm:text-5xl">
        {content?.title ?? "A new week, a blank page."}
      </Editable>
    );
    const byline = (
      <Editable as="p" className="mt-4 text-[9px] font-semibold uppercase tracking-[0.13em] text-black/50 dark:text-white/55">
        {content?.byline ?? bylineConvention ?? "By the editorial team"}
      </Editable>
    );
    const story = (
      <Editable as="p" className="drop-cap whitespace-pre-line font-serif text-base leading-[1.75] text-black/75 dark:text-white/75 sm:text-lg">
        {content?.body ?? "The campus feels different in September. New notebooks, old buildings, and the pleasant sense that anything might happen. This space belongs to the students filling it—with questions, stories, plans, and ideas."}
      </Editable>
    );

    if (layout === "hero") {
      return (
        <article className="h-full bg-[#f8f5ed] dark:bg-[#1a1916]">
          <div className="h-52 sm:h-64"><PhotoField label="Add lead image" storageKey={mediaKey} /></div>
          <div className="mx-auto max-w-3xl px-7 py-7 sm:px-12 sm:py-9">{kicker}{headline}{byline}<div className="mt-6">{story}</div></div>
        </article>
      );
    }

    if (layout === "image-left" || layout === "image-right") {
      return (
        <article className="grid h-full bg-[#f8f5ed] dark:bg-[#1a1916] md:grid-cols-2">
          <div className={`min-h-64 ${layout === "image-right" ? "md:order-2" : ""}`}><PhotoField label="Add story image" storageKey={mediaKey} /></div>
          <div className="flex flex-col justify-center p-7 sm:p-10">{kicker}{headline}{byline}<div className="mt-6">{story}</div></div>
        </article>
      );
    }

    if (layout === "photo-essay") {
      return (
        <article className="h-full bg-[#f8f5ed] p-5 dark:bg-[#1a1916] sm:p-8">
          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            <div className="h-36 sm:h-52"><PhotoField label="Add first image" storageKey={mediaKey} /></div>
            <div className="h-36 sm:h-52"><PhotoField label="Add second image" storageKey={`${mediaKey}-2`} /></div>
          </div>
          <div className="mx-auto max-w-3xl py-6 sm:py-8">{kicker}{headline}{byline}<div className="mt-5">{story}</div></div>
        </article>
      );
    }

    if (layout === "compact") {
      return (
        <article className="h-full border-l-2 border-[#a14b32] bg-[#f8f5ed] px-6 py-7 dark:bg-[#1a1916] sm:px-8">
          {kicker}{headline}<div className="mt-4">{story}</div>{byline}
        </article>
      );
    }

    return (
      <article className="grid h-full bg-[#f8f5ed] dark:bg-[#1a1916] md:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col justify-center border-b border-black/10 p-7 dark:border-white/10 sm:p-10 md:border-b-0 md:border-r">{kicker}{headline}{byline}</div>
        <div className="flex items-center p-7 sm:p-10"><div>{story}</div></div>
      </article>
    );
  }

  if (type === "photo") {
    return (
      <div className="flex h-full flex-col">
        <PhotoField initialImage={isCoverPhoto ? CAMPUS_IMAGE : undefined} label="Add campus photo" storageKey={mediaKey} />
        <Editable as="p" className="px-5 py-3 text-[9px] uppercase tracking-[0.13em] text-black/50">
          {content?.body ?? "Campus in motion · Add a caption and photo credit here"}
        </Editable>
      </div>
    );
  }

  if (type === "poem") {
    return (
      <div className="h-full p-7 sm:p-10">
        <Editable as="p" className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">
          {content?.eyebrow ?? "Featured poem"}
        </Editable>
        <Editable as="h2" className="mt-5 font-serif text-5xl tracking-[-0.04em]">{content?.title ?? "Library at 4:17"}</Editable>
        <Editable as="p" className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-black/50">
          {content?.byline ?? "By Maya Chen · English, Year III"}
        </Editable>
        <Editable as="p" className="mt-9 border-l border-black pl-7 font-serif text-xl italic leading-[1.8] sm:text-2xl">
          {content?.body ? <span className="whitespace-pre-line">{content.body}</span> : <>The afternoon leans<br />through tall windows,<br />dust turning slowly<br />like a thought<br />we haven’t finished.<br /><br />Someone closes a book.<br />The whole room listens.</>}
        </Editable>
      </div>
    );
  }

  if (type === "quote") {
    return (
      <div className={`section-layout-quote flex h-full flex-col justify-between p-8 sm:p-10 ${content?.layoutVariant === "pull-quote" ? "bg-[#f2ecdf] text-[#25231f]" : content?.layoutVariant === "framed" ? "border-4 border-double border-black/45 bg-[#f8f5ed] text-[#25231f]" : "bg-[#f8f5ed] text-[#25231f]"}`}>
        <Editable as="p" className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#a14b32]">In their own words</Editable>
        <Editable as="h2" className={`my-10 font-serif italic leading-tight ${content?.layoutVariant === "pull-quote" ? "border-l-4 border-[#a84e38] pl-7 text-5xl" : "text-4xl"}`}>
          {content?.body ?? "“The university is not just where we learn. It is what we make together.”"}
        </Editable>
        <Editable as="p" className="text-[10px] uppercase tracking-[0.14em]">{content?.byline ?? "— Student contributor"}</Editable>
      </div>
    );
  }

  if (type === "events") {
    const variant = content?.layoutVariant ?? "list";
    return (
      <div className={`h-full p-7 sm:p-10 ${variant === "calendar" ? "bg-[#f2ecdf]" : ""}`}>
        <Editable as="h2" className="mb-6 font-serif text-4xl tracking-[-0.04em]">{content?.title ?? "This week"}</Editable>
        {content?.body ? (
          <div className={variant === "calendar" ? "grid gap-3 sm:grid-cols-2" : ""}><Editable as="p" className="whitespace-pre-line border-y border-black/30 py-6 font-serif text-xl leading-[1.8]">{content.body}</Editable></div>
        ) : (
        <div className={variant === "calendar" ? "grid gap-3 sm:grid-cols-2" : ""}>
        {[
          ["MON 22", "Open mic night", "Student Union · 7:30 PM"],
          ["WED 24", "Astronomy Club stargazing", "East Lawn · 9:00 PM"],
          ["THU 25", "Women’s football: Home game", "University Field · 5:00 PM"],
          ["SAT 27", "Autumn societies fair", "Main Quad · 11:00 AM"],
        ].map(([date, title, place]) => (
          <div className={`grid gap-2 border-t py-5 sm:grid-cols-[70px_1fr] ${variant === "calendar" ? "rounded-sm border-[#302b25]/15 bg-white/65 px-4 shadow-sm" : variant === "timeline" ? "border-white/15" : "border-black/30"}`} key={title}>
            <Editable as="span" className="text-[9px] font-bold text-[#a14b32]">{date}</Editable>
            <div>
              <Editable as="h3" className="font-serif text-2xl leading-tight">{title}</Editable>
            <Editable as="p" className="mt-1 text-[9px] uppercase tracking-[0.12em] text-black/45">{place}</Editable>
            </div>
          </div>
        ))}
        </div>
        )}
      </div>
    );
  }

  if (type === "gossip") {
    return (
      <div className="h-full p-7 sm:p-9">
        <Editable as="p" className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">Heard on the quad</Editable>
        <Editable as="h2" className="mt-5 font-serif text-4xl italic leading-none tracking-[-0.04em]">The club gossip corner</Editable>
        <div className="my-7 h-px bg-black/20" />
        <Editable as="p" className="font-serif text-lg leading-[1.6]">
          Rumour has it the Film Society’s “secret screening” is a nineties
          classic—and the Debate Club has challenged the Chess Club to settle
          their rivalry somewhere other than the group chat.
        </Editable>
      </div>
    );
  }

  if (type === "gallery") {
    const variant = content?.layoutVariant ?? "diptych";
    return (
      <div className={`grid h-full gap-2 bg-[#f8f5ed] p-2 ${variant === "feature" ? "sm:grid-cols-[1.6fr_1fr]" : variant === "filmstrip" ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        <PhotoField label="Add club photo" storageKey={`${mediaKey}-a`} />
        <PhotoField label="Add event photo" storageKey={`${mediaKey}-b`} />
        {variant === "filmstrip" && <PhotoField label="Add third photo" storageKey={`${mediaKey}-c`} />}
      </div>
    );
  }

  if (type === "notice") {
    const variant = content?.layoutVariant ?? "submission";
    const qrEnabled = content?.qrEnabled !== false;
    const rawUrl = content?.qrUrl || "https://newsletter.singulr.tech/submit";
    const qrLabel = content?.qrLabel || "Scan to Submit Work";
    const campaign = content?.qrCampaign || "issue-submissions";
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
      <div className={`group/notice relative flex h-full flex-col justify-between border p-6 sm:p-7 ${variant === "announcement" ? "border-black/25 bg-[#f8f5ed]" : variant === "classifieds" ? "border-dashed border-black/35 bg-[#f8f5ed]" : "border-black bg-[#f8f5ed]"}`}>
        <div>
          <div className="flex items-center justify-between">
            <Editable as="p" className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">
              {content?.eyebrow ?? "Noticeboard"}
            </Editable>
            {onConfigureNoticeQr && (
              <button
                className="editor-only flex items-center gap-1 rounded-full border border-black/15 bg-white/80 px-2.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-black/70 hover:border-[#ef5a35] hover:bg-[#ef5a35] hover:text-white transition shadow-xs"
                onClick={onConfigureNoticeQr}
                title="Configure QR Code & Track Submissions"
                type="button"
              >
                <span className="inline-flex items-center gap-1">
                  <EditorIcon name="gear" />
                  <span>QR Tracker</span>
                </span>
              </button>
            )}
          </div>
          <Editable as="h2" className="mt-4 font-serif text-3xl leading-tight">
            {content?.title ?? "Submit your work"}
          </Editable>
          <Editable as="p" className="mt-4 whitespace-pre-line text-sm leading-relaxed">
            {content?.body ?? "Poetry, short fiction, essays, photography, illustration, or fragments we don’t have a name for yet."}
          </Editable>
        </div>

        <div className="mt-6 border-t border-black/15 pt-5">
          <Editable as="p" className="text-xs leading-relaxed text-black/60">
            {content?.noticeDetails ?? "Send up to 1,500 words to words@university.edu by Friday at noon."}
          </Editable>

          {qrEnabled && (
            <div
              className={`mt-4 flex items-center gap-3.5 rounded-xl border border-black/15 bg-white/85 p-3 shadow-xs transition ${
                onConfigureNoticeQr ? "cursor-pointer hover:border-[#ef5a35] hover:shadow-md" : ""
              }`}
              onClick={onConfigureNoticeQr}
              title={onConfigureNoticeQr ? "Click to configure QR link & tracking" : undefined}
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
                  <span className="h-1.5 w-1.5 rounded-full bg-[#ef5a35] animate-pulse" />
                  <span className="text-[8.5px] font-bold uppercase tracking-widest text-[#ef5a35]">
                    Submissions Portal
                  </span>
                </div>
                <p className="mt-0.5 font-serif text-sm font-semibold leading-tight text-[#171714] truncate">
                  {qrLabel}
                </p>
                <p className="mt-1 text-[9px] text-black/50 truncate font-mono">
                  {finalTrackedUrl.replace(/^https?:\/\//, "")}
                </p>
              </div>
              {onConfigureNoticeQr && (
                <span className="editor-only inline-flex items-center gap-1 text-[10px] font-bold text-black/40 group-hover/notice:text-[#ef5a35]">
                  <EditorIcon name="edit" />
                  <span>Edit</span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (type === "interview") {
    const variant = content?.layoutVariant ?? "feature";
    return (
      <div className={`grid h-full bg-[#f8f5ed] text-[#25231f] ${variant === "profile" ? "md:grid-cols-2" : variant === "rapid-fire" ? "md:grid-cols-[0.4fr_1.6fr]" : "md:grid-cols-[0.65fr_1.35fr]"}`}>
        <div className="flex flex-col justify-between border-b border-black/15 p-7 md:border-b-0 md:border-r sm:p-9">
          <Editable as="p" className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">{content?.eyebrow ?? "Five questions"}</Editable>
          <Editable as="h2" className="mt-12 font-serif text-4xl leading-[0.95] tracking-[-0.04em]">{content?.title ?? "A conversation with someone shaping campus"}</Editable>
          <Editable as="p" className="mt-7 text-[9px] uppercase tracking-[0.14em] text-black/45">{content?.byline ?? "Interview by the editorial team"}</Editable>
        </div>
        <Editable as="p" className="whitespace-pre-line p-7 font-serif text-lg leading-[1.65] text-black/75 sm:p-9">
          {content?.body ?? "Q — What idea are you carrying with you this semester?\n\nA — That the most useful work often begins as a conversation between people who see the same problem differently.\n\nQ — Where should students begin?\n\nA — With curiosity, and with one another."}
        </Editable>
      </div>
    );
  }

  if (type === "statistics") {
    const variant = content?.layoutVariant ?? "dashboard";
    return (
      <div className={`h-full p-7 sm:p-9 ${variant === "comparison" ? "bg-[#f2ecdf]" : ""}`}>
        <Editable as="p" className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">{content?.eyebrow ?? "By the numbers"}</Editable>
        <Editable as="h2" className="mt-4 font-serif text-4xl tracking-[-0.04em]">{content?.title ?? "A snapshot of campus"}</Editable>
        {content?.body ? (
          <Editable as="p" className="mt-8 whitespace-pre-line font-serif text-3xl leading-[1.5]">{content.body}</Editable>
        ) : (
          <div className="mt-8 grid grid-cols-3 divide-x divide-black/20 border-y border-black/20 py-6">
            {[["42", "Student clubs"], ["18", "Events this week"], ["7K", "Ideas shared"]].map(([value, label]) => <div className="px-3 text-center" key={label}><Editable as="p" className="font-serif text-4xl">{value}</Editable><Editable as="p" className="mt-2 text-[8px] uppercase tracking-[0.12em] text-black/45">{label}</Editable></div>)}
          </div>
        )}
      </div>
    );
  }

  if (type === "timeline") {
    const items = content?.body?.split("\n").filter(Boolean) ?? ["09:00 — Doors open", "11:30 — The main conversation", "14:00 — Workshops across campus", "18:30 — Music on the quad"];
    return (
      <div className="h-full p-7 sm:p-9">
        <Editable as="p" className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">{content?.eyebrow ?? "Follow the day"}</Editable>
        <Editable as="h2" className="mt-4 font-serif text-4xl tracking-[-0.04em]">{content?.title ?? "A campus timeline"}</Editable>
        <div className="mt-8 border-l border-black/25 pl-6">
          {items.map((item, index) => <div className="relative border-b border-black/10 py-4 last:border-0" key={`${item}-${index}`}><span className="absolute -left-[29px] top-5 h-2 w-2 rounded-full bg-[#ef5a35]" /><Editable as="p" className="font-serif text-lg">{item}</Editable></div>)}
        </div>
      </div>
    );
  }

  if (type === "recommendations") {
    const variant = content?.layoutVariant ?? "shortlist";
    return (
      <div className={`h-full p-7 sm:p-9 ${variant === "shelf" ? "bg-[#f2ecdf]" : ""}`}>
        <Editable as="p" className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">{content?.eyebrow ?? "The shortlist"}</Editable>
        <Editable as="h2" className="mt-4 font-serif text-4xl tracking-[-0.04em]">{content?.title ?? "Things worth your time"}</Editable>
        {content?.body ? <Editable as="p" className="mt-8 whitespace-pre-line border-y border-black/20 py-5 font-serif text-xl leading-[1.7]">{content.body}</Editable> : <div className="mt-8 divide-y divide-black/20 border-y border-black/20">{[["01", "Read", "A book to carry between lectures"], ["02", "Watch", "A film everyone will be discussing"], ["03", "Listen", "The conversation of the week"]].map(([number, kind, title]) => <div className={`grid grid-cols-[35px_65px_1fr] gap-3 py-5 ${variant === "shelf" ? "mx-1 my-2 border border-black/10 bg-white/55 px-4" : variant === "categories" ? "border-l-2 border-[#3e6a59] pl-4" : ""}`} key={number}><span className="text-[9px] font-bold text-[#ef5a35]">{number}</span><Editable as="span" className="text-[8px] font-bold uppercase tracking-[0.12em] text-black/40">{kind}</Editable><Editable as="p" className="font-serif text-lg leading-tight">{title}</Editable></div>)}</div>}
      </div>
    );
  }

  if (type === "footer") {
    const variant = content?.layoutVariant ?? "sign-off";
    return (
      <div className={`flex h-full flex-col justify-between border-t border-black p-7 sm:p-10 ${variant === "subscribe" ? "items-center bg-[#f2ecdf] text-center" : variant === "contact" ? "bg-[#faf8f2]" : ""}`}>
        <Editable as="h2" className="font-serif text-4xl">{content?.title ?? "Until next week, stay curious."}</Editable>
        <Editable as="p" className="whitespace-pre-line text-[10px] uppercase tracking-[0.16em] text-black/50">
          {content?.body ?? (variant === "contact" ? "Write to the editorial desk · editor@university.edu\nFind us on campus · Student Union, Room 204" : variant === "subscribe" ? "Get the next edition in your inbox · Join the weekly campus dispatch" : "Published weekly by the University Editorial Guild · Distributed across campus")}
        </Editable>
      </div>
    );
  }

  if (type === "divider") {
    return (
      <div className="flex h-full items-center gap-5 px-7 py-6 sm:px-10">
        <span className="h-px flex-1 bg-black" />
        <Editable as="span" className="text-[9px] font-bold uppercase tracking-[0.2em]">{content?.title ?? "A new chapter"}</Editable>
        <span className="h-px flex-1 bg-black" />
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
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ef5a35]" /> Live Audio
            </span>
          </div>
          <Editable as="h3" className="mt-3 font-serif text-3xl sm:text-4xl">
            {content?.title ?? "Tracks from the Library Basement"}
          </Editable>
          <Editable as="p" className="mt-2 text-xs leading-relaxed text-black/60">
            {content?.body ?? "Curated by the Campus Radio Society. Songs playing across study halls, rehearsal rooms, and dorm kitchens this week."}
          </Editable>
        </div>
        <div className="mt-6 flex items-center justify-between border-t border-black/15 pt-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full border border-black/15 bg-[#f8f5ed] text-[#a14b32]">
              ▶
            </div>
            <div>
              <Editable as="p" className="text-xs font-semibold text-black/80">
                Track 01 · Late Autumn Reverie
              </Editable>
              <Editable as="p" className="text-[10px] text-black/45">
                The Student Quartet · 3:42
              </Editable>
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
    return (
      <div className="h-full p-7 sm:p-9">
        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">Campus Pulse</span>
        <Editable as="h3" className="mt-2 font-serif text-3xl sm:text-4xl">
          {content?.title ?? "The Big Debate: Late Nights vs Early Mornings?"}
        </Editable>
        <Editable as="p" className="mt-2 text-xs text-black/55">
          {content?.body ?? "Cast your vote below or respond with next week's poll topic."}
        </Editable>
        <div className="mt-6 space-y-3">
          {[
            { label: "Option A: 24/7 Library all-nighter with espresso", pct: "64%" },
            { label: "Option B: 6:00 AM coffee run and sunrise study", pct: "36%" },
          ].map((opt, i) => (
            <div className="relative overflow-hidden rounded-xl border border-black/15 bg-white p-4" key={i}>
              <div
                className="absolute inset-y-0 left-0 bg-[#ef5a35]/15 transition-all"
                style={{ width: opt.pct }}
              />
              <div className="relative flex items-center justify-between text-xs font-semibold">
                <Editable as="span">{opt.label}</Editable>
                <span className="font-bold text-[#ef5a35]">{opt.pct}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === "crossword") {
    return (
      <CrosswordSection data={content?.crossword || DEFAULT_CAMPUS_MINI_CROSSWORD} isEditor onEdit={onEditCrossword} />
    );
  }

  if (type === "sudoku") {
    return (
      <SudokuSection
        data={content?.sudoku || DEFAULT_SUDOKU}
        isEditor={true}
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

  return (
      <div className="flex h-full flex-col justify-between bg-[#f8f5ed] p-8 text-[#25231f] sm:p-12">
      <Editable as="h2" className="max-w-xl font-serif text-5xl leading-[0.92] tracking-[-0.045em]">
        {content?.title ?? "Made on campus, for everyone on campus."}
      </Editable>
      <div className="mt-12 flex justify-between text-[9px] font-bold uppercase tracking-[0.14em]">
        <Editable as="span">@inotherwords</Editable>
        <Editable as="span">Issue 08 · 2025</Editable>
      </div>
    </div>
  );
}

function BuilderBlock({
  section,
  bylineConvention,
  pageIndex,
  isCoverPhoto,
  onDragStart,
  onDrop,
  onAction,
  issueId,
  onAi,
  onConfigureNoticeQr,
  onEditCrossword,
  onSetLayoutVariant,
  freeform = false,
  freeformRect,
  onUpdateFreeform,
}: {
  section: Section;
  bylineConvention: string;
  pageIndex: number;
  isCoverPhoto?: boolean;
  onDragStart: (page: number, id: string) => void;
  onDrop: (page: number, id: string) => void;
  onAction: (
    action: "up" | "down" | "width" | "height" | "duplicate" | "delete" | "setWidth" | "setHeight" | "widthStep" | "heightStep" | "cycleShape",
    page: number,
    id: string,
    extraValue?: any,
  ) => void;
  issueId: string;
  onAi: (sectionId: string) => void;
  onConfigureNoticeQr?: (sectionId: string) => void;
  onEditCrossword?: (sectionId: string) => void;
  onSetLayoutVariant?: (sectionId: string, variant: string) => void;
  freeform?: boolean;
  freeformRect: { x: number; y: number; width: number; height: number };
  onUpdateFreeform: (page: number, id: string, value: { x: number; y: number; width: number; height: number }) => void;
}) {
  const resizeDrag = useRef<{ axis: "x" | "y"; startX: number; startY: number; width: number; height: Section["height"] } | null>(null);
  const freeformDrag = useRef<{ kind: "move" | "resize"; x: number; y: number; rect: typeof freeformRect; canvasWidth: number } | null>(null);
  const widthLabels: Record<number, string> = {
    4: "1/3 width (4 cols)",
    6: "1/2 width (6 cols)",
    8: "2/3 width (8 cols)",
    12: "Full width (12 cols)",
  };

  const heightLabels: Record<string, string> = {
    compact: "Compact",
    regular: "Regular",
    tall: "Tall",
  };

  return (
    <section
      className={`builder-block group relative height-${section.height}`}
      data-section-type={section.type}
      data-layout-variant={section.content?.layoutVariant ?? SECTION_LAYOUTS[section.type]?.[0]?.id}
      data-section-id={section.id}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event: DragEvent) => {
        event.preventDefault();
        onDrop(pageIndex, section.id);
      }}
      style={freeform ? { position: "absolute", left: `${freeformRect.x}%`, top: freeformRect.y, width: `${freeformRect.width}%`, height: freeformRect.height, minHeight: 0, gridColumn: "auto" } : { gridColumn: `span ${section.width}` }}
    >
      {/* Top Left: Size & Dimension Pill Badge */}
      <div className={`editor-only pointer-events-none absolute left-3 top-2.5 z-20 items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 ${section.width <= 4 ? "hidden" : "hidden sm:flex"}`}>
        <span className="rounded-full border border-black/15 bg-[#f8f5ed]/95 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.1em] text-black/60 shadow-sm backdrop-blur-sm dark:border-white/15 dark:bg-[#20201d]/95 dark:text-white/60">
          {widthLabels[section.width] || `${section.width} cols`} · {heightLabels[section.height] || section.height}
        </span>
      </div>

      {/* Top Right: Floating Control Bar contained within block bounds */}
      <div className="block-controls editor-only" aria-label="Section controls">
        <span className="drag-handle" draggable onDragStart={(event) => { event.stopPropagation(); onDragStart(pageIndex, section.id); }} onDragEnd={(event) => event.stopPropagation()} title="Drag to reorder block">⠿</span>
        {section.type === "shapeBox" && <button className="rounded px-1.5 text-[8px] font-bold uppercase" onClick={() => onAction("cycleShape", pageIndex, section.id)} title="Change shape" type="button">{section.content?.shapeKind ?? "rectangle"} ▾</button>}

        {/* Noticeboard QR & Submission Tracking trigger */}
        {section.type === "notice" && onConfigureNoticeQr && (
          <button
            className="inline-flex items-center gap-1 rounded bg-[#ef5a35] px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#d44826]"
            onClick={() => onConfigureNoticeQr(section.id)}
            title="Configure Submission QR Code & Tracking"
            type="button"
          >
            <span className="inline-flex items-center gap-1">
              <EditorIcon name="gear" />
              <span>QR</span>
            </span>
          </button>
        )}

        {/* AI Rewrite */}
        <button aria-label="Rewrite section with AI" onClick={() => onAi(section.id)} title="Rewrite section with AI">
          <EditorIcon name="write" />
        </button>

        {/* Order controls */}
        <button onClick={() => onAction("up", pageIndex, section.id)} title="Move up">↑</button>
        <button onClick={() => onAction("down", pageIndex, section.id)} title="Move down">↓</button>

        {/* Responsive Width Controls */}
        {section.width <= 4 ? (
          <button
            className="h-5 rounded px-1.5 text-[8px] font-bold uppercase tracking-wider text-black/70 hover:bg-black/10 dark:text-white/70 dark:hover:bg-white/10"
            onClick={() => onAction("width", pageIndex, section.id)}
            title="Cycle column width (1/3 → 1/2 → 2/3 → Full)"
            type="button"
          >
            W: 1/3 ▾
          </button>
        ) : (
          <div className="flex items-center gap-0.5 border-l border-black/10 px-1 dark:border-white/10" title="Select Column Width">
            <span className="px-1 text-[8px] font-bold uppercase text-black/40 dark:text-white/40">W:</span>
            {([4, 6, 8, 12] as const).map((w) => {
              const label = w === 4 ? "1/3" : w === 6 ? "1/2" : w === 8 ? "2/3" : "Full";
              const isActive = section.width === w;
              return (
                <button
                  className={`h-5 w-auto min-w-5 rounded px-1.5 text-[8px] font-bold ${
                    isActive ? "is-selected" : "text-black/60 hover:bg-black/10 dark:text-white/60 dark:hover:bg-white/10"
                  }`}
                  key={w}
                  onClick={() => onAction("setWidth", pageIndex, section.id, w)}
                  title={`Set width to ${label} (${w} cols)`}
                  type="button"
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* Responsive Height Controls */}
        {section.width <= 4 ? (
          <button
            className="h-5 rounded px-1.5 text-[8px] font-bold uppercase tracking-wider text-black/70 hover:bg-black/10 dark:text-white/70 dark:hover:bg-white/10"
            onClick={() => onAction("height", pageIndex, section.id)}
            title="Cycle row height (Compact → Regular → Tall)"
            type="button"
          >
            H: {section.height === "compact" ? "S" : section.height === "regular" ? "M" : "L"} ▾
          </button>
        ) : (
          <div className="flex items-center gap-0.5 border-l border-black/10 px-1 dark:border-white/10" title="Select Row Height">
            <span className="px-1 text-[8px] font-bold uppercase text-black/40 dark:text-white/40">H:</span>
            {(["compact", "regular", "tall"] as const).map((h) => {
              const label = h === "compact" ? "S" : h === "regular" ? "M" : "L";
              const isActive = section.height === h;
              return (
                <button
                  className={`h-5 w-auto min-w-5 rounded px-1.5 text-[8px] font-bold ${
                    isActive ? "is-selected" : "text-black/60 hover:bg-black/10 dark:text-white/60 dark:hover:bg-white/10"
                  }`}
                  key={h}
                  onClick={() => onAction("setHeight", pageIndex, section.id, h)}
                  title={`Set height to ${h}`}
                  type="button"
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        <button aria-label="Delete section" className="block-danger-action" onClick={() => onAction("delete", pageIndex, section.id)} title="Delete block" type="button">×</button>
      </div>

      {freeform && <button
        aria-label="Drag to move section"
        className="editor-only absolute left-1/2 top-1 z-40 -translate-x-1/2 cursor-grab touch-none rounded-full border border-black/15 bg-[#f8f5ed]/95 px-3 py-1 text-[8px] font-bold uppercase tracking-wider opacity-0 shadow transition group-hover:opacity-100 active:cursor-grabbing dark:border-white/15 dark:bg-[#22221f]/95"
        onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); const canvas = event.currentTarget.closest(".page-grid") as HTMLElement | null; freeformDrag.current = { kind: "move", x: event.clientX, y: event.clientY, rect: freeformRect, canvasWidth: canvas?.getBoundingClientRect().width ?? 700 }; }}
        onPointerUp={(event) => { const drag = freeformDrag.current; freeformDrag.current = null; if (!drag) return; const bounds = event.currentTarget.closest(".page-grid")?.getBoundingClientRect(); if (!bounds) return; onUpdateFreeform(pageIndex, section.id, { ...drag.rect, x: Math.max(0, Math.min(100 - drag.rect.width, drag.rect.x + (event.clientX - drag.x) / drag.canvasWidth * 100)), y: Math.max(0, drag.rect.y + event.clientY - drag.y) }); }}
        title="Drag this handle to move the block"
        type="button"
      >Move</button>}

      {/* Right Edge Interactive Width Resizer Handle (Safely inside block bounds) */}
      <div className={`editor-only pointer-events-auto absolute right-2 top-1/2 z-30 flex -translate-y-1/2 items-center rounded-full border border-black/20 bg-white/95 p-0.5 opacity-0 shadow-lg backdrop-blur-md transition-opacity group-hover:opacity-100 dark:border-white/20 dark:bg-[#1f1e1b]/95 ${freeform ? "hidden" : ""}`}>
        <button
          className="grid h-5 w-5 place-items-center rounded-full text-[9px] font-bold text-black/70 hover:bg-[#ef5a35] hover:text-white disabled:pointer-events-none disabled:opacity-20 dark:text-white/70"
          disabled={section.width <= 4}
          onClick={() => onAction("widthStep", pageIndex, section.id, "shrink")}
          title="Narrow block (reduce columns)"
          type="button"
        >
          ◀
        </button>
        <span className="px-1 text-[8px] font-bold text-black/60 select-none dark:text-white/60">
          {section.width === 4 ? "1/3" : section.width === 6 ? "1/2" : section.width === 8 ? "2/3" : "Full"}
        </span>
        <button
          className="grid h-5 w-5 place-items-center rounded-full text-[9px] font-bold text-black/70 hover:bg-[#ef5a35] hover:text-white disabled:pointer-events-none disabled:opacity-20 dark:text-white/70"
          disabled={section.width >= 12}
          onClick={() => onAction("widthStep", pageIndex, section.id, "expand")}
          title="Widen block (increase columns)"
          type="button"
        >
          ▶
        </button>
      </div>

      {/* Bottom Edge Interactive Height Resizer Handle (Safely inside block bounds) */}
      <div className={`editor-only pointer-events-auto absolute bottom-2 left-1/2 z-30 flex -translate-x-1/2 items-center rounded-full border border-black/20 bg-white/95 p-0.5 opacity-0 shadow-lg backdrop-blur-md transition-opacity group-hover:opacity-100 dark:border-white/20 dark:bg-[#1f1e1b]/95 ${freeform ? "hidden" : ""}`}>
        <button
          className="grid h-5 w-5 place-items-center rounded-full text-[9px] font-bold text-black/70 hover:bg-[#ef5a35] hover:text-white disabled:pointer-events-none disabled:opacity-20 dark:text-white/70"
          disabled={section.height === "compact"}
          onClick={() => onAction("heightStep", pageIndex, section.id, "shorter")}
          title="Make block shorter"
          type="button"
        >
          ▲
        </button>
        <span className="px-1.5 text-[8px] font-bold uppercase text-black/60 select-none dark:text-white/60">
          {section.height === "compact" ? "S" : section.height === "regular" ? "M" : "L"}
        </span>
        <button
          className="grid h-5 w-5 place-items-center rounded-full text-[9px] font-bold text-black/70 hover:bg-[#ef5a35] hover:text-white disabled:pointer-events-none disabled:opacity-20 dark:text-white/70"
          disabled={section.height === "tall"}
          onClick={() => onAction("heightStep", pageIndex, section.id, "taller")}
          title="Make block taller"
          type="button"
        >
          ▼
        </button>
      </div>

      {SECTION_LAYOUTS[section.type] && (
        <div className="editor-only section-layout-picker flex items-center justify-end gap-2 border-b border-black/10 bg-[#f4f0e7] px-3 py-1.5 text-[8px] dark:border-white/10 dark:bg-[#24231f]">
          <label className="font-bold uppercase tracking-[0.12em] text-black/45 dark:text-white/45" htmlFor={`layout-${section.id}`}>Layout</label>
          <select
            className="max-w-[70%] cursor-pointer rounded border border-black/10 bg-white px-2 py-1 font-semibold text-black/75 dark:border-white/15 dark:bg-[#191815] dark:text-white/75"
            id={`layout-${section.id}`}
            onChange={(event) => onSetLayoutVariant?.(section.id, event.target.value)}
            value={section.content?.layoutVariant ?? SECTION_LAYOUTS[section.type]?.[0]?.id}
          >
            {SECTION_LAYOUTS[section.type]?.map((layout) => <option key={layout.id} value={layout.id}>{layout.label}</option>)}
          </select>
        </div>
      )}

      <SectionContent
        bylineConvention={bylineConvention}
        isCoverPhoto={isCoverPhoto}
        mediaKey={`iow-media-${issueId}-${section.id}`}
        onConfigureNoticeQr={() => onConfigureNoticeQr?.(section.id)}
        onEditCrossword={() => onEditCrossword?.(section.id)}
        section={section}
      />
      <div
        aria-label="Drag to resize section width"
        className="editor-only absolute right-0 top-1/2 z-30 h-14 w-3 -translate-y-1/2 cursor-ew-resize touch-none rounded-l-full border border-black/15 bg-[#f8f5ed]/90 opacity-0 shadow-sm transition group-hover:opacity-100 dark:border-white/15 dark:bg-[#22221f]/90"
        onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); resizeDrag.current = { axis: "x", startX: event.clientX, startY: event.clientY, width: section.width, height: section.height }; }}
        onPointerUp={(event) => {
          const start = resizeDrag.current; resizeDrag.current = null; if (!start) return;
          const choices: Section["width"][] = [4, 6, 8, 12];
          const pageWidth = event.currentTarget.closest(".page-grid")?.getBoundingClientRect().width ?? 100;
          const next = Math.max(4, Math.min(12, start.width + Math.round((event.clientX - start.startX) / Math.max(24, pageWidth) * 12)));
          const nearest = choices.reduce((best, value) => Math.abs(value - next) < Math.abs(best - next) ? value : best, choices[0]);
          onAction("setWidth", pageIndex, section.id, nearest);
        }}
        title="Drag left or right to resize"
      />
      <div
        aria-label="Drag to resize section height"
        className="editor-only absolute bottom-0 left-1/2 z-30 h-3 w-14 -translate-x-1/2 cursor-ns-resize touch-none rounded-t-full border border-black/15 bg-[#f8f5ed]/90 opacity-0 shadow-sm transition group-hover:opacity-100 dark:border-white/15 dark:bg-[#22221f]/90"
        onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); resizeDrag.current = { axis: "y", startX: event.clientX, startY: event.clientY, width: section.width, height: section.height }; }}
        onPointerUp={(event) => {
          const start = resizeDrag.current; resizeDrag.current = null; if (!start) return;
          const choices: Section["height"][] = ["compact", "regular", "tall"];
          const startIndex = choices.indexOf(start.height);
          const nextIndex = Math.max(0, Math.min(2, startIndex + Math.round((event.clientY - start.startY) / 120)));
          onAction("setHeight", pageIndex, section.id, choices[nextIndex]);
        }}
        title="Drag down to make taller or up to make shorter"
      />
      {freeform && <button
        aria-label="Drag to resize section"
        className="editor-only absolute bottom-0 right-0 z-40 grid h-6 w-6 cursor-nwse-resize touch-none place-items-center rounded-tl-lg border border-black/15 bg-[#f8f5ed]/95 text-[10px] font-bold opacity-0 shadow transition group-hover:opacity-100 dark:border-white/15 dark:bg-[#22221f]/95"
        onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); const canvas = event.currentTarget.closest(".page-grid") as HTMLElement | null; freeformDrag.current = { kind: "resize", x: event.clientX, y: event.clientY, rect: freeformRect, canvasWidth: canvas?.getBoundingClientRect().width ?? 700 }; }}
        onPointerUp={(event) => { const drag = freeformDrag.current; freeformDrag.current = null; if (!drag) return; onUpdateFreeform(pageIndex, section.id, { ...drag.rect, width: Math.max(12, Math.min(100 - drag.rect.x, drag.rect.width + (event.clientX - drag.x) / drag.canvasWidth * 100)), height: Math.max(90, drag.rect.height + event.clientY - drag.y) }); }}
        title="Drag to resize this block"
        type="button"
      >↘</button>}
    </section>
  );
}

type EditorIconName =
  | "back" | "workflow" | "write" | "palette" | "pages" | "undo" | "redo"
  | "add" | "preview" | "edit" | "save" | "type" | "bold" | "italic"
  | "underline" | "list" | "ordered" | "left" | "center" | "link"
  | "heading" | "clear" | "close" | "mail" | "share" | "camera" | "gear"
  | "puzzle" | "alert" | "sparkle";

function EditorIcon({ name }: { name: EditorIconName }) {
  const paths: Record<EditorIconName, ReactNode> = {
    back: <path d="m15 18-6-6 6-6M9 12h10" />,
    workflow: <><circle cx="7" cy="7" r="2.5" /><circle cx="17" cy="7" r="2.5" /><circle cx="12" cy="17" r="2.5" /><path d="m9 8.5 2 6M15 8.5l-2 6" /></>,
    write: <><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" /><path d="m14 7 3 3" /></>,
    palette: <><path d="M12 3a9 9 0 1 0 0 18h1.4a1.8 1.8 0 0 0 0-3.6H12a2 2 0 0 1 0-4h3.5A5.5 5.5 0 0 0 21 8c0-2.8-4-5-9-5Z" /><circle cx="8" cy="9" r=".8" fill="currentColor" /><circle cx="11" cy="6.5" r=".8" fill="currentColor" /><circle cx="15" cy="7" r=".8" fill="currentColor" /></>,
    pages: <><rect x="6" y="4" width="12" height="16" rx="1" /><path d="M3 17V2h12" /></>,
    undo: <path d="M9 7 4 12l5 5M5 12h8a6 6 0 0 1 6 6" />,
    redo: <path d="m15 7 5 5-5 5m4-5h-8a6 6 0 0 0-6 6" />,
    add: <path d="M12 5v14M5 12h14" />,
    preview: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
    edit: <path d="m4 20 4-1 10-10a2.1 2.1 0 0 0-3-3L5 16l-1 4Z" />,
    save: <><path d="M5 3h12l3 3v15H4V3Z" /><path d="M8 3v6h8V3M8 21v-7h8v7" /></>,
    type: <path d="M5 5h14M12 5v14M8 19h8" />,
    bold: <><path d="M8 5h5a3.5 3.5 0 0 1 0 7H8V5Zm0 7h6a3.5 3.5 0 0 1 0 7H8v-7Z" /></>,
    italic: <path d="M14 5h4M6 19h4M15 5 9 19" />,
    underline: <><path d="M7 5v6a5 5 0 0 0 10 0V5M5 21h14" /></>,
    list: <><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4" cy="6" r="1" fill="currentColor" /><circle cx="4" cy="12" r="1" fill="currentColor" /><circle cx="4" cy="18" r="1" fill="currentColor" /></>,
    ordered: <><path d="M9 6h11M9 12h11M9 18h11M4 4v4M3 4h1M3 11h2l-2 3h2M3 17h2l-2 3h2" /></>,
    left: <path d="M4 6h16M4 10h11M4 14h16M4 18h9" />,
    center: <path d="M4 6h16M7 10h10M4 14h16M7 18h10" />,
    link: <><path d="m9 15 6-6M7.5 17.5l-1 1a3.5 3.5 0 0 1-5-5l3-3a3.5 3.5 0 0 1 5 0M16.5 6.5l1-1a3.5 3.5 0 0 1 5 5l-3 3a3.5 3.5 0 0 1-5 0" /></>,
    heading: <path d="M5 5v14M15 5v14M5 12h10M19 10v9M17 12l2-2 2 2" />,
    clear: <><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12" /><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    mail: <path d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />,
    share: <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 1 1 0-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 1 0 5.367-2.684 3 3 0 0 0-5.367 2.684zm0 9.316a3 3 0 1 0 5.368 2.684 3 3 0 0 0-5.368-2.684z" />,
    camera: <><path d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316z" /><circle cx="12" cy="12.75" r="4.5" /></>,
    gear: <><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" /></>,
    puzzle: <path d="M11 4a2 2 0 0 1 2 2v1h1a2 2 0 0 1 2 2 2 2 0 0 0 4 0 2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2 2 2 0 0 0 0 4 2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2 2 2 0 0 0-4 0 2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2 2 2 0 0 0 0-4 2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4a2 2 0 0 0 0-4 2 2 0 0 1 2-2z" />,
    alert: <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />,
    sparkle: <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09z" />,
  };
  return <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24">{paths[name]}</svg>;
}

export default function App() {
  const { issueId = "issue-current" } = useParams();
  const [issue, setIssue] = useState<Issue>(() =>
    loadWorkspace().issues.find((item) => item.id === issueId) ?? loadWorkspace().issues[0],
  );
  const [pages, setPages] = useState<Pages>(() => {
    try {
      const saved = localStorage.getItem(`iow-layout-${issueId}`);
      const legacy = localStorage.getItem("iow-newsletter-layout");
      return saved ? JSON.parse(saved) : legacy ? JSON.parse(legacy) : DEFAULT_PAGES;
    } catch {
      return DEFAULT_PAGES;
    }
  });
  const [activePage, setActivePage] = useState(0);
  const [canvasZoom, setCanvasZoom] = useState(100);
  const [freeformMode, setFreeformMode] = useState(() => localStorage.getItem(`iow-freeform-${issueId}`) === "true");
  const [pageOverviewOpen, setPageOverviewOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [articleLibraryOpen, setArticleLibraryOpen] = useState(false);
  const [variantLibraryType, setVariantLibraryType] = useState<SectionType | null>(null);
  const [pageMenuOpen, setPageMenuOpen] = useState(false);
  const [designOpen, setDesignOpen] = useState(false);
  const [templateChooserOpen, setTemplateChooserOpen] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceText, setSourceText] = useState(sourceStarter);
  const [paletteId, setPaletteId] = useState(() => localStorage.getItem(`iow-palette-${issueId}`) ?? loadPublicationStyleGuide().paletteId);
  const [fontId, setFontId] = useState(() => localStorage.getItem(`iow-font-${issueId}`) ?? loadPublicationStyleGuide().fontId);
  const [preview, setPreview] = useState(false);
  const [saved, setSaved] = useState(false);
  const [, setMediaRevision] = useState(0);
  const [cloudSaveState, setCloudSaveState] = useState<"loading" | "saving" | "saved" | "offline" | "conflict">("loading");
  const [cloudConflictMessage, setCloudConflictMessage] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");
  const dragged = useRef<{ page: number; id: string } | null>(null);
  const draggedSectionType = useRef<SectionType | null>(null);
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<number>(() => Date.now());
  const [relativeSavedTime, setRelativeSavedTime] = useState("just now");
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [photoPickerOpen, setPhotoPickerOpen] = useState(false);
  const [photoTargetKey, setPhotoTargetKey] = useState<string | null>(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [wordStats, setWordStats] = useState({ pageWords: 0, totalWords: 0 });
  const [pageOverflowHeights, setPageOverflowHeights] = useState<Record<number, number>>({});
  const contentTimer = useRef<number | null>(null);
  const issuePersistTimer = useRef<number | null>(null);
  const issueCloudLoadedRef = useRef(false);
  const scheduleIssueSaveRef = useRef<() => void>(() => undefined);
  const syncMediaToPeersRef = useRef<(storageKey: string) => void>(() => undefined);
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const aiApplyRef = useRef<(value: string) => void>(() => undefined);
  const aiTargetIsCurrentRef = useRef<() => boolean>(() => true);
  const [selectionText, setSelectionText] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiOriginal, setAiOriginal] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [slashQuery, setSlashQuery] = useState<string | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioTab, setStudioTab] = useState<StudioTab>("pages");
  const [smartFlow, setSmartFlow] = useState(() => localStorage.getItem(`iow-smart-flow-${issueId}`) !== "false");
  const [checkpoints, setCheckpoints] = useState<DocumentCheckpoint[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(`iow-checkpoints-${issueId}`) ?? "[]");
    } catch {
      return [];
    }
  });
  const [styleGuide, setStyleGuide] = useState<PublicationStyleGuide>(loadPublicationStyleGuide);
  const [suggestions, setSuggestions] = useState<PendingSuggestion[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [findIndex, setFindIndex] = useState(0);
  const [findMatches, setFindMatches] = useState<{ range: Range; node: Text; start: number; end: number }[]>([]);
  const [compareCheckpointId, setCompareCheckpointId] = useState<string | null>(null);
  const [comparisonContent, setComparisonContent] = useState<string[]>([]);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<EditorialComment[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(`iow-comments-${issueId}`) ?? "[]");
    } catch {
      return [];
    }
  });
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<NewsroomMessage[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(`iow-chat-${issueId}`) ?? "[]");
    } catch {
      return [];
    }
  });
  const [preflight, setPreflight] = useState<{ tone: "pass" | "warn"; label: string; detail: string }[]>([]);
  const [aiReview, setAiReview] = useState("");
  const [aiReviewing, setAiReviewing] = useState(false);
  const [noticeQrModalSectionId, setNoticeQrModalSectionId] = useState<string | null>(null);
  const [crosswordModalSectionId, setCrosswordModalSectionId] = useState<string | null>(null);

  const handleSaveNoticeQr = (config: NoticeboardQrConfig) => {
    if (!noticeQrModalSectionId) return;
    rememberLayout();
    setPages((prev) =>
      prev.map((sections) =>
        sections.map((sec) =>
          sec.id === noticeQrModalSectionId
            ? { ...sec, content: { ...sec.content, ...config } }
            : sec
        )
      ) as Pages
    );
    setNoticeQrModalSectionId(null);
  };
  const slashStartRef = useRef(0);
  const pageDragRef = useRef<number | null>(null);
  const editSessionRef = useRef(false);
  const palette = PALETTES.find((item) => item.id === paletteId) ?? PALETTES[0];
  const fontPair = FONT_PAIRS.find((item) => item.id === fontId) ?? FONT_PAIRS[0];
  const activeDesignTemplate = DESIGN_TEMPLATES.find((template) => template.paletteId === paletteId && template.fontId === fontId);

  const applyDesignTemplate = (template: (typeof DESIGN_TEMPLATES)[number]) => {
    captureCheckpoint(`Before applying ${template.name}`);
    setPaletteId(template.paletteId);
    setFontId(template.fontId);
    setTemplateChooserOpen(false);
  };

  const { user } = useAuth();
  activateWorkspaceOwner(user?.id ?? null);
  const isRemoteUpdateRef = useRef(false);

  useEffect(() => {
    const handleSuccess = (event: Event) => {
      if ((event as CustomEvent).detail?.issueId === issueId) setCloudSaveState("saved");
    };
    const handleError = (event: Event) => {
      if ((event as CustomEvent).detail?.issueId === issueId) setCloudSaveState((current) => current === "conflict" ? "conflict" : "offline");
    };
    const handleConflict = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.issueId === issueId) { setCloudSaveState("conflict"); setCloudConflictMessage(detail.message ?? "This issue changed in another session."); }
    };
    window.addEventListener("iow-issue-sync-success", handleSuccess);
    window.addEventListener("iow-issue-sync-error", handleError);
    window.addEventListener("iow-issue-sync-conflict", handleConflict);
    return () => {
      window.removeEventListener("iow-issue-sync-success", handleSuccess);
      window.removeEventListener("iow-issue-sync-error", handleError);
      window.removeEventListener("iow-issue-sync-conflict", handleConflict);
    };
  }, [issueId]);

  useEffect(() => {
    if (!user?.id) return;
    hydrateWorkspace(user.id).then((workspace) => {
      const current = workspace.issues.find((item) => item.id === issueId);
      if (current) setIssue(current);
    }).catch((error) => window.dispatchEvent(new CustomEvent("iow-workspace-sync-error", { detail: error })));
  }, [issueId, user?.id]);

  useEffect(() => {
    let active = true;
    issueCloudLoadedRef.current = false;
    loadIssueDocument(issueId).then((issueDocument) => {
      if (!active) return;
      setCloudSaveState("saved");
      if (issueDocument) {
        isRemoteUpdateRef.current = true;
        issueDocument.media?.forEach((entry) => {
          unsyncedMedia.set(entry.key, entry.value);
          if (entry.meta) unsyncedMediaMeta.set(entry.key, entry.meta);
          window.dispatchEvent(new CustomEvent("iow-photo-update", { detail: { storageKey: entry.key, value: entry.value, meta: entry.meta, broadcast: false } }));
        });
        setPages(issueDocument.pages as Pages);
        setPaletteId(issueDocument.paletteId);
        setFontId(issueDocument.fontId);
        setFreeformMode(issueDocument.freeformMode ?? false);
        setComments((issueDocument.comments ?? []) as EditorialComment[]);
        setChatMessages((issueDocument.chatMessages ?? []) as NewsroomMessage[]);
        window.setTimeout(() => {
          if (!active) return;
          document.querySelectorAll<HTMLElement>("#pdf-document .editable").forEach((element, index) => {
            if (issueDocument.content[index] !== undefined) element.innerHTML = issueDocument.content[index];
          });
          issueCloudLoadedRef.current = true;
          requestAnimationFrame(() => { isRemoteUpdateRef.current = false; });
        }, 40);
      } else {
        issueCloudLoadedRef.current = true;
        scheduleIssueSaveRef.current();
      }
    }).catch((error) => {
      setCloudSaveState("offline");
      issueCloudLoadedRef.current = true;
      window.dispatchEvent(new CustomEvent("iow-issue-sync-error", { detail: { issueId, error } }));
    });
    return () => { active = false; };
  }, [issueId, user?.id]);

  const handleRemoteChange = useCallback((payload: DocChangePayload) => {
    if (payload.type === "field_edit") {
      const { index, html } = payload.data || {};
      if (typeof index === "number" && typeof html === "string") {
        const editables = document.querySelectorAll<HTMLElement>("#pdf-document .editable");
        const target = editables[index];
        if (target && document.activeElement !== target) {
          if (target.innerHTML !== html) {
            target.innerHTML = html;
            scheduleIssueSaveRef.current();
          }
        }
      }
    } else if (payload.type === "layout") {
      isRemoteUpdateRef.current = true;
      const nextPages = payload.data?.pages ?? payload.data;
      const nextContent = payload.data?.content;
      setPages(nextPages);
      localStorage.setItem(`iow-layout-${issueId}`, JSON.stringify(nextPages));
      if (Array.isArray(nextContent)) {
        window.setTimeout(() => {
          document.querySelectorAll<HTMLElement>("#pdf-document .editable").forEach((element, index) => {
            if (nextContent[index] !== undefined && document.activeElement !== element) {
              element.innerHTML = nextContent[index];
            }
          });
          localStorage.setItem(`iow-content-${issueId}`, JSON.stringify(nextContent));
        }, 30);
      }
      requestAnimationFrame(() => {
        isRemoteUpdateRef.current = false;
      });
    } else if (payload.type === "content") {
      if (Array.isArray(payload.data)) {
        document.querySelectorAll<HTMLElement>("#pdf-document .editable").forEach((element, index) => {
          if (payload.data[index] !== undefined && element.innerHTML !== payload.data[index]) {
            if (document.activeElement !== element) {
              element.innerHTML = payload.data[index];
            }
          }
        });
        localStorage.setItem(`iow-content-${issueId}`, JSON.stringify(payload.data));
        scheduleIssueSaveRef.current();
      }
    } else if (payload.type === "media") {
      const { storageKey, value, meta } = payload.data || {};
      if (payload.data?.refresh) {
        void loadIssueDocument(issueId).then((issueDocument) => {
          issueDocument?.media?.forEach((entry) => {
            window.dispatchEvent(new CustomEvent("iow-photo-update", { detail: { storageKey: entry.key, value: entry.value, meta: entry.meta, broadcast: false } }));
          });
        }).catch(() => undefined);
        return;
      }
      if (storageKey) {
        isRemoteUpdateRef.current = true;
        if (value !== undefined) localStorage.setItem(storageKey, value);
        if (meta !== undefined) localStorage.setItem(`${storageKey}-meta`, JSON.stringify(meta));
        window.dispatchEvent(new CustomEvent("iow-photo-update", { detail: { storageKey, value, meta, broadcast: false } }));
        scheduleIssueSaveRef.current();
        requestAnimationFrame(() => {
          isRemoteUpdateRef.current = false;
        });
      }
    } else if (payload.type === "palette") {
      isRemoteUpdateRef.current = true;
      setPaletteId(payload.data);
      localStorage.setItem(`iow-palette-${issueId}`, payload.data);
      requestAnimationFrame(() => {
        isRemoteUpdateRef.current = false;
      });
    } else if (payload.type === "font") {
      isRemoteUpdateRef.current = true;
      setFontId(payload.data);
      localStorage.setItem(`iow-font-${issueId}`, payload.data);
      requestAnimationFrame(() => {
        isRemoteUpdateRef.current = false;
      });
    } else if (payload.type === "full") {
      isRemoteUpdateRef.current = true;
      if (payload.data.pages) {
        setPages(payload.data.pages);
        localStorage.setItem(`iow-layout-${issueId}`, JSON.stringify(payload.data.pages));
      }
      if (payload.data.palette) {
        setPaletteId(payload.data.palette);
        localStorage.setItem(`iow-palette-${issueId}`, payload.data.palette);
      }
      if (payload.data.font) {
        setFontId(payload.data.font);
        localStorage.setItem(`iow-font-${issueId}`, payload.data.font);
      }
      if (typeof payload.data.freeformMode === "boolean") {
        setFreeformMode(payload.data.freeformMode);
        localStorage.setItem(`iow-freeform-${issueId}`, String(payload.data.freeformMode));
      }
      if (payload.data.media && typeof payload.data.media === "object") {
        Object.entries(payload.data.media).forEach(([key, val]) => {
          if (typeof val === "string") {
            localStorage.setItem(key, val);
            window.dispatchEvent(new CustomEvent("iow-photo-update", { detail: { storageKey: key, value: val, broadcast: false } }));
          }
        });
      }
      if (Array.isArray(payload.data.content)) {
        window.setTimeout(() => {
          document.querySelectorAll<HTMLElement>("#pdf-document .editable").forEach((element, index) => {
            if (payload.data.content[index] !== undefined && document.activeElement !== element) {
              element.innerHTML = payload.data.content[index];
            }
          });
          localStorage.setItem(`iow-content-${issueId}`, JSON.stringify(payload.data.content));
        }, 30);
      }
      requestAnimationFrame(() => {
        isRemoteUpdateRef.current = false;
      });
    }
  }, [issueId]);

  const getCurrentDocState = useCallback(() => {
    const content = Array.from(document.querySelectorAll<HTMLElement>("#pdf-document .editable")).map(
      (element) => element.innerHTML,
    );
    return {
      pages,
      palette: paletteId,
      font: fontId,
      freeformMode,
      content,
      media: Object.fromEntries(Object.entries(collectMedia()).filter(([, value]) => !value.startsWith("data:image/"))),
      comments,
    };
  }, [pages, paletteId, fontId, comments, freeformMode]);

  const handleRemoteComments = useCallback((newComments: EditorialComment[]) => {
    setComments(newComments);
    localStorage.setItem(`iow-comments-${issueId}`, JSON.stringify(newComments));
  }, [issueId]);

  const handleRemoteChat = useCallback((newMsg: NewsroomMessage) => {
    setChatMessages((prev) => {
      const next = [...prev, newMsg];
      localStorage.setItem(`iow-chat-${issueId}`, JSON.stringify(next));
      return next;
    });
  }, [issueId]);

  const {
    collaborators,
    cursors,
    broadcastCursor,
    broadcastDocChange,
    broadcastComments,
    sendChatMessage,
    isConnected,
    userColor,
    userName,
    myId,
  } = useCollaboration({
    issueId,
    user,
    onRemoteChange: handleRemoteChange,
    onRequestState: getCurrentDocState,
    onCommentChange: handleRemoteComments,
    onChatMessage: handleRemoteChat,
  });

  const addComment = (text: string) => {
    const newComment: EditorialComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text,
      authorName: user?.user_metadata?.full_name ?? (user?.email ? user.email.split("@")[0] : "Editor"),
      authorEmail: user?.email ?? "",
      authorColor: userColor,
      createdAt: Date.now(),
      resolved: false,
    };
    const next = [newComment, ...comments];
    setComments(next);
    localStorage.setItem(`iow-comments-${issueId}`, JSON.stringify(next));
    broadcastComments(next);
  };

  const toggleResolveComment = (id: string) => {
    const next = comments.map((c) => (c.id === id ? { ...c, resolved: !c.resolved } : c));
    setComments(next);
    localStorage.setItem(`iow-comments-${issueId}`, JSON.stringify(next));
    broadcastComments(next);
  };

  const deleteComment = (id: string) => {
    const next = comments.filter((c) => c.id !== id);
    setComments(next);
    localStorage.setItem(`iow-comments-${issueId}`, JSON.stringify(next));
    broadcastComments(next);
  };

  const postChatMessage = (text: string) => {
    const sent = sendChatMessage(text);
    if (sent) {
      setChatMessages((prev) => {
        const next = [...prev, sent];
        localStorage.setItem(`iow-chat-${issueId}`, JSON.stringify(next));
        return next;
      });
    }
  };

  // Broadcast photo uploads or focal point changes to all connected peers
  useEffect(() => {
    const handlePhotoBroadcast = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (detail?.broadcast) {
        if (typeof detail.value === "string" && detail.value.startsWith("data:image/")) unsyncedMedia.set(detail.storageKey, detail.value);
        if (detail.meta) unsyncedMediaMeta.set(detail.storageKey, detail.meta);
        if (!isRemoteUpdateRef.current) syncMediaToPeersRef.current(detail.storageKey);
      } else if (!isRemoteUpdateRef.current) {
        if (typeof detail?.value === "string") {
          if (detail.value) unsyncedMedia.set(detail.storageKey, detail.value);
          else unsyncedMedia.delete(detail.storageKey);
        }
        if (detail?.meta) unsyncedMediaMeta.set(detail.storageKey, detail.meta);
        scheduleIssueSaveRef.current();
      }
    };
    window.addEventListener("iow-photo-update", handlePhotoBroadcast);
    return () => window.removeEventListener("iow-photo-update", handlePhotoBroadcast);
  }, [broadcastDocChange]);

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const docEl = document.getElementById("pdf-document");
    if (!docEl) return;

    const rect = docEl.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const xPercent = Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100));
    const yPercent = Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100));

    broadcastCursor(xPercent, yPercent);
  };

  const isInitialLayoutMount = useRef(true);
  useEffect(() => {
    if (isInitialLayoutMount.current) {
      isInitialLayoutMount.current = false;
      return;
    }
    localStorage.setItem(`iow-layout-${issueId}`, JSON.stringify(pages));
    updateIssue(issueId, {});
    if (!isRemoteUpdateRef.current) {
      const content = Array.from(document.querySelectorAll<HTMLElement>("#pdf-document .editable")).map(
        (element) => element.innerHTML,
      );
      broadcastDocChange("layout", { pages, content });
    }
  }, [pages, issueId, broadcastDocChange]);

  // Stream live typing keystrokes instantaneously across peers via native input capture
  useEffect(() => {
    const docEl = document.getElementById("pdf-document");
    if (!docEl) return;

    let throttleTimer: number | null = null;
    let pendingEdit: { index: number; html: string } | null = null;

    const flushFieldEdit = () => {
      if (pendingEdit) {
        broadcastDocChange("field_edit", pendingEdit);
        pendingEdit = null;
      }
    };

    const handleNativeInput = (event: Event) => {
      const target = event.target as HTMLElement;
      if (!target || !target.classList.contains("editable")) return;

      const editables = Array.from(docEl.querySelectorAll<HTMLElement>(".editable"));
      const index = editables.indexOf(target);
      if (index === -1) return;

      pendingEdit = { index, html: target.innerHTML };

      if (!throttleTimer) {
        throttleTimer = window.setTimeout(() => {
          throttleTimer = null;
          flushFieldEdit();
        }, 40);
      }

      scheduleContentSave();
    };

    docEl.addEventListener("input", handleNativeInput, true);
    return () => {
      docEl.removeEventListener("input", handleNativeInput, true);
      if (throttleTimer) window.clearTimeout(throttleTimer);
    };
  }, [broadcastDocChange]);

  const isInitialDesignMount = useRef(true);
  useEffect(() => {
    if (isInitialDesignMount.current) {
      isInitialDesignMount.current = false;
      return;
    }
    localStorage.setItem(`iow-palette-${issueId}`, paletteId);
    localStorage.setItem(`iow-font-${issueId}`, fontId);
    if (!isRemoteUpdateRef.current) {
      broadcastDocChange("palette", paletteId);
      broadcastDocChange("font", fontId);
    }
  }, [fontId, issueId, paletteId, broadcastDocChange]);

  const isInitialFreeformMount = useRef(true);
  useEffect(() => {
    localStorage.setItem(`iow-freeform-${issueId}`, String(freeformMode));
    if (isInitialFreeformMount.current) { isInitialFreeformMount.current = false; return; }
    if (!isRemoteUpdateRef.current) broadcastDocChange("full", { freeformMode });
  }, [freeformMode, issueId, broadcastDocChange]);

  useEffect(() => {
    localStorage.setItem(`iow-smart-flow-${issueId}`, String(smartFlow));
  }, [issueId, smartFlow]);

  useEffect(() => {
    const savedContent = localStorage.getItem(`iow-content-${issueId}`);
    if (!savedContent) return;
    try {
      const values = JSON.parse(savedContent) as string[];
      window.setTimeout(() => {
        document.querySelectorAll<HTMLElement>("#pdf-document .editable").forEach((element, index) => {
          if (values[index] !== undefined) element.innerHTML = values[index];
        });
      }, 0);
    } catch {
      // The document remains editable even if an old content snapshot is malformed.
    }
  }, [issueId]);

  // QoL: Track word counts across the document and on the active page
  const updateWordCounts = useCallback(() => {
    const allEditables = Array.from(document.querySelectorAll<HTMLElement>("#pdf-document .editable"));
    let total = 0;
    let active = 0;
    const activePageEl = document.querySelector<HTMLElement>(`#page-${activePage + 1}`);

    allEditables.forEach((el) => {
      const text = el.innerText?.trim() || "";
      if (text) {
        const words = text.split(/\s+/).filter(Boolean).length;
        total += words;
        if (activePageEl && activePageEl.contains(el)) {
          active += words;
        }
      }
    });

    setWordStats({ pageWords: active, totalWords: total });
  }, [activePage]);

  // QoL: Track print safe-zone overflow per page
  const checkPageOverflows = useCallback(() => {
    const pageEls = Array.from(document.querySelectorAll<HTMLElement>("#pdf-document .page"));
    const overflows: Record<number, number> = {};
    pageEls.forEach((el, index) => {
      if (el.scrollHeight > 1350) {
        overflows[index] = el.scrollHeight;
      }
    });
    setPageOverflowHeights(overflows);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      updateWordCounts();
      checkPageOverflows();
    }, 300);
    return () => clearTimeout(timer);
  }, [pages, activePage, updateWordCounts, checkPageOverflows]);

  // QoL: Relative auto-save time updater
  useEffect(() => {
    const interval = setInterval(() => {
      const diffSec = Math.floor((Date.now() - lastSavedTime) / 1000);
      if (diffSec < 15) setRelativeSavedTime("just now");
      else if (diffSec < 60) setRelativeSavedTime(`${diffSec}s ago`);
      else if (diffSec < 3600) setRelativeSavedTime(`${Math.floor(diffSec / 60)}m ago`);
      else setRelativeSavedTime(`${Math.floor(diffSec / 3600)}h ago`);
    }, 10000);
    return () => clearInterval(interval);
  }, [lastSavedTime]);

  // QoL: Open Photo Picker event listener
  useEffect(() => {
    const handleOpenPhotoPicker = (e: Event) => {
      const customEvent = e as CustomEvent<{ storageKey: string }>;
      if (customEvent.detail?.storageKey) {
        setPhotoTargetKey(customEvent.detail.storageKey);
        setPhotoPickerOpen(true);
      }
    };
    window.addEventListener("iow-open-photo-picker", handleOpenPhotoPicker);
    return () => window.removeEventListener("iow-open-photo-picker", handleOpenPhotoPicker);
  }, []);

  const handlePhotoPicked = (url: string, caption?: string, credit?: string) => {
    if (!photoTargetKey) return;
    localStorage.setItem(photoTargetKey, url);
    const meta = {
      position: "center",
      alt: caption || credit || "Editorial photograph",
    };
    localStorage.setItem(`${photoTargetKey}-meta`, JSON.stringify(meta));
    window.dispatchEvent(
      new CustomEvent("iow-photo-update", {
        detail: { storageKey: photoTargetKey, value: url, meta, broadcast: true },
      })
    );
    toast.success("Applied photo from curated library!", "Image Updated");
  };

  const saveContent = () => {
    const content = Array.from(document.querySelectorAll<HTMLElement>("#pdf-document .editable")).map(
      (element) => element.innerHTML,
    );
    localStorage.setItem(`iow-content-${issueId}`, JSON.stringify(content));
    updateIssue(issueId, {});
    scheduleIssueSaveRef.current();
    setSaved(true);
    setLastSavedTime(Date.now());
    setRelativeSavedTime("just now");
    window.setTimeout(() => setSaved(false), 1200);
    if (!isRemoteUpdateRef.current) {
      broadcastDocChange("content", content);
    }
  };

  const collectMedia = () => {
    const media: Record<string, string> = {};
    const prefix = `iow-media-${issueId}-`;
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(prefix) && !key.endsWith("-meta")) media[key] = localStorage.getItem(key) ?? "";
    }
    unsyncedMedia.forEach((value, key) => { media[key] = value; });
    return media;
  };

  const scheduleIssueSave = () => {
    if (issuePersistTimer.current) window.clearTimeout(issuePersistTimer.current);
    setCloudSaveState("saving");
    issuePersistTimer.current = window.setTimeout(() => {
      issuePersistTimer.current = null;
      void persistIssueNow().catch(() => undefined);
    }, 900);
  };
  const persistIssueNow = async () => {
    const media = Object.entries(collectMedia()).map(([key, value]) => {
      let meta: Record<string, unknown> = {};
      try { meta = JSON.parse(localStorage.getItem(`${key}-meta`) ?? "{}"); } catch { /* Keep media when optional metadata is malformed. */ }
      meta = { ...meta, ...(unsyncedMediaMeta.get(key) ?? {}) };
      return { key, value, meta };
    });
    const liveContent = Array.from(document.querySelectorAll<HTMLElement>("#pdf-document .editable")).map((element) => element.innerHTML);
    let cachedContent: string[] = [];
    try {
      const parsed = JSON.parse(localStorage.getItem(`iow-content-${issueId}`) ?? "[]");
      if (Array.isArray(parsed)) cachedContent = parsed;
    } catch { /* Use empty content only when the local cache is malformed too. */ }
    const content = liveContent.length ? liveContent : cachedContent;
    const readArray = (key: string) => {
      try { const value = JSON.parse(localStorage.getItem(key) ?? "[]"); return Array.isArray(value) ? value : []; } catch { return []; }
    };
    await saveIssueDocument(issueId, {
      pages,
      content,
      paletteId,
      fontId,
      freeformMode,
      media,
      comments: readArray(`iow-comments-${issueId}`),
      chatMessages: readArray(`iow-chat-${issueId}`),
    });
  };
  syncMediaToPeersRef.current = (storageKey) => {
    setCloudSaveState("saving");
    void persistIssueNow().then(() => {
      if (unsyncedMedia.has(storageKey)) {
        if (unsyncedMedia.get(storageKey)?.startsWith("data:image/")) unsyncedMedia.delete(storageKey);
      }
      unsyncedMediaMeta.delete(storageKey);
      let meta: Record<string, unknown> = {};
      try { meta = JSON.parse(localStorage.getItem(`${storageKey}-meta`) ?? "{}"); } catch { /* Optional media metadata can be rebuilt by the next edit. */ }
      broadcastDocChange("media", { refresh: true, storageKey, meta });
    }).catch((error) => {
      window.dispatchEvent(new CustomEvent("iow-issue-sync-error", { detail: { issueId, error } }));
    });
  };
  scheduleIssueSaveRef.current = scheduleIssueSave;

  useEffect(() => {
    if (!issueCloudLoadedRef.current || isRemoteUpdateRef.current) return;
    scheduleIssueSaveRef.current();
  }, [pages, paletteId, fontId, comments, chatMessages, freeformMode]);

  const captureCheckpoint = (label: string) => {
    const snapshot: DocumentCheckpoint = {
      id: `checkpoint-${Date.now()}`,
      label,
      at: new Date().toISOString(),
      pages: JSON.parse(JSON.stringify(pages)),
      content: Array.from(document.querySelectorAll<HTMLElement>("#pdf-document .editable")).map((item) => item.innerHTML),
      paletteId,
      fontId,
      sourceText,
      media: collectMedia(),
    };
    setCheckpoints((current) => {
      const next = [snapshot, ...current].slice(0, 20);
      // Keep image bytes in the live history only; duplicating them into localStorage
      // would quickly exhaust the browser quota.
      localStorage.setItem(
        `iow-checkpoints-${issueId}`,
        JSON.stringify(next.map((item) => ({ ...item, media: {} }))),
      );
      return next;
    });
  };

  const restoreCheckpoint = (snapshot: DocumentCheckpoint) => {
    captureCheckpoint("Before restoring version");
    setPages(snapshot.pages);
    setPaletteId(snapshot.paletteId);
    setFontId(snapshot.fontId);
    setSourceText(snapshot.sourceText);
    Object.entries(snapshot.media).forEach(([key, value]) => localStorage.setItem(key, value));
    window.setTimeout(() => {
      document.querySelectorAll<HTMLElement>("#pdf-document .editable").forEach((item, index) => {
        if (snapshot.content[index] !== undefined) item.innerHTML = snapshot.content[index];
      });
      saveContent();
    }, 50);
  };

  const balanceOverflow = () => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>("#pdf-document .page"));
    const next = pages.map((page) => [...page]);
    let changed = false;
    elements.forEach((element, index) => {
      if (element.scrollHeight > 1450 && next[index]?.length > 1) {
        const moving = next[index].pop();
        if (!moving) return;
        if (!next[index + 1]) next[index + 1] = [];
        next[index + 1].unshift(moving);
        changed = true;
      }
    });
    if (changed) {
      rememberLayout();
      setPages(next);
    }
  };

  const scheduleContentSave = () => {
    if (contentTimer.current) window.clearTimeout(contentTimer.current);
    contentTimer.current = window.setTimeout(() => {
      saveContent();
      if (!sourceMode) syncWritingFromCanvas();
      else captureCheckpoint("Writing Mode edit");
      if (smartFlow) window.setTimeout(balanceOverflow, 50);
    }, 700);
  };

  const rememberLayout = () => {
    undoStack.current.push(JSON.stringify(pages));
    if (undoStack.current.length > 50) undoStack.current.shift();
    redoStack.current = [];
    setCanUndo(true);
    setCanRedo(false);
  };

  const updatePage = (page: number, updater: (sections: Section[]) => Section[]) => {
    rememberLayout();
    setPages((current) => current.map((sections, index) => (index === page ? updater(sections) : sections)) as Pages);
  };

  const addSection = (type: SectionType, articleLayout?: ArticleLayout, layoutVariant?: string) => {
    const articleTemplate = type === "article"
      ? ARTICLE_TEMPLATES.find((template) => template.id === (articleLayout ?? "classic"))
      : undefined;
    const width = articleTemplate?.width ?? (
      type === "notice" || type === "gossip"
        ? 4
        : type === "crossword"
        ? 12
        : type === "poem" ||
          type === "events" ||
          type === "timeline" ||
          type === "recommendations" ||
          type === "statistics" ||
          type === "sudoku" ||
          type === "wordsearch"
        ? 6
        : 12);

    const contentForType: Section["content"] = {};
    if (type === "textBox") {
      contentForType.title = "Type a headline";
      contentForType.body = "Click here and start writing.";
    }
    if (type === "shapeBox") {
      contentForType.title = "Add your text";
      contentForType.shapeKind = "rectangle";
    }
    if (type === "article") contentForType.articleLayout = articleTemplate?.id ?? "classic";
    if (layoutVariant) contentForType.layoutVariant = layoutVariant;
    if (type === "notice") {
      contentForType.eyebrow = "Noticeboard";
      contentForType.title = "Submit your work";
      contentForType.body = "Poetry, short fiction, essays, photography, illustration, or fragments we don’t have a name for yet.";
      contentForType.noticeDetails = "Send up to 1,500 words to words@university.edu by Friday at noon.";
      contentForType.qrUrl = "https://newsletter.singulr.tech/submit";
      contentForType.qrEnabled = true;
      contentForType.qrLabel = "Scan to Submit Work";
      contentForType.qrCampaign = "issue-submissions";
      contentForType.useTrackingParams = true;
    }
    if (type === "crossword") contentForType.crossword = DEFAULT_CAMPUS_MINI_CROSSWORD;
    if (type === "sudoku") contentForType.sudoku = DEFAULT_SUDOKU;
    if (type === "wordsearch") contentForType.wordsearch = DEFAULT_WORD_SEARCH;

    updatePage(activePage, (items) => [
      ...items,
      {
        id: `${type}-${Date.now()}`,
        type,
        width,
        height: articleTemplate?.height ?? (type === "sudoku" || type === "crossword" ? "tall" : type === "textBox" || type === "shapeBox" ? "compact" : "regular"),
        content: contentForType,
      },
    ]);
    setLibraryOpen(false);
    setArticleLibraryOpen(false);
    setVariantLibraryType(null);
    window.setTimeout(() => document.querySelector(`#page-${activePage + 1}`)?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
  };

  const addPage = (kind: PagePresetKind) => {
    rememberLayout();
    setPages((current) => [...current, pagePreset(kind)]);
    setActivePage(pages.length);
    setPageMenuOpen(false);
    window.setTimeout(() => document.querySelector(`#page-${pages.length + 1}`)?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  useEffect(() => { localStorage.setItem(`iow-freeform-${issueId}`, String(freeformMode)); }, [issueId, freeformMode]);

  const removePage = async (pageIndex: number) => {
    if (pages.length === 1) {
      await dialog.alert({
        title: "Page Limit",
        message: "A newsletter must contain at least one page.",
        tone: "info",
      });
      return;
    }
    const ok = await dialog.confirm({
      title: "Remove Page",
      message: `Remove page ${pageIndex + 1}? All of its sections will be deleted.`,
      confirmText: "Remove Page",
      danger: true,
    });
    if (!ok) return;
    rememberLayout();
    setPages((current) => current.filter((_, index) => index !== pageIndex));
    setActivePage((current) => Math.max(0, Math.min(current, pages.length - 2)));
  };

  const duplicatePage = (pageIndex: number) => {
    if (pageIndex < 0 || pageIndex >= pages.length) return;
    rememberLayout();
    const originalPage = pages[pageIndex];
    const clonedPage: Section[] = originalPage.map((sec) => ({
      ...sec,
      id: `${sec.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      content: JSON.parse(JSON.stringify(sec.content || {})),
    }));

    setPages((current) => {
      const next = [...current];
      next.splice(pageIndex + 1, 0, clonedPage);
      return next;
    });
    setActivePage(pageIndex + 1);
    window.setTimeout(() => {
      document.querySelector(`#page-${pageIndex + 2}`)?.scrollIntoView({ behavior: "smooth" });
    }, 60);
  };

  const updateSource = (value: string) => {
    setSourceText(value);
    rememberLayout();
    setPages(compileSource(value));
    setActivePage(0);
  };

  const blockAction = (
    action: "up" | "down" | "width" | "height" | "duplicate" | "delete" | "setWidth" | "setHeight" | "widthStep" | "heightStep" | "cycleShape",
    page: number,
    id: string,
    extraValue?: any,
  ) => {
    updatePage(page, (items) => {
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) return items;
      if (action === "cycleShape") {
        const shapes: NonNullable<Section["content"]>["shapeKind"][] = ["rectangle", "circle", "line", "quote"];
        return items.map((item) => item.id === id ? { ...item, content: { ...item.content, shapeKind: shapes[(shapes.indexOf(item.content?.shapeKind ?? "rectangle") + 1) % shapes.length] } } : item);
      }
      if (action === "delete") return items.filter((item) => item.id !== id);
      if (action === "duplicate") {
        const copy = { ...items[index], id: `${items[index].type}-${Date.now()}` };
        return [...items.slice(0, index + 1), copy, ...items.slice(index + 1)];
      }
      if (action === "up" || action === "down") {
        const target = action === "up" ? index - 1 : index + 1;
        if (target < 0 || target >= items.length) return items;
        const next = [...items];
        [next[index], next[target]] = [next[target], next[index]];
        return next;
      }
      if (action === "setWidth") {
        return items.map((item) => (item.id === id ? { ...item, width: extraValue as Section["width"] } : item));
      }
      if (action === "setHeight") {
        return items.map((item) => (item.id === id ? { ...item, height: extraValue as Section["height"] } : item));
      }
      const widths: Section["width"][] = [4, 6, 8, 12];
      if (action === "widthStep") {
        const currentIdx = widths.indexOf(items[index].width);
        const nextIdx = extraValue === "expand" ? Math.min(widths.length - 1, currentIdx + 1) : Math.max(0, currentIdx - 1);
        return items.map((item) => (item.id === id ? { ...item, width: widths[nextIdx] } : item));
      }
      if (action === "width") {
        return items.map((item) =>
          item.id === id ? { ...item, width: widths[(widths.indexOf(item.width) + 1) % widths.length] } : item,
        );
      }
      const heights: Section["height"][] = ["compact", "regular", "tall"];
      if (action === "heightStep") {
        const currentIdx = heights.indexOf(items[index].height);
        const nextIdx = extraValue === "taller" ? Math.min(heights.length - 1, currentIdx + 1) : Math.max(0, currentIdx - 1);
        return items.map((item) => (item.id === id ? { ...item, height: heights[nextIdx] } : item));
      }
      return items.map((item) =>
        item.id === id ? { ...item, height: heights[(heights.indexOf(item.height) + 1) % heights.length] } : item,
      );
    });
  };

  const dropBlock = (targetPage: number, targetId: string) => {
    const insertType = draggedSectionType.current;
    if (insertType) {
      const width = ["notice", "gossip"].includes(insertType) ? 4 : ["poem", "events", "timeline", "recommendations", "statistics", "sudoku", "wordsearch"].includes(insertType) ? 6 : 12;
      const content: Section["content"] = insertType === "textBox" ? { title: "Type a headline", body: "Click here and start writing." } : insertType === "shapeBox" ? { title: "Add your text", shapeKind: "rectangle" } : {};
      if (insertType === "article") content.articleLayout = "classic";
      if (insertType === "crossword") content.crossword = DEFAULT_CAMPUS_MINI_CROSSWORD;
      if (insertType === "sudoku") content.sudoku = DEFAULT_SUDOKU;
      if (insertType === "wordsearch") content.wordsearch = DEFAULT_WORD_SEARCH;
      const section: Section = { id: `${insertType}-${Date.now()}`, type: insertType, width, height: ["textBox", "shapeBox", "heading", "divider"].includes(insertType) ? "compact" : ["sudoku", "crossword"].includes(insertType) ? "tall" : "regular", content };
      rememberLayout();
      setPages((current) => current.map((items, pageIndex) => {
        if (pageIndex !== targetPage) return items;
        const index = items.findIndex((item) => item.id === targetId);
        const next = [...items];
        next.splice(index < 0 ? next.length : index, 0, section);
        return next;
      }) as Pages);
      draggedSectionType.current = null;
      setLibraryOpen(false);
      return;
    }
    const source = dragged.current;
    if (!source || (source.page === targetPage && source.id === targetId)) return;
    const moving = pages[source.page].find((item) => item.id === source.id);
    if (!moving) return;
    rememberLayout();
    const next = pages.map((items) => items.filter((item) => item.id !== source.id)) as Pages;
    const targetIndex = next[targetPage].findIndex((item) => item.id === targetId);
    next[targetPage].splice(targetIndex, 0, moving);
    setPages(next);
    dragged.current = null;
  };

  const saveDraft = () => {
    localStorage.setItem(`iow-layout-${issueId}`, JSON.stringify(pages));
    saveContent();
    setSaved(true);
    setLastSavedTime(Date.now());
    setRelativeSavedTime("just now");
    toast.success("Newsletter issue saved to storage & synced.", "Saved");
    window.setTimeout(() => setSaved(false), 1800);
  };

  const downloadPdf = async () => {
    const wasPreviewing = preview;
    const previousZoom = canvasZoom;
    if (canvasZoom !== 100) {
      setCanvasZoom(100);
    }
    setPreview(true);
    setExporting(true);
    setExportProgress("Preparing");
    try {
      await document.fonts.ready;
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

      // Ensure all images are fully loaded before rendering
      const images = Array.from(document.querySelectorAll<HTMLImageElement>("#pdf-document img"));
      await Promise.all(
        images.map(
          (img) =>
            img.complete
              ? Promise.resolve()
              : new Promise((res) => {
                  img.onload = img.onerror = res;
                })
        )
      );

      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas-pro"),
        import("jspdf"),
      ]);
      const pageElements = Array.from(document.querySelectorAll<HTMLElement>("#pdf-document .page"));
      if (!pageElements.length) throw new Error("No newsletter pages were found.");

      let pdf: InstanceType<typeof jsPDF> | null = null;
      for (let index = 0; index < pageElements.length; index += 1) {
        const page = pageElements[index];
        setExportProgress(`Rendering ${index + 1} of ${pageElements.length}`);

        // Ensure current page is in viewport so rendering layout matches exactly
        page.scrollIntoView({ block: "start", inline: "nearest" });
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

        const width = Math.ceil(page.offsetWidth);
        const height = Math.ceil(Math.max(page.scrollHeight, page.offsetHeight));
        const orientation = width > height ? "landscape" : "portrait";

        const canvas = await html2canvas(page, {
          backgroundColor: palette.paper || "#f8f5ed",
          scale: 2,
          useCORS: true,
          logging: false,
          width,
          height,
          scrollX: 0,
          scrollY: 0,
          onclone: (clonedDoc, clonedElement) => {
            // 1. Reset zoom on cloned pdf-document
            const clonedPdfDoc = clonedDoc.getElementById("pdf-document");
            if (clonedPdfDoc) {
              clonedPdfDoc.style.zoom = "1";
              clonedPdfDoc.style.transform = "none";
            }

            // 2. Prevent parent container padding from constraining or shrinking the page
            const clonedMain = clonedDoc.querySelector("main.editor-canvas");
            if (clonedMain instanceof HTMLElement) {
              clonedMain.style.paddingLeft = "0";
              clonedMain.style.paddingRight = "0";
              clonedMain.style.marginLeft = "auto";
              clonedMain.style.marginRight = "auto";
              clonedMain.style.maxWidth = `${width}px`;
              clonedMain.style.width = `${width}px`;
            }

            // 3. Pin cloned page to exact pixel width to prevent any right-side gap
            if (clonedElement instanceof HTMLElement) {
              clonedElement.style.width = `${width}px`;
              clonedElement.style.minWidth = `${width}px`;
              clonedElement.style.maxWidth = `${width}px`;
              clonedElement.style.margin = "0";
              clonedElement.style.boxShadow = "none";
              clonedElement.style.borderRadius = "0";
            }

            // 4. Hide all editing controls
            clonedDoc.querySelectorAll<HTMLElement>(".editor-only").forEach((el) => {
              el.style.display = "none";
            });
          },
        });

        if (!pdf) {
          pdf = new jsPDF({
            orientation,
            unit: "px",
            format: [width, height],
            hotfixes: ["px_scaling"],
            compress: true,
          });
        } else {
          pdf.addPage([width, height], orientation);
        }

        const pdfPageWidth = pdf.internal.pageSize.getWidth();
        const pdfPageHeight = pdf.internal.pageSize.getHeight();
        pdf.addImage(
          canvas.toDataURL("image/jpeg", 0.98),
          "JPEG",
          0,
          0,
          pdfPageWidth,
          pdfPageHeight,
          undefined,
          "FAST"
        );
      }
      setExportProgress("Downloading");
      const filename = issue.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "newsletter";
      pdf?.save(`${filename}.pdf`);
    } catch (error) {
      console.error("PDF export failed", error);
      dialog.alert({
        title: "PDF Export Notice",
        message: "The PDF could not be created. Check that uploaded images are available, then try again.",
        tone: "danger",
      });
    } finally {
      if (previousZoom !== 100) {
        setCanvasZoom(previousZoom);
      }
      setExporting(false);
      setExportProgress("");
      setPreview(wasPreviewing);
    }
  };

  const undo = () => {
    const previous = undoStack.current.pop();
    if (!previous) return;
    redoStack.current.push(JSON.stringify(pages));
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(true);
    const parsed = JSON.parse(previous);
    setPages(parsed);
    localStorage.setItem(`iow-layout-${issueId}`, previous);
    toast.info("Undid last layout change", "Undo");
  };

  const redo = () => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push(JSON.stringify(pages));
    setCanUndo(true);
    setCanRedo(redoStack.current.length > 0);
    const parsed = JSON.parse(next);
    setPages(parsed);
    localStorage.setItem(`iow-layout-${issueId}`, next);
    toast.info("Restored layout change", "Redo");
  };

  // QoL: Global Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable);

      // Shortcuts modal: ? (when not typing) or Cmd+/
      if ((e.key === "?" && !isInput) || ((e.metaKey || e.ctrlKey) && e.key === "/")) {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
        return;
      }

      // Close open drawers/modals on Escape
      if (e.key === "Escape") {
        setShortcutsOpen(false);
        setShareOpen(false);
        setPhotoPickerOpen(false);
        setLibraryOpen(false);
        setPageMenuOpen(false);
        setDesignOpen(false);
        setFormatOpen(false);
        setStudioOpen(false);
        setFindOpen(false);
        setSuggestionsOpen(false);
      }

      // Undo: Cmd+Z (without Shift)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        if (!isInput) {
          e.preventDefault();
          undo();
        }
      }

      // Redo: Cmd+Shift+Z or Cmd+Y
      if (
        ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "z") ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y")
      ) {
        if (!isInput) {
          e.preventDefault();
          redo();
        }
      }

      // Force Save: Cmd+S
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveDraft();
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setFindOpen(true);
      }

      // Preview toggle: Cmd+Shift+P or Cmd+P
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setPreview((prev) => !prev);
      }

      // Quick jump to page 1, 2, 3... when not editing
      if (!isInput && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const pageNum = parseInt(e.key, 10);
        if (pageNum >= 1 && pageNum <= pages.length) {
          setActivePage(pageNum - 1);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, saveDraft, pages.length]);

  const setStatus = (status: Issue["status"]) => {
    const next = { ...issue, status };
    setIssue(next);
    updateIssue(issueId, { status });
  };

  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    scheduleContentSave();
  };

  const searchEditableCopy = (advance = false) => {
    if (!findQuery.trim()) return;
    const matches: { range: Range; node: Text; start: number; end: number }[] = [];
    document.querySelectorAll<HTMLElement>("#pdf-document .editable").forEach((editable) => {
      const walker = document.createTreeWalker(editable, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode() as Text | null;
      while (node) {
        const source = node.data.toLocaleLowerCase();
        const query = findQuery.toLocaleLowerCase();
        let offset = 0;
        while ((offset = source.indexOf(query, offset)) !== -1) {
          const range = document.createRange();
          range.setStart(node, offset);
          range.setEnd(node, offset + query.length);
          matches.push({ range, node, start: offset, end: offset + query.length });
          offset += query.length;
        }
        node = walker.nextNode() as Text | null;
      }
    });
    setFindMatches(matches);
    const nextIndex = matches.length ? (advance ? (findIndex + 1) % matches.length : 0) : 0;
    setFindIndex(nextIndex);
    const match = matches[nextIndex];
    if (match) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(match.range);
      match.range.startContainer.parentElement?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const replaceCurrentMatch = () => {
    const match = findMatches[findIndex];
    if (!match || !match.node.isConnected) return;
    match.node.replaceData(match.start, match.end - match.start, replaceQuery);
    saveContent();
    window.setTimeout(() => searchEditableCopy(), 0);
  };

  const replaceAllMatches = () => {
    if (!findQuery.trim()) return;
    const query = findQuery.toLocaleLowerCase();
    const edits: { node: Text; offsets: number[] }[] = [];
    findMatches.forEach(({ node, start }) => {
      const entry = edits.find((item) => item.node === node) ?? { node, offsets: [] };
      entry.offsets.push(start);
      if (!edits.includes(entry)) edits.push(entry);
    });
    let count = 0;
    edits.forEach(({ node, offsets }) => offsets.sort((a, b) => b - a).forEach((start) => {
      if (node.isConnected && node.data.slice(start, start + query.length).toLocaleLowerCase() === query) {
        node.replaceData(start, query.length, replaceQuery);
        count += 1;
      }
    }));
    saveContent();
    setFindMatches([]);
    toast.success(`Replaced ${count} occurrence${count === 1 ? "" : "s"}.`, "Find & replace");
  };

  const createSuggestion = () => {
    if (!aiResult.trim()) return;
    setSuggestions((current) => [...current, { id: `suggestion-${Date.now()}`, original: aiOriginal, proposed: aiResult, apply: aiApplyRef.current, isCurrent: aiTargetIsCurrentRef.current }]);
    setAiOpen(false);
    setSuggestionsOpen(true);
  };

  const savePublicationStyleGuide = () => {
    captureCheckpoint("Before applying publication style guide");
    localStorage.setItem(STYLE_GUIDE_KEY, JSON.stringify(styleGuide));
    setPaletteId(styleGuide.paletteId);
    setFontId(styleGuide.fontId);
    localStorage.setItem(`iow-palette-${issueId}`, styleGuide.paletteId);
    localStorage.setItem(`iow-font-${issueId}`, styleGuide.fontId);
    broadcastDocChange("palette", styleGuide.paletteId);
    broadcastDocChange("font", styleGuide.fontId);
    toast.success("Publication style guide saved and applied.", "Style guide");
  };

  const createNamedCheckpoint = async () => {
    const label = await dialog.prompt({ title: "Name this version", message: "Give this snapshot a useful name so you can find it later.", placeholder: "e.g. Approved front page", confirmText: "Save version" });
    if (label?.trim()) captureCheckpoint(label.trim());
  };

  const compareCheckpoint = (snapshot: DocumentCheckpoint) => {
    setCompareCheckpointId(snapshot.id);
    setComparisonContent(Array.from(document.querySelectorAll<HTMLElement>("#pdf-document .editable")).map((item) => item.innerHTML));
  };

  const getCheckpointDiffs = (snapshot: DocumentCheckpoint) => snapshot.content.flatMap((before, index) => {
    const after = comparisonContent[index] ?? "";
    if (before === after) return [];
    const plain = (html: string) => html.replace(/<br\s*\/?\s*>/gi, "\n").replace(/<\/(p|div|li|h[1-6])>/gi, "\n").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").trim();
    return [{ index, before: plain(before), after: plain(after) }];
  });

  const addLink = async () => {
    const url = await dialog.prompt({
      title: "Insert Hyperlink",
      message: "Enter destination web link URL:",
      placeholder: "https://example.edu",
      defaultValue: "https://",
      confirmText: "Insert Link",
    });
    if (url?.trim()) formatText("createLink", url.trim());
  };

  const openAiRewrite = (text: string, apply: (value: string) => void) => {
    if (!text.trim()) return;
    aiApplyRef.current = apply;
    setAiOriginal(text.trim());
    setAiResult("");
    setAiError("");
    setAiInstruction("");
    setAiOpen(true);
  };

  const runAiRewrite = async () => {
    setAiLoading(true);
    setAiError("");
    try {
      setAiResult(await rewriteWithAi(aiOriginal, loadPreferences(), aiInstruction));
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "The rewrite could not be completed.");
    } finally {
      setAiLoading(false);
    }
  };

  const captureCanvasSelection = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim() ?? "";
    const anchor = selection?.anchorNode instanceof Element ? selection.anchorNode : selection?.anchorNode?.parentElement;
    if (!text || !anchor?.closest("#pdf-document .editable") || !selection?.rangeCount) {
      setSelectionText("");
      return;
    }
    const range = selection.getRangeAt(0).cloneRange();
    aiTargetIsCurrentRef.current = () => range.toString() === text;
    setSelectionText(text);
    aiApplyRef.current = (value) => {
      range.deleteContents();
      range.insertNode(document.createTextNode(value));
      selection.removeAllRanges();
      setSelectionText("");
      saveContent();
    };
  };

  const rewriteCanvasSelection = () => {
    if (!selectionText) return;
    const apply = aiApplyRef.current;
    openAiRewrite(selectionText, apply);
  };

  const handleFloatingToolbarAiRewrite = (text: string) => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0).cloneRange();
      aiTargetIsCurrentRef.current = () => range.toString() === text;
      aiApplyRef.current = (value) => {
        range.deleteContents();
        range.insertNode(document.createTextNode(value));
        selection.removeAllRanges();
        setSelectionText("");
        saveContent();
      };
    }
    openAiRewrite(text, aiApplyRef.current);
  };

  const rewriteSection = (sectionId: string) => {
    const section = document.querySelector<HTMLElement>(`[data-section-id="${sectionId}"]`);
    const fields = Array.from(section?.querySelectorAll<HTMLElement>(".editable") ?? []);
    const target = fields.sort((a, b) => b.innerText.length - a.innerText.length)[0];
    if (!target?.innerText.trim()) return;
    const original = target.innerText;
    aiTargetIsCurrentRef.current = () => target.isConnected && target.innerText === original;
    openAiRewrite(original, (value) => {
      target.innerText = value;
      saveContent();
    });
  };

  const rewriteSourceSelection = () => {
    const input = sourceRef.current;
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = sourceText.slice(start, end);
    if (!text.trim()) {
      dialog.alert({
        title: "No Text Selected",
        message: "Select text in Writing Mode first before requesting an AI rewrite.",
        tone: "info",
      });
      return;
    }
    aiTargetIsCurrentRef.current = () => input.value.slice(start, end) === text;
    openAiRewrite(text, (value) => updateSource(`${sourceText.slice(0, start)}${value}${sourceText.slice(end)}`));
  };

  const filteredSlashCommands = SLASH_COMMANDS.filter((item) =>
    `${item.command} ${item.label}`.toLowerCase().includes((slashQuery ?? "").toLowerCase()),
  );

  const handleSourceChange = (value: string, cursor: number) => {
    updateSource(value);
    const lineStart = value.lastIndexOf("\n", cursor - 1) + 1;
    const fragment = value.slice(lineStart, cursor);
    const match = fragment.match(/^\/([A-Za-z]*)$/);
    if (match) {
      slashStartRef.current = lineStart;
      setSlashQuery(match[1]);
      setSlashIndex(0);
    } else {
      setSlashQuery(null);
    }
  };

  const chooseSlashCommand = (command: string) => {
    const input = sourceRef.current;
    if (!input) return;
    const cursor = input.selectionStart;
    const insertion = `/${command} `;
    const next = `${sourceText.slice(0, slashStartRef.current)}${insertion}${sourceText.slice(cursor)}`;
    setSlashQuery(null);
    updateSource(next);
    const position = slashStartRef.current + insertion.length;
    window.setTimeout(() => {
      input.focus();
      input.setSelectionRange(position, position);
    }, 0);
  };

  const handleSlashKey = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (slashQuery === null || !filteredSlashCommands.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSlashIndex((index) => (index + 1) % filteredSlashCommands.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSlashIndex((index) => (index - 1 + filteredSlashCommands.length) % filteredSlashCommands.length);
    } else if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      chooseSlashCommand(filteredSlashCommands[slashIndex]?.command ?? filteredSlashCommands[0].command);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setSlashQuery(null);
    }
  };

  const movePage = (from: number, to: number) => {
    if (to < 0 || to >= pages.length || from === to) return;
    rememberLayout();
    setPages((current) => {
      const next = [...current];
      const [moving] = next.splice(from, 1);
      next.splice(to, 0, moving);
      return next;
    });
    setActivePage(to);
    window.setTimeout(() => {
      document.querySelector(`#page-${to + 1}`)?.scrollIntoView({ behavior: "smooth" });
    }, 60);
  };

  const syncWritingFromCanvas = () => {
    const commandFor: Record<SectionType, string> = {
      cover: "Title", heading: "Heading", article: "Article", photo: "Photo",
      poem: "Poetry", quote: "Quote", events: "Events", gossip: "Gossip",
      gallery: "Gallery", notice: "Notice", divider: "Divider", footer: "Final",
      interview: "Interview", statistics: "Statistics", timeline: "Timeline",
      recommendations: "Recommendations",
      audio: "Audio", poll: "Poll", crossword: "Crossword", sudoku: "Sudoku", wordsearch: "Word Search",
      textBox: "Text", shapeBox: "Shape", imageBox: "Photo",
    };
    const output = pages.map((sections, pageIndex) => {
      const page = sections.map((section) => {
        const element = document.querySelector<HTMLElement>(`[data-section-id="${section.id}"]`);
        const fields = Array.from(element?.querySelectorAll<HTMLElement>(".editable") ?? [])
          .map((item) => item.innerText.trim())
          .filter(Boolean);
        const title = fields[0] ?? section.content?.title ?? "";
        const body = fields.slice(1).join("\n\n") || section.content?.body || "";
        return `/${commandFor[section.type]}${title ? ` ${title}` : ""}${body ? `\n${body}` : ""}`;
      }).join("\n\n");
      return `${pageIndex ? "/Page\n" : ""}${page}`;
    }).join("\n\n");
    setSourceText(output);
    captureCheckpoint("Synchronized canvas to Writing Mode");
  };

  const runPreflight = () => {
    const results: { tone: "pass" | "warn"; label: string; detail: string }[] = [];
    const pageElements = Array.from(document.querySelectorAll<HTMLElement>("#pdf-document .page"));
    const emptyPages = pages.filter((page) => page.length === 0).length;
    const overflow = pageElements.filter((page) => page.scrollHeight > 1450).length;
    const emptyFields = Array.from(document.querySelectorAll<HTMLElement>("#pdf-document .editable"))
      .filter((item) => !item.innerText.trim()).length;
    const placeholders = document.querySelectorAll("#pdf-document .photo-placeholder").length;
    const lowResolution = Array.from(document.querySelectorAll<HTMLImageElement>("#pdf-document img"))
      .filter((image) => image.complete && image.naturalWidth < image.clientWidth * 1.5).length;
    const missingAlt = Array.from(document.querySelectorAll<HTMLImageElement>("#pdf-document img")).filter((image) => !image.alt.trim()).length;
    const unsafeLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>("#pdf-document .editable a")).filter((link) => !link.getAttribute("href")?.trim() || link.getAttribute("href") === "#" || (link.protocol !== "https:" && link.protocol !== "http:")).length;
    const placeholderHeadlines = Array.from(document.querySelectorAll<HTMLElement>("#pdf-document h1, #pdf-document h2, #pdf-document h3")).filter((heading) => /your (issue )?title|headline here|add (a )?headline/i.test(heading.innerText)).length;
    const placeholderBylines = pages.flat().filter((section) => section.type === "article").filter((section) => {
      const block = document.querySelector<HTMLElement>(`#pdf-document [data-section-id="${section.id}"]`);
      return !block || /editorial team|by name|your name/i.test(block.innerText);
    }).length;
    results.push({ tone: emptyPages ? "warn" : "pass", label: "Page structure", detail: emptyPages ? `${emptyPages} empty page${emptyPages === 1 ? "" : "s"}` : "Every page contains content" });
    results.push({ tone: overflow ? "warn" : "pass", label: "Page flow", detail: overflow ? `${overflow} page${overflow === 1 ? "" : "s"} should be rebalanced` : "No page overflow detected" });
    results.push({ tone: emptyFields ? "warn" : "pass", label: "Copy completeness", detail: emptyFields ? `${emptyFields} empty text field${emptyFields === 1 ? "" : "s"}` : "All text fields contain copy" });
    results.push({ tone: placeholders ? "warn" : "pass", label: "Photography", detail: placeholders ? `${placeholders} image placeholder${placeholders === 1 ? "" : "s"} remaining` : "All image slots are filled" });
    results.push({ tone: lowResolution ? "warn" : "pass", label: "Image resolution", detail: lowResolution ? `${lowResolution} image${lowResolution === 1 ? "" : "s"} may print softly` : "Image resolution looks suitable" });
    results.push({ tone: missingAlt ? "warn" : "pass", label: "Image descriptions", detail: missingAlt ? `${missingAlt} image${missingAlt === 1 ? "" : "s"} missing alternative text` : "Images have alternative text" });
    results.push({ tone: unsafeLinks ? "warn" : "pass", label: "Links", detail: unsafeLinks ? `${unsafeLinks} link${unsafeLinks === 1 ? "" : "s"} need a valid http or https destination` : "Links have valid destinations" });
    results.push({ tone: placeholderHeadlines || placeholderBylines ? "warn" : "pass", label: "Editorial details", detail: `${placeholderHeadlines} placeholder headline${placeholderHeadlines === 1 ? "" : "s"}; ${placeholderBylines} article byline${placeholderBylines === 1 ? "" : "s"} still need a named author` });
    let workflowWarnings = 0;
    try {
      const workflow = JSON.parse(localStorage.getItem("iow-phase2-workflow") ?? "{}");
      workflowWarnings += (workflow.comments ?? []).filter((item: { resolved?: boolean }) => !item.resolved).length;
      workflowWarnings += (workflow.submissions ?? []).filter((item: { status?: string; consent?: boolean }) => item.status === "accepted" && !item.consent).length;
    } catch {
      // Workflow checks are optional when no local workflow has been created.
    }
    results.push({ tone: workflowWarnings ? "warn" : "pass", label: "Editorial clearance", detail: workflowWarnings ? `${workflowWarnings} workflow item${workflowWarnings === 1 ? "" : "s"} need attention` : "No unresolved local workflow warnings" });
    setPreflight(results);
  };

  const runAiReview = async () => {
    const copy = Array.from(document.querySelectorAll<HTMLElement>("#pdf-document .editable"))
      .map((item) => item.innerText.trim()).filter(Boolean).join("\n\n").slice(0, 12000);
    setAiReviewing(true);
    setAiReview("");
    try {
      const review = await rewriteWithAi(
        copy,
        loadPreferences(),
        "Do not rewrite the copy. Return a concise editorial risk report with bullets for factual claims, dates, attribution, privacy, potentially defamatory language, repetition, tone inconsistency, grammar, and reading clarity. Say 'No issue found' where appropriate.",
      );
      setAiReview(review);
    } catch (error) {
      setAiReview(error instanceof Error ? error.message : "AI review could not be completed.");
    } finally {
      setAiReviewing(false);
    }
  };

  const saveAsTemplate = async (scope: "issue" | "page") => {
    const name = await dialog.prompt({
      title: scope === "issue" ? "Save Newsletter Template" : "Save Page Template",
      message:
        scope === "issue"
          ? "Enter a title for this reusable issue template:"
          : "Enter a title for this reusable page layout template:",
      placeholder: "e.g. Weekly Campus Digest",
      confirmText: "Save Template",
    });
    if (!name?.trim()) return;
    const cleanName = name.trim();
    const selectedPages = scope === "issue" ? pages : [pages[activePage] ?? [], [], []];
    saveCustomTemplate({
      id: `custom-${Date.now()}`,
      name: cleanName,
      description: scope === "issue" ? "Custom newsletter template created by your team." : "Custom page template created from the current page.",
      category: "Team template",
      accent: palette.accent,
      preview: "editorial",
      pages: selectedPages.slice(0, 3).concat([[], [], []]).slice(0, 3) as [Section[], Section[], Section[]],
    });
    captureCheckpoint(`Saved ${scope} as template`);
    await dialog.alert({
      title: "Template Saved",
      message: `“${cleanName}” is now available when creating a newsletter.`,
      tone: "success",
    });
  };

  const downloadBlob = (contents: string, filename: string, type: string) => {
    const url = URL.createObjectURL(new Blob([contents], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportJson = () => {
    const content = Array.from(document.querySelectorAll<HTMLElement>("#pdf-document .editable")).map((item) => item.innerHTML);
    downloadBlob(JSON.stringify({ version: 1, issue, pages, content, paletteId, fontId }, null, 2), `${issue.id}.json`, "application/json");
  };

  const exportEmailHtml = () => {
    const escapeHtml = (value: string) =>
      value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const blocks = Array.from(document.querySelectorAll<HTMLElement>("#pdf-document .builder-block")).map((block) => {
      const copy = Array.from(block.querySelectorAll<HTMLElement>(".editable")).map((item) => item.innerText.trim()).filter(Boolean);
      return `<tr><td style="padding:28px 32px;border-bottom:1px solid #d8d4ca;font-family:Georgia,serif;color:#171714"><h2 style="margin:0 0 12px;font-size:28px">${escapeHtml(copy[0] ?? "")}</h2><p style="margin:0;white-space:pre-line;font-size:16px;line-height:1.6">${escapeHtml(copy.slice(1).join("\n\n"))}</p></td></tr>`;
    }).join("");
    const html = `<!doctype html><html><body style="margin:0;background:#e8e5de"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:24px"><table role="presentation" width="680" cellspacing="0" cellpadding="0" style="max-width:680px;background:${palette.paper}"><tr><td style="padding:28px 32px;background:${palette.accent};color:white;font-family:Arial,sans-serif;font-size:12px;letter-spacing:2px">IN OTHER WORDS · UNIVERSITY EDITION</td></tr>${blocks}</table></td></tr></table></body></html>`;
    downloadBlob(html, `${issue.id}-email.html`, "text/html");
  };

  const mediaEntries = Object.entries(collectMedia()).filter(([, value]) => value.startsWith("data:image") || value.startsWith("https://"));

  return (
    <div
      className={`editor-theme min-h-screen bg-[#dedbd3] text-[#171714] ${preview ? "preview" : ""} ${exporting ? "exporting" : ""}`}
      style={{
        "--editor-accent": palette.accent,
        "--editor-paper": palette.paper,
        "--editor-ink": palette.ink,
        "--editor-workspace": palette.workspace,
        "--editor-serif": fontPair.serif,
        "--editor-sans": fontPair.sans,
        "--editor-headline-font": styleGuide.headlineStyle === "Clean sans" ? fontPair.sans : fontPair.serif,
        "--editor-headline-weight": styleGuide.headlineStyle === "Bold serif" ? "800" : "inherit",
      } as CSSProperties}
    >
      <header className="editor-bar sticky top-0 z-40 flex h-14 flex-nowrap items-center justify-between gap-x-2 border-b border-black/10 bg-[#f4f1e9]/95 px-3 sm:px-4 md:px-6 backdrop-blur-md">
        <div className="flex shrink-0 items-center gap-2">
          <Link aria-label="Back to dashboard" className="editor-icon-button" to="/" title="Back to dashboard"><EditorIcon name="back" /></Link>
          <BrandLogo className="h-8 w-16 opacity-85" />
          <div className="hidden min-w-0 border-l border-black/10 pl-3 2xl:block dark:border-white/10">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">Issue editor</p>
            <p className="mt-0.5 max-w-44 truncate font-serif text-[14px] leading-none">{issue.title}</p>
          </div>
        </div>

        <nav className="editor-page-nav hidden md:flex max-w-[20vw] items-center gap-0.5 overflow-x-auto rounded-xl border border-black/5 bg-black/[0.025] p-1">
          {pages.map((_, pageIndex) => (
            <a
              className={`rounded-lg px-2.5 py-1 text-[10px] font-medium ${activePage === pageIndex ? "bg-white shadow-sm dark:bg-white/10" : ""}`}
              href={`#page-${pageIndex + 1}`}
              key={pageIndex}
              onClick={() => setActivePage(pageIndex)}
            >
              {pageIndex + 1}
            </a>
          ))}
          <button aria-label="Add page" className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-[#ef5a35] hover:bg-white/70 dark:hover:bg-white/10" onClick={() => setPageMenuOpen(true)} title="Add page" type="button"><EditorIcon name="add" /></button>
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
          <CollaboratorAvatars
            collaborators={collaborators}
            isConnected={isConnected}
            myId={myId}
            myColor={userColor}
          />
          <span className="mx-0.5 hidden h-5 w-px bg-black/10 sm:block" />

          {/* Editorial Notes / Comments button */}
          <button
            aria-label="Editorial notes"
            className={`editor-icon-button relative ${commentsOpen ? "bg-white text-[#ef5a35]" : ""}`}
            onClick={() => {
              setCommentsOpen(!commentsOpen);
              if (chatOpen) setChatOpen(false);
            }}
            title="Editorial notes & annotations"
            type="button"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            {comments.filter((c) => !c.resolved).length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ef5a35] px-1 text-[9px] font-bold text-white shadow-sm">
                {comments.filter((c) => !c.resolved).length}
              </span>
            )}
          </button>

          {/* Newsroom Live Chat button */}
          <button
            aria-label="Newsroom chat"
            className={`editor-icon-button relative ${chatOpen ? "bg-white text-[#ef5a35]" : ""}`}
            onClick={() => {
              setChatOpen(!chatOpen);
              if (commentsOpen) setCommentsOpen(false);
            }}
            title="Newsroom live chat"
            type="button"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {chatMessages.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#3e6a59] px-1 text-[9px] font-bold text-white shadow-sm">
                {chatMessages.length}
              </span>
            )}
          </button>

          {/* Reader View button */}
          <Link
            aria-label="Open Reader View"
            className="editor-icon-button hidden sm:grid"
            target="_blank"
            to={`/read/${issueId}`}
            title="Open Reader View (Public Edition)"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </Link>

          {/* Auto-Save & Sync Status Pill */}
          <button
            className="editor-save-status hidden 2xl:flex items-center gap-1.5 rounded-full px-2 py-1 text-[10px] font-medium text-black/55 dark:text-white/65 transition"
            onClick={saveDraft}
            title="Save the current issue now"
            type="button"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${cloudSaveState === "saved" ? "bg-[#3e6a59]" : cloudSaveState === "offline" || cloudSaveState === "conflict" ? "bg-[#ef5a35]" : "bg-[#c19639] animate-pulse"}`} />
            <span>{cloudSaveState === "conflict" ? "Sync conflict · local copy kept" : cloudSaveState === "saved" ? "Cloud saved" : cloudSaveState === "offline" ? "Offline · local copy" : cloudSaveState === "saving" ? "Saving to cloud" : saved ? "Saved locally" : "Connecting"}</span>
          </button>

          <button aria-label={sourceMode ? "Canvas mode" : "Writing mode"} className={`editor-icon-button ${sourceMode ? "is-active" : ""}`} onClick={() => setSourceMode(!sourceMode)} title={sourceMode ? "Canvas mode" : "Writing mode"} type="button"><EditorIcon name="write" /></button>
          <button aria-label={freeformMode ? "Switch to flow layout" : "Switch to freeform layout"} className={`editor-icon-button ${freeformMode ? "is-active" : ""}`} onClick={() => setFreeformMode((value) => !value)} title={freeformMode ? "Switch to flow layout" : "Freeform canvas: drag and resize blocks"} type="button"><span className="text-[10px] font-bold">{freeformMode ? "XY" : "↗"}</span></button>
          <button aria-label="Text formatting" className={`editor-icon-button hidden sm:grid ${formatOpen ? "is-active" : ""}`} onClick={() => setFormatOpen(!formatOpen)} title="Text formatting" type="button"><EditorIcon name="type" /></button>
          <div className="editor-history-controls hidden xl:flex items-center gap-0.5 border-l border-black/10 pl-1.5 dark:border-white/10">
            <button aria-label="Undo layout change" className="editor-icon-button disabled:opacity-25 disabled:pointer-events-none" disabled={!canUndo} onClick={undo} title="Undo layout change (⌘Z)" type="button"><EditorIcon name="undo" /></button>
            <button aria-label="Redo layout change" className="editor-icon-button disabled:opacity-25 disabled:pointer-events-none" disabled={!canRedo} onClick={redo} title="Redo layout change (⌘⇧Z)" type="button"><EditorIcon name="redo" /></button>
          </div>
          <button aria-label="Add section" className="editor-icon-button" onClick={() => setLibraryOpen(true)} title="Add section" type="button"><EditorIcon name="add" /></button>
          <details className="editor-more-menu relative">
            <summary className="editor-icon-button grid cursor-pointer list-none place-items-center" aria-label="More editor tools" title="More tools"><span className="text-base leading-none">···</span></summary>
            <div className="editor-menu-popover absolute right-0 top-10 z-50 grid min-w-56 gap-1 rounded-xl border p-2 shadow-xl">
              <div className="flex items-center justify-between px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-black/50 dark:text-white/50">
                <span>Status</span>
                <span className="font-semibold text-[#ef5a35]">{issue.status}</span>
              </div>
              <div className="grid gap-1.5 px-1 pb-2 mb-1 border-b border-black/10 dark:border-white/10">
                {(["draft", "review", "published"] as const).map((s) => (
                  <button
                    key={s}
                    className={`flex min-h-10 w-full items-center justify-between rounded-md px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] transition ${issue.status === s ? "bg-[#ef5a35] text-white shadow-xs" : "bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15"}`}
                    onClick={() => setStatus(s)}
                    type="button"
                  >
                    <span>{s === "review" ? "In review" : s === "published" ? "Published" : "Draft"}</span>
                    {issue.status === s && <span aria-hidden="true" className="text-sm leading-none">✓</span>}
                  </button>
                ))}
              </div>
              <button onClick={() => setDesignOpen(true)} type="button">Document design</button>
              <button onClick={() => setFindOpen(true)} type="button">Find & replace <span className="float-right opacity-45">⌘F</span></button>
              <button onClick={() => setSuggestionsOpen(true)} type="button">Suggestions {suggestions.length ? `(${suggestions.length})` : ""}</button>
              <button onClick={() => setPageMenuOpen(true)} type="button">Manage pages</button>
              <button onClick={() => setStudioOpen(true)} type="button">Production studio</button>
              <button onClick={() => setEmailModalOpen(true)} type="button">Email Studio & HTML</button>
              <button onClick={() => setShortcutsOpen(true)} type="button">Keyboard shortcuts</button>
            </div>
          </details>
          <button aria-label={preview ? "Return to editing" : "Preview"} className="editor-icon-button" onClick={() => setPreview(!preview)} title={preview ? "Return to editing" : "Preview"} type="button"><EditorIcon name={preview ? "edit" : "preview"} /></button>
          <button
            aria-label="Share edition"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-black/15 bg-white/80 px-2.5 sm:px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-[#ef5a35] hover:bg-[#ef5a35] hover:text-white dark:border-white/15 dark:bg-[#20201d] dark:hover:bg-[#ef5a35] dark:hover:text-white transition shadow-2xs"
            onClick={() => setShareOpen(true)}
            title="Share reader edition & generate links"
            type="button"
          >
            <EditorIcon name="share" />
            <span className="hidden sm:inline">Share</span>
          </button>
          <button className="editor-export-button shrink-0 rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] font-semibold disabled:cursor-wait disabled:opacity-60 whitespace-nowrap" disabled={exporting} onClick={downloadPdf} type="button">
            {exporting ? exportProgress : "Export PDF"}
          </button>
        </div>
      </header>
      {cloudSaveState === "conflict" && <div className="editor-only sticky top-14 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-[#a14b32]/20 bg-[#f3e6dc] px-4 py-3 text-xs text-[#5d3025] shadow-sm"><span><strong>Another editor saved first.</strong> {cloudConflictMessage} Your edits remain open in this tab. Download a recovery copy before loading the latest version.</span><div className="flex shrink-0 gap-2"><button className="rounded-full border border-[#a14b32]/30 px-3 py-1.5 font-bold" onClick={() => { const media = Object.entries(collectMedia()).map(([key, value]) => { let meta = {}; try { meta = JSON.parse(localStorage.getItem(`${key}-meta`) ?? "{}"); } catch { /* Leave optional image metadata empty. */ } return { key, value, meta: { ...meta, ...(unsyncedMediaMeta.get(key) ?? {}) } }; }); const snapshot = { issueId, pages, content: Array.from(document.querySelectorAll<HTMLElement>("#pdf-document .editable")).map((element) => element.innerHTML), paletteId, fontId, freeformMode, media, savedAt: new Date().toISOString() }; const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" })); const link = document.createElement("a"); link.href = url; link.download = `${issueId}-recovery.json`; link.click(); URL.revokeObjectURL(url); }} type="button">Download recovery</button><button className="rounded-full border border-[#a14b32]/30 px-3 py-1.5 font-bold" onClick={() => window.location.reload()} type="button">Load latest version</button></div></div>}

      {formatOpen && (
        <div className="editor-only fixed right-4 top-14 z-40 flex max-w-[calc(100vw-2rem)] flex-wrap items-center gap-1 rounded-xl border border-black/15 bg-[#f8f5ed]/95 p-2 shadow-xl backdrop-blur-md dark:border-white/15 dark:bg-[#1a1916]/95 dark:text-[#f3f0e8]">
          {[
            ["bold", "bold"], ["italic", "italic"], ["underline", "underline"],
            ["insertUnorderedList", "list"], ["insertOrderedList", "ordered"],
            ["justifyLeft", "left"], ["justifyCenter", "center"],
          ].map(([command, icon]) => (
            <button aria-label={command} className="editor-icon-button" key={command} onMouseDown={(event) => { event.preventDefault(); formatText(command); }} title={command} type="button"><EditorIcon name={icon as EditorIconName} /></button>
          ))}
          <span className="mx-1 h-8 w-px bg-black/10 dark:bg-white/10" />
          <button aria-label="Add link" className="editor-icon-button" onMouseDown={(event) => { event.preventDefault(); addLink(); }} title="Add link" type="button"><EditorIcon name="link" /></button>
          <button aria-label="Heading" className="editor-icon-button" onMouseDown={(event) => { event.preventDefault(); formatText("formatBlock", "h2"); }} title="Heading" type="button"><EditorIcon name="heading" /></button>
          <button aria-label="Clear formatting" className="editor-icon-button" onMouseDown={(event) => { event.preventDefault(); formatText("removeFormat"); }} title="Clear formatting" type="button"><EditorIcon name="clear" /></button>
          <span className="mx-1 h-8 w-px bg-black/10 dark:bg-white/10" />
          <button
            aria-label="Close text formatting"
            className="editor-icon-button text-black/50 hover:bg-[#ef5a35] hover:text-white dark:text-white/60 dark:hover:bg-[#ef5a35] dark:hover:text-white"
            onClick={() => setFormatOpen(false)}
            title="Close formatting bar"
            type="button"
          >
            <EditorIcon name="close" />
          </button>
        </div>
      )}

      {findOpen && (
        <section className="editor-only fixed right-4 top-16 z-50 w-[min(24rem,calc(100vw-2rem))] border border-black/15 bg-[#f8f5ed] p-4 shadow-2xl dark:border-white/15 dark:bg-[#1a1916] dark:text-[#f3f0e8]">
          <div className="mb-4 flex items-center justify-between"><div><p className="text-[8px] font-bold uppercase tracking-[0.15em] text-[#ef5a35]">Writing tools</p><h2 className="font-serif text-2xl">Find & replace</h2></div><button className="text-xl" onClick={() => setFindOpen(false)} type="button">×</button></div>
          <div className="grid gap-2"><input aria-label="Find text" className="border border-black/15 bg-white/70 px-3 py-2 text-xs outline-none focus:border-[#ef5a35] dark:bg-white/5" onChange={(event) => setFindQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && searchEditableCopy(true)} placeholder="Find in this issue" value={findQuery} /><input aria-label="Replace with" className="border border-black/15 bg-white/70 px-3 py-2 text-xs outline-none focus:border-[#ef5a35] dark:bg-white/5" onChange={(event) => setReplaceQuery(event.target.value)} placeholder="Replace with" value={replaceQuery} /></div>
          <div className="mt-3 flex flex-wrap items-center gap-2"><button className="studio-action" onClick={() => searchEditableCopy()} type="button">Find</button><button className="studio-action" disabled={!findMatches.length} onClick={() => searchEditableCopy(true)} type="button">Next {findMatches.length ? `${findIndex + 1}/${findMatches.length}` : ""}</button><button className="studio-action" disabled={!findMatches.length} onClick={replaceCurrentMatch} type="button">Replace</button><button className="studio-action" disabled={!findMatches.length} onClick={replaceAllMatches} type="button">Replace all</button></div>
          <p className="mt-3 text-[9px] leading-relaxed text-black/45 dark:text-white/45">Searches editable issue copy. Replace all keeps the surrounding inline formatting.</p>
        </section>
      )}

      {suggestionsOpen && (
        <div className="editor-only fixed inset-0 z-50 flex justify-end bg-black/35" onMouseDown={() => setSuggestionsOpen(false)}>
          <aside className="h-full w-full max-w-md overflow-y-auto bg-[#f8f5ed] p-6 shadow-2xl dark:bg-[#1a1916] dark:text-[#f3f0e8]" onMouseDown={(event) => event.stopPropagation()}>
            <header className="mb-6 flex items-start justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#ef5a35]">Editorial review</p><h2 className="mt-2 font-serif text-4xl">Suggestions</h2><p className="mt-2 text-[10px] text-black/45 dark:text-white/45">Proposed copy stays separate until you accept it.</p></div><button className="text-2xl" onClick={() => setSuggestionsOpen(false)} type="button">×</button></header>
            {suggestions.length ? <div className="space-y-4">{suggestions.map((suggestion, index) => <article className="border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-white/5" key={suggestion.id}><div className="mb-3 flex items-center justify-between"><p className="text-[9px] font-bold uppercase tracking-[0.12em]">Suggestion {index + 1}</p><button className="text-[9px] text-black/40 hover:text-black dark:text-white/40" onClick={() => setSuggestions((current) => current.filter((item) => item.id !== suggestion.id))} type="button">Dismiss</button></div><p className="max-h-24 overflow-y-auto whitespace-pre-line border-l-2 border-black/15 pl-3 text-[10px] leading-relaxed text-black/45 dark:border-white/15 dark:text-white/45">{suggestion.original}</p><p className="mt-3 max-h-36 overflow-y-auto whitespace-pre-line border-l-2 border-[#ef5a35] pl-3 font-serif text-sm leading-relaxed">{suggestion.proposed}</p><div className="mt-4 flex gap-2"><button className="rounded-full bg-[#ef5a35] px-4 py-2 text-[8px] font-bold uppercase tracking-[0.1em] text-white" onClick={() => { if (!suggestion.isCurrent()) { toast.error("This text has changed since the suggestion was made. Create a fresh suggestion before applying it.", "Suggestion is out of date"); return; } suggestion.apply(suggestion.proposed); setSuggestions((current) => current.filter((item) => item.id !== suggestion.id)); }} type="button">Accept change</button><button className="rounded-full border border-black/15 px-4 py-2 text-[8px] font-bold uppercase tracking-[0.1em]" onClick={() => setSuggestions((current) => current.filter((item) => item.id !== suggestion.id))} type="button">Reject</button></div></article>)}</div> : <p className="border border-dashed border-black/20 py-16 text-center text-xs text-black/45">No pending suggestions. Select copy and ask for an AI rewrite, then choose “Save as suggestion.”</p>}
          </aside>
        </div>
      )}

      {selectionText && !aiOpen && (
        <button className="editor-only fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#171714] px-5 py-3 text-[9px] font-bold uppercase tracking-[0.12em] text-white shadow-2xl hover:bg-[#ef5a35]" onClick={rewriteCanvasSelection} type="button">
          <EditorIcon name="write" /> Rewrite selection
        </button>
      )}

      {aiOpen && (
        <div className="editor-only fixed inset-0 z-[60] grid place-items-center bg-black/45 p-4 backdrop-blur-sm" onMouseDown={() => !aiLoading && setAiOpen(false)}>
          <section className="w-full max-w-4xl overflow-hidden bg-[#f8f5ed] shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <header className="flex items-start justify-between border-b border-black/10 p-6 sm:p-8">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#ef5a35]">AI editorial assistant</p>
                <h2 className="mt-2 font-serif text-4xl">Rewrite with intention.</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-black/50">
                  <span className="font-semibold">{loadPreferences().provider === "openai" ? "OpenAI" : "Google Gemini"}</span>
                  <span>·</span>
                  <span className="font-mono">{loadPreferences().provider === "openai" ? loadPreferences().openaiModel : loadPreferences().geminiModel}</span>
                  <span>·</span>
                  <span className={`rounded-full px-2 py-0.5 font-bold ${checkAiQuota(loadPreferences().provider).remaining === 0 ? "bg-red-100 text-red-700" : "bg-[#dce9e1] text-[#315b4b]"}`}>
                    {checkAiQuota(loadPreferences().provider).remaining} of {checkAiQuota(loadPreferences().provider).limit} requests left
                  </span>
                  <Link className="underline hover:text-[#ef5a35]" target="_blank" to="/settings">Adjust quota</Link>
                </div>
              </div>
              <button className="text-2xl text-black/35 hover:text-black" disabled={aiLoading} onClick={() => setAiOpen(false)} type="button">×</button>
            </header>
            {aiLoading ? (
              <div className="grid min-h-[360px] place-items-center p-10 text-center">
                <div>
                  <div className="ai-orbit mx-auto"><span /><span /><span /></div>
                  <p className="ai-shimmer mt-8 font-serif text-3xl">Finding better words</p>
                  <p className="mt-3 text-[9px] uppercase tracking-[0.16em] text-black/35">Keeping your meaning, tone, and facts intact</p>
                </div>
              </div>
            ) : (
              <div className="p-6 sm:p-8">
                <label className="block"><span className="mb-2 block text-[9px] font-bold uppercase tracking-[0.13em] text-black/40">Optional direction</span><input className="w-full border border-black/15 bg-transparent px-4 py-3 text-xs outline-none focus:border-[#ef5a35]" onChange={(event) => setAiInstruction(event.target.value)} placeholder="For example: make this more concise and welcoming" value={aiInstruction} /></label>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <div className="border border-black/10 p-5"><p className="mb-4 text-[8px] font-bold uppercase tracking-[0.15em] text-black/35">Original</p><p className="max-h-64 overflow-y-auto whitespace-pre-line font-serif text-lg leading-relaxed text-black/65">{aiOriginal}</p></div>
                  <div className={`border p-5 ${aiResult ? "border-[#ef5a35]/40 bg-white" : "border-dashed border-black/15"}`}><p className="mb-4 text-[8px] font-bold uppercase tracking-[0.15em] text-[#ef5a35]">Rewrite</p>{aiResult ? <p className="max-h-64 overflow-y-auto whitespace-pre-line font-serif text-lg leading-relaxed">{aiResult}</p> : <p className="text-xs leading-relaxed text-black/35">Your revised copy will appear here for comparison. Nothing changes until you accept it.</p>}</div>
                </div>
                {aiError && <p className="mt-4 border border-red-200 bg-red-50 p-3 text-xs text-red-700">{aiError}</p>}
                <div className="mt-6 flex flex-wrap justify-end gap-2">
                  <button className="rounded-full border border-black/15 px-5 py-2.5 text-[9px] font-bold uppercase tracking-[0.1em]" onClick={() => setAiOpen(false)} type="button">Cancel</button>
                  <button className="rounded-full border border-black/15 px-5 py-2.5 text-[9px] font-bold uppercase tracking-[0.1em]" onClick={runAiRewrite} type="button">{aiResult ? "Try again" : "Generate rewrite"}</button>
                  {aiResult && <button className="rounded-full border border-[#ef5a35]/40 px-5 py-2.5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#a14b32]" onClick={createSuggestion} type="button">Save as suggestion</button>}
                  {aiResult && <button className="rounded-full bg-[#ef5a35] px-5 py-2.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white" onClick={() => { aiApplyRef.current(aiResult); setAiOpen(false); }} type="button">Apply now</button>}
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      <button
        aria-label="Add section"
        className="editor-only fixed bottom-5 right-5 z-30 grid h-12 w-12 place-items-center rounded-full bg-[#ef5a35] text-white shadow-xl sm:hidden"
        onClick={() => setLibraryOpen(true)}
        title="Add section"
        type="button"
      >
        <EditorIcon name="add" />
      </button>

      {libraryOpen && (
        <div className="editor-only fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs" onMouseDown={() => { setLibraryOpen(false); setArticleLibraryOpen(false); setVariantLibraryType(null); }}>
          <aside className="h-full w-full max-w-md overflow-y-auto bg-[#f8f5ed] p-6 shadow-2xl dark:border-l dark:border-white/10 dark:bg-[#1a1916] dark:text-[#f3f0e8]" onMouseDown={(event) => event.stopPropagation()}>
            <div className="mb-7 flex items-start justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">Page {activePage + 1}</p>
                {(articleLibraryOpen || variantLibraryType) && <button className="mb-2 mt-3 text-[9px] font-bold uppercase tracking-[0.12em] text-black/50 hover:text-[#a14b32] dark:text-white/55" onClick={() => { setArticleLibraryOpen(false); setVariantLibraryType(null); }} type="button">← All sections</button>}
                <h2 className="mt-2 font-serif text-4xl tracking-[-0.04em]">{articleLibraryOpen ? "Article layouts" : variantLibraryType ? `${SECTION_OPTIONS.find((option) => option.type === variantLibraryType)?.name ?? "Section"} layouts` : "Add a section"}</h2>
              </div>
              <button className="text-2xl text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white" onClick={() => { setLibraryOpen(false); setArticleLibraryOpen(false); }} type="button">×</button>
            </div>
            <p className="mb-6 text-xs leading-relaxed text-black/55 dark:text-[#f3f0e8]/60">
              {articleLibraryOpen
                ? "Choose a page-ready format. Add or change photographs from the image controls inside each article."
                : variantLibraryType
                ? "Choose a visual arrangement. You can change it any time from the section controls."
                : "Pick a ready-made block. Sections with an arrow open a layout chooser; plus adds the section right away."}
            </p>
            {articleLibraryOpen ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {ARTICLE_TEMPLATES.map((template) => (
                  <button
                    className="section-picker-card group overflow-hidden border border-black/15 bg-white/70 text-left transition hover:border-[#a14b32] hover:bg-white dark:border-white/15 dark:bg-[#242320] dark:hover:border-[#c9856c] dark:hover:bg-[#2e2d29]"
                    key={template.id}
                    onClick={() => addSection("article", template.id)}
                    type="button"
                  >
                    <span aria-hidden="true" className="block border-b border-black/10 bg-[#eee8dc] p-3 dark:border-white/10 dark:bg-[#302e29]">
                      <span className="flex h-24 gap-2 overflow-hidden border border-black/10 bg-[#f8f5ed] p-2 dark:border-white/10 dark:bg-[#1a1916]">
                        {template.id === "hero" && <span className="h-8 w-full shrink-0 bg-[#c9b69c] dark:bg-[#766654]" />}
                        {(template.id === "image-left" || template.id === "image-right") && <>
                          <span className={`w-2/5 bg-[#c9b69c] dark:bg-[#766654] ${template.id === "image-right" ? "order-2" : ""}`} />
                          <span className="flex flex-1 flex-col gap-2 py-1"><i className="h-1.5 w-2/3 bg-[#a14b32]/70"/><i className="h-2 w-full bg-black/60 dark:bg-white/60"/><i className="h-1 w-4/5 bg-black/20 dark:bg-white/25"/><i className="h-1 w-full bg-black/20 dark:bg-white/25"/><i className="h-1 w-3/4 bg-black/20 dark:bg-white/25"/></span>
                        </>}
                        {template.id === "photo-essay" && <span className="flex w-full gap-1"><i className="w-1/2 bg-[#c9b69c] dark:bg-[#766654]"/><i className="w-1/2 bg-[#b8aa97] dark:bg-[#675d50]"/></span>}
                        {(template.id === "classic" || template.id === "compact") && <span className="flex w-full gap-3"><i className="w-2/5 border-r border-black/10 dark:border-white/10"><b className="mt-2 block h-1.5 w-1/2 bg-[#a14b32]/70"/><b className="mt-2 block h-3 w-4/5 bg-black/60 dark:bg-white/60"/></i><i className="flex flex-1 flex-col justify-center gap-2"><b className="h-1 w-full bg-black/20 dark:bg-white/25"/><b className="h-1 w-full bg-black/20 dark:bg-white/25"/><b className="h-1 w-4/5 bg-black/20 dark:bg-white/25"/></i></span>}
                      </span>
                    </span>
                    <span className="block p-4">
                      <span className="block font-serif text-xl text-[#171714] dark:text-[#f3f0e8]">{template.name}</span>
                      <span className="mt-1 block min-h-8 text-[10px] leading-relaxed text-black/60 dark:text-[#f3f0e8]/65">{template.description}</span>
                      <span className="mt-3 flex items-center justify-between border-t border-black/10 pt-3 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8d4933] dark:border-white/10 dark:text-[#d59a82]">
                        <span>{template.imageCount === 0 ? "Text only" : `${template.imageCount} photo${template.imageCount > 1 ? "s" : ""}`}</span><span>{template.size}</span>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : variantLibraryType ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {SECTION_LAYOUTS[variantLibraryType]?.map((layout, index) => (
                  <button
                    className="section-picker-card group overflow-hidden border border-black/15 bg-white/70 text-left transition hover:border-[#a14b32] hover:bg-white dark:border-white/15 dark:bg-[#242320] dark:hover:border-[#c9856c] dark:hover:bg-[#2e2d29]"
                    key={layout.id}
                    onClick={() => addSection(variantLibraryType, undefined, layout.id)}
                    type="button"
                  >
                    <span aria-hidden="true" className="block border-b border-black/10 bg-[#eee8dc] p-3 dark:border-white/10 dark:bg-[#302e29]">
                      <span className="flex h-24 items-center justify-center gap-2 overflow-hidden border border-black/10 bg-[#f8f5ed] p-3 dark:border-white/10 dark:bg-[#1a1916]">
                        <span className="flex h-full w-full flex-col justify-center gap-2">
                          <i className="h-1.5 w-1/3 bg-[#a14b32]/70" />
                          <i className={`h-3 ${index === 1 ? "w-4/5" : "w-2/3"} bg-black/60 dark:bg-white/60`} />
                          <i className="h-1 w-full bg-black/20 dark:bg-white/25" />
                          <i className="h-1 w-4/5 bg-black/20 dark:bg-white/25" />
                          {index === 2 && <i className="h-3 w-1/2 self-end bg-[#c9b69c] dark:bg-[#766654]" />}
                        </span>
                        {index === 1 && <span className="grid h-full w-1/3 place-items-center border-l border-black/10 pl-2 dark:border-white/10"><i className="h-10 w-full bg-[#c9b69c] dark:bg-[#766654]" /></span>}
                      </span>
                    </span>
                    <span className="block p-4">
                      <span className="block font-serif text-xl text-[#171714] dark:text-[#f3f0e8]">{layout.label}</span>
                      <span className="mt-1 block min-h-8 text-[10px] leading-relaxed text-black/60 dark:text-[#f3f0e8]/65">{layout.id === "calendar" ? "Arrange dates in a compact, scannable grid." : layout.id === "timeline" ? "Give entries a clear chronological rhythm." : layout.id === "poster" ? "Let one vivid quotation command the page." : layout.id === "filmstrip" ? "Present images in a cinematic horizontal run." : `A considered ${layout.label.toLowerCase()} arrangement for your ${SECTION_OPTIONS.find((option) => option.type === variantLibraryType)?.name.toLowerCase()}.`}</span>
                      <span className="mt-3 block border-t border-black/10 pt-3 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#8d4933] dark:border-white/10 dark:text-[#d59a82]">Add this layout <span aria-hidden="true">→</span></span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid gap-2">
                {SECTION_OPTIONS.map((option) => (
                  <button
                    className="section-picker-card group flex items-center justify-between border border-black/15 bg-white/70 p-4 text-left transition hover:border-[#ef5a35] hover:bg-white dark:border-white/15 dark:bg-[#242320] dark:hover:border-[#ef5a35] dark:hover:bg-[#2e2d29]"
                    draggable
                    key={option.type}
                    onClick={() => option.type === "article" ? setArticleLibraryOpen(true) : SECTION_LAYOUTS[option.type] ? setVariantLibraryType(option.type) : addSection(option.type)}
                    onDragStart={(event) => { draggedSectionType.current = option.type; event.dataTransfer.effectAllowed = "copy"; event.dataTransfer.setData("text/plain", option.type); }}
                    onDragEnd={() => { draggedSectionType.current = null; }}
                    type="button"
                  >
                    <span>
                      <span className="block font-serif text-xl text-[#171714] transition-colors group-hover:text-[#ef5a35] dark:text-[#f3f0e8] dark:group-hover:text-[#ef5a35]">{option.name}</span>
                      <span className="mt-1 block text-[10px] text-black/60 dark:text-[#f3f0e8]/65">{option.type === "article" ? "Choose from six editorial layouts" : SECTION_LAYOUTS[option.type] ? `Choose from ${SECTION_LAYOUTS[option.type]?.length} visual layouts` : option.description}</span>
                    </span>
                    <span className="text-xl text-[#ef5a35] transition-transform group-hover:translate-x-1">{option.type === "article" || SECTION_LAYOUTS[option.type] ? "›" : "+"}</span>
                  </button>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}

      {pageMenuOpen && (
        <div className="editor-only fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-xs" onMouseDown={() => setPageMenuOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-black/10 bg-[#f8f5ed] p-6 shadow-2xl sm:p-8 dark:border-white/15 dark:bg-[#1a1916] dark:text-[#f3f0e8]" onMouseDown={(event) => event.stopPropagation()}>
            <div className="mb-7 flex items-start justify-between">
              <div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#ef5a35]">Document pages</p><h2 className="mt-2 font-serif text-4xl">Add a page</h2></div>
              <button className="text-2xl text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white" onClick={() => setPageMenuOpen(false)} type="button">×</button>
            </div>
            <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.15em] text-black/40 dark:text-white/40">Title page styles</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["title-editorial", "Editorial cover", "A bold masthead, issue headline, introduction, and hero photograph.", "01"],
                ["title-minimal", "Quiet minimal", "Generous white space, a restrained title, divider, and opening thought.", "Aa"],
                ["title-split", "Split statement", "Asymmetric headline and quotation columns followed by a photograph.", "½"],
              ].map(([id, name, description, mark]) => (
                <button
                  className="section-picker-card group border border-black/15 bg-white/70 p-5 text-left transition hover:border-[#ef5a35] hover:bg-white dark:border-white/15 dark:bg-[#242320] dark:hover:border-[#ef5a35] dark:hover:bg-[#2e2d29]"
                  key={id}
                  onClick={() => addPage(id as PagePresetKind)}
                  type="button"
                >
                  <span className="page-preset-mark mb-8 grid h-16 place-items-center border border-black/10 bg-[#efe8d8] font-serif text-3xl transition dark:border-white/10 dark:bg-[#282724]">{mark}</span>
                  <span className="page-preset-title font-serif text-2xl text-[#171714] transition-colors dark:text-[#f3f0e8]">{name}</span>
                  <span className="mt-2 block text-[10px] leading-relaxed text-black/60 dark:text-[#f3f0e8]/65">{description}</span>
                </button>
              ))}
            </div>
            <p className="mb-3 mt-8 text-[9px] font-bold uppercase tracking-[0.15em] text-black/40 dark:text-white/40">Contents page styles</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["contents-classic", "Classic index", "A traditional numbered contents list with a large editorial heading.", "1—6"],
                ["contents-grid", "Feature grid", "A modular feature directory paired with a compact weekly index.", "4×"],
                ["contents-numeric", "Numeric guide", "Issue statistics and a chronological reading route.", "123"],
              ].map(([id, name, description, mark]) => (
                <button
                  className="section-picker-card group border border-black/15 bg-white/70 p-5 text-left transition hover:border-[#ef5a35] hover:bg-white dark:border-white/15 dark:bg-[#242320] dark:hover:border-[#ef5a35] dark:hover:bg-[#2e2d29]"
                  key={id}
                  onClick={() => addPage(id as PagePresetKind)}
                  type="button"
                >
                  <span className="page-preset-mark mb-8 grid h-16 place-items-center border border-black/10 bg-[#efe8d8] font-serif text-2xl transition dark:border-white/10 dark:bg-[#282724]">{mark}</span>
                  <span className="page-preset-title font-serif text-2xl text-[#171714] transition-colors dark:text-[#f3f0e8]">{name}</span>
                  <span className="mt-2 block text-[10px] leading-relaxed text-black/60 dark:text-[#f3f0e8]/65">{description}</span>
                </button>
              ))}
            </div>
            <p className="mb-3 mt-8 text-[9px] font-bold uppercase tracking-[0.15em] text-black/40 dark:text-white/40">Utility pages</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[["blank", "Blank page", "An empty canvas ready for sections from the library."], ["final", "Final page", "Closing statement, quotation, and publication footer."]].map(([id, name, description]) => (
                <button
                  className="section-picker-card group border border-black/15 bg-white/70 p-5 text-left transition hover:border-[#ef5a35] hover:bg-white dark:border-white/15 dark:bg-[#242320] dark:hover:border-[#ef5a35] dark:hover:bg-[#2e2d29]"
                  key={id}
                  onClick={() => addPage(id as PagePresetKind)}
                  type="button"
                >
                  <span className="font-serif text-2xl text-[#171714] transition-colors group-hover:text-[#ef5a35] dark:text-[#f3f0e8] dark:group-hover:text-[#ef5a35]">{name}</span>
                  <span className="mt-2 block text-[10px] leading-relaxed text-black/60 dark:text-[#f3f0e8]/65">{description}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {designOpen && (
        <div className="editor-only fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs" onMouseDown={() => setDesignOpen(false)}>
          <aside className="h-full w-full max-w-sm overflow-y-auto bg-[#f8f5ed] p-6 shadow-2xl dark:border-l dark:border-white/10 dark:bg-[#1a1916] dark:text-[#f3f0e8]" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#ef5a35]">Document design</p><h2 className="mt-2 font-serif text-4xl">Style the issue</h2></div><button className="text-2xl text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white" onClick={() => setDesignOpen(false)} type="button">×</button></div>
            <button className="mt-7 flex w-full items-center justify-between border border-black/15 bg-white/55 p-4 text-left transition hover:border-[#a14b32] dark:border-white/15 dark:bg-white/5" onClick={() => setTemplateChooserOpen((open) => !open)} type="button">
              <span><span className="block text-[8px] font-bold uppercase tracking-[0.16em] text-[#a14b32]">Match Template</span><span className="mt-1 block font-serif text-xl">{activeDesignTemplate?.name ?? "Custom design"}</span><span className="mt-1 block text-[9px] text-black/45 dark:text-white/45">Apply a complete newsletter color and type system.</span></span>
              <span aria-hidden="true" className={`ml-3 text-xl text-[#a14b32] transition-transform ${templateChooserOpen ? "rotate-90" : ""}`}>›</span>
            </button>
            {templateChooserOpen && <div className="mt-2 grid gap-2">{DESIGN_TEMPLATES.map((template) => <button className={`flex items-center justify-between border p-3 text-left transition ${activeDesignTemplate?.id === template.id ? "border-[#a14b32] bg-[#f2ecdf] dark:bg-white/10" : "border-black/10 hover:border-black/25 dark:border-white/10"}`} key={template.id} onClick={() => applyDesignTemplate(template)} type="button"><span className="min-w-0 pr-3"><span className="block font-serif text-base">{template.name}</span><span className="mt-1 block text-[9px] leading-relaxed text-black/50 dark:text-white/50">{template.description}</span></span><span aria-hidden="true" className="flex shrink-0 overflow-hidden rounded-full border border-black/10 dark:border-white/15">{template.colors.map((color) => <i className="h-5 w-5" key={color} style={{ background: color }} />)}</span></button>)}</div>}
            <p className="mb-4 mt-9 text-[9px] font-bold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">Color palette</p>
            <div className="grid gap-2">
              {PALETTES.map((item) => <button className={`flex items-center gap-4 border p-3 text-left transition ${paletteId === item.id ? "border-black bg-white dark:border-white dark:bg-[#242421]" : "border-black/10 hover:bg-white/60 dark:border-white/10 dark:hover:bg-[#20201d]"}`} key={item.id} onClick={() => setPaletteId(item.id)} type="button"><span className="flex overflow-hidden rounded-full border border-black/10"><span className="h-7 w-7" style={{ background: item.accent }} /><span className="h-7 w-7" style={{ background: item.paper }} /><span className="h-7 w-7" style={{ background: item.ink }} /></span><span className="text-xs font-semibold">{item.name}</span></button>)}
            </div>
            <p className="mb-4 mt-9 text-[9px] font-bold uppercase tracking-[0.14em] text-black/40 dark:text-white/40">Typography</p>
            <div className="grid gap-2">
              {FONT_PAIRS.map((item) => <button className={`border p-4 text-left transition ${fontId === item.id ? "border-black bg-white dark:border-white dark:bg-[#242421]" : "border-black/10 hover:bg-white/60 dark:border-white/10 dark:hover:bg-[#20201d]"}`} key={item.id} onClick={() => setFontId(item.id)} type="button"><span className="block text-2xl" style={{ fontFamily: item.serif }}>Editorial Aa</span><span className="mt-2 block text-[9px] uppercase tracking-[0.12em] text-black/40 dark:text-white/40" style={{ fontFamily: item.sans }}>{item.name}</span></button>)}
            </div>
            <div className="mt-8 border-t border-black/10 pt-6 dark:border-white/10">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#ef5a35]">Publication style guide</p>
              <p className="mt-2 text-[10px] leading-relaxed text-black/45 dark:text-white/45">Save a shared starting style for future issues, then apply it to this edition.</p>
              <label className="mt-4 block"><span className="mb-1 block text-[8px] font-bold uppercase tracking-[0.1em] text-black/40">Headline style</span><select className="w-full border border-black/15 bg-transparent px-3 py-2 text-xs" onChange={(event) => setStyleGuide({ ...styleGuide, headlineStyle: event.target.value })} value={styleGuide.headlineStyle}><option>Editorial serif</option><option>Bold serif</option><option>Clean sans</option></select></label>
              <label className="mt-3 block"><span className="mb-1 block text-[8px] font-bold uppercase tracking-[0.1em] text-black/40">Byline convention</span><input className="w-full border border-black/15 bg-transparent px-3 py-2 text-xs" onChange={(event) => setStyleGuide({ ...styleGuide, bylineConvention: event.target.value })} value={styleGuide.bylineConvention} /></label>
              <div className="mt-3 flex gap-2"><button className="studio-action" onClick={() => setStyleGuide({ ...styleGuide, paletteId, fontId })} type="button">Use current design</button><button className="studio-action" onClick={savePublicationStyleGuide} type="button">Save & apply</button></div>
              <p className="mt-3 text-[8px] text-black/35">Current defaults: {PALETTES.find((item) => item.id === styleGuide.paletteId)?.name} · {FONT_PAIRS.find((item) => item.id === styleGuide.fontId)?.name}</p>
            </div>
          </aside>
        </div>
      )}

      {studioOpen && (
        <div className="editor-only fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs" onMouseDown={() => setStudioOpen(false)}>
          <aside className="flex h-full w-full max-w-xl flex-col bg-[#f8f5ed] shadow-2xl dark:border-l dark:border-white/10 dark:bg-[#1a1916] dark:text-[#f3f0e8]" onMouseDown={(event) => event.stopPropagation()}>
            <header className="flex items-start justify-between border-b border-black/10 p-6 dark:border-white/10">
              <div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#ef5a35]">Production studio</p><h2 className="mt-2 font-serif text-4xl">Finish with confidence.</h2></div>
              <button className="text-2xl text-black/35 hover:text-black dark:text-white/35 dark:hover:text-white" onClick={() => setStudioOpen(false)} type="button">×</button>
            </header>
            <nav className="flex overflow-x-auto border-b border-black/10 px-3 dark:border-white/10">
              {(["pages", "preflight", "history", "templates", "media", "export"] as StudioTab[]).map((tab) => (
                <button className={`border-b-2 px-3 py-4 text-[8px] font-bold uppercase tracking-[0.12em] ${studioTab === tab ? "border-[#ef5a35] text-[#ef5a35]" : "border-transparent text-black/40 dark:text-white/40"}`} key={tab} onClick={() => { setStudioTab(tab); if (tab === "preflight") runPreflight(); }} type="button">{tab}</button>
              ))}
            </nav>
            <div className="flex-1 overflow-y-auto p-6">
              {studioTab === "pages" && (
                <div>
                  <div className="mb-6 flex items-center justify-between border border-black/10 p-4"><div><p className="text-xs font-semibold">Smart page flow</p><p className="mt-1 text-[9px] text-black/40">Move overflowing sections forward after text edits.</p></div><button className={`h-6 w-11 rounded-full p-1 transition ${smartFlow ? "bg-[#ef5a35]" : "bg-black/15"}`} onClick={() => setSmartFlow(!smartFlow)} type="button"><span className={`block h-4 w-4 rounded-full bg-white transition-transform ${smartFlow ? "translate-x-5" : ""}`} /></button></div>
                  <div className="grid gap-3">
                    {pages.map((sections, index) => (
                      <div
                        className="flex items-center gap-3 border border-black/10 bg-white/70 p-3 transition hover:border-black/30 dark:border-white/10 dark:bg-[#20201d]"
                        draggable
                        key={index}
                        onDragStart={() => {
                          pageDragRef.current = index;
                        }}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => {
                          if (pageDragRef.current !== null && pageDragRef.current !== index) {
                            movePage(pageDragRef.current, index);
                            pageDragRef.current = null;
                          }
                        }}
                      >
                        <div
                          className="grid h-14 w-11 shrink-0 cursor-grab place-items-center rounded border border-black/15 bg-white font-serif text-sm font-bold shadow-sm dark:border-white/15 dark:bg-[#171714]"
                          title="Drag to reorder"
                        >
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold">Page {index + 1}</p>
                          <p className="mt-0.5 text-[9px] text-black/45 dark:text-[#f3f0e8]/50">
                            {sections.length} block{sections.length === 1 ? "" : "s"} · Drag to reorder
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            className="rounded p-1 text-xs text-black/40 hover:bg-black/10 hover:text-black disabled:opacity-20 dark:text-[#f3f0e8]/50 dark:hover:bg-white/10 dark:hover:text-white"
                            disabled={index === 0}
                            onClick={() => movePage(index, index - 1)}
                            title="Move page up"
                            type="button"
                          >
                            ↑
                          </button>
                          <button
                            className="rounded p-1 text-xs text-black/40 hover:bg-black/10 hover:text-black disabled:opacity-20 dark:text-[#f3f0e8]/50 dark:hover:bg-white/10 dark:hover:text-white"
                            disabled={index === pages.length - 1}
                            onClick={() => movePage(index, index + 1)}
                            title="Move page down"
                            type="button"
                          >
                            ↓
                          </button>
                          <button
                            className="rounded-full border border-[#ef5a35]/30 bg-[#ef5a35]/10 px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wider text-[#ef5a35] hover:bg-[#ef5a35] hover:text-white transition"
                            onClick={() => duplicatePage(index)}
                            title="Duplicate this entire page"
                            type="button"
                          >
                            ＋ Duplicate
                          </button>
                          {pages.length > 1 && (
                            <button
                              className="rounded p-1 text-xs text-black/35 hover:bg-red-600 hover:text-white transition dark:text-[#f3f0e8]/40"
                              onClick={() => removePage(index)}
                              title="Delete page"
                              type="button"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2"><button className="studio-action" onClick={() => setPageMenuOpen(true)} type="button">Add page</button><button className="studio-action" onClick={balanceOverflow} type="button">Rebalance now</button><button className="studio-action" onClick={syncWritingFromCanvas} type="button">Sync to Writing Mode</button></div>
                </div>
              )}
              {studioTab === "preflight" && (
                <div>
                  <div className="space-y-2">{preflight.map((item) => <div className="flex gap-3 border border-black/10 p-4" key={item.label}><span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] ${item.tone === "pass" ? "bg-[#dce9e1] text-[#315b4b]" : "bg-[#eee2c7] text-[#745c22]"}`}>{item.tone === "pass" ? "✓" : "!"}</span><div><p className="text-xs font-semibold">{item.label}</p><p className="mt-1 text-[9px] text-black/45">{item.detail}</p></div></div>)}</div>
                  <div className="mt-6 border-t border-black/10 pt-6"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold">AI editorial review</p><p className="mt-1 text-[9px] text-black/40">Claims, dates, privacy, attribution, tone, and clarity.</p></div><button className="studio-action" disabled={aiReviewing} onClick={runAiReview} type="button">{aiReviewing ? "Reviewing…" : "Run review"}</button></div>{aiReview && <p className="mt-5 whitespace-pre-line border border-black/10 bg-white p-4 text-xs leading-relaxed">{aiReview}</p>}</div>
                </div>
              )}
              {studioTab === "history" && (
                <div>
                  <button className="studio-action mb-5" onClick={createNamedCheckpoint} type="button">Save named version</button>
                  <div className="space-y-2">{checkpoints.length ? checkpoints.map((item) => <div className="border border-black/10 p-4" key={item.id}><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold">{item.label}</p><p className="mt-1 text-[9px] text-black/40">{new Date(item.at).toLocaleString()} · {item.pages.length} pages</p></div><div className="flex gap-3"><button className="text-[8px] font-bold uppercase tracking-[0.1em] text-black/55 hover:text-[#ef5a35]" onClick={() => compareCheckpoint(item)} type="button">Compare</button><button className="text-[8px] font-bold uppercase tracking-[0.1em] text-[#ef5a35]" onClick={() => restoreCheckpoint(item)} type="button">Restore</button></div></div>
                    {compareCheckpointId === item.id && <div className="mt-4 border-t border-black/10 pt-4"><div className="mb-2 flex items-center justify-between"><p className="text-[8px] font-bold uppercase tracking-[0.12em] text-[#ef5a35]">Snapshot compared with current issue</p><button className="text-[9px] text-black/40" onClick={() => setCompareCheckpointId(null)} type="button">Close</button></div><p className="mb-3 text-[9px] leading-relaxed text-black/50">Structure: {item.pages.length} pages at snapshot, {pages.length} now · Palette: {PALETTES.find((entry) => entry.id === item.paletteId)?.name ?? item.paletteId} → {palette.name} · Type: {FONT_PAIRS.find((entry) => entry.id === item.fontId)?.name ?? item.fontId} → {fontPair.name}</p>{getCheckpointDiffs(item).length ? getCheckpointDiffs(item).map((diff) => <div className="mb-3 grid gap-2 sm:grid-cols-2" key={diff.index}><p className="whitespace-pre-line bg-red-50 p-2 text-[9px] leading-relaxed text-red-900">− {diff.before || "(empty)"}</p><p className="whitespace-pre-line bg-green-50 p-2 text-[9px] leading-relaxed text-green-900">+ {diff.after || "(empty)"}</p></div>) : <p className="text-[9px] text-black/45">No copy changes found in this snapshot.</p>}</div>}
                  </div>) : <p className="py-12 text-center text-xs text-black/40">Snapshots appear after edits or manual saves.</p>}</div>
                </div>
              )}
              {studioTab === "templates" && (
                <div><p className="text-sm leading-relaxed text-black/55">Turn this issue—or only the selected page—into a reusable team template. Content and layout remain editable in every new issue.</p><div className="mt-6 grid gap-3 sm:grid-cols-2"><button className="border border-black/15 p-6 text-left hover:border-[#ef5a35]" onClick={() => saveAsTemplate("issue")} type="button"><span className="font-serif text-2xl">Save full issue</span><span className="mt-2 block text-[10px] text-black/40">Keep the complete page sequence.</span></button><button className="border border-black/15 p-6 text-left hover:border-[#ef5a35]" onClick={() => saveAsTemplate("page")} type="button"><span className="font-serif text-2xl">Save current page</span><span className="mt-2 block text-[10px] text-black/40">Use this page as a starting format.</span></button></div></div>
              )}
              {studioTab === "media" && (
                <div><div className="mb-5"><p className="text-xs font-semibold">Issue media</p><p className="mt-1 text-[9px] text-black/40">Uploaded images are stored in this issue’s cloud record. Captions and credits remain editable on canvas.</p></div>{mediaEntries.length ? <div className="grid grid-cols-2 gap-3">{mediaEntries.map(([key, value]) => <figure className="border border-black/10 bg-white p-2" key={key}><img alt="Uploaded issue media" className="aspect-video w-full object-cover" src={value} /><figcaption className="mt-2 flex items-center justify-between gap-2"><span className="truncate text-[8px] text-black/35">{key.split("-").slice(-2).join("-")}</span><button className="text-[8px] font-bold uppercase text-[#ef5a35] hover:text-[#d44826] transition" onClick={async () => { const ok = await dialog.confirm({ title: "Remove Media", message: "Are you sure you want to remove this stored image from issue media?", confirmText: "Remove Image", danger: true }); if (ok) { localStorage.removeItem(key); localStorage.removeItem(`${key}-meta`); window.dispatchEvent(new CustomEvent("iow-photo-update", { detail: { storageKey: key, value: "", broadcast: false } })); setMediaRevision((revision) => revision + 1); scheduleIssueSaveRef.current(); } }} type="button">Remove</button></figcaption></figure>)}</div> : <p className="border border-dashed border-black/15 py-14 text-center text-xs text-black/40">No uploaded media yet.</p>}</div>
              )}
              {studioTab === "export" && (
                <div className="grid gap-3">
                  <button className="flex items-center justify-between border border-black/15 p-5 text-left hover:border-[#ef5a35]" onClick={downloadPdf} type="button">
                    <span><span className="font-serif text-2xl">Visual PDF</span><span className="mt-1 block text-[9px] text-black/40">Exact page dimensions and high-resolution rendering.</span></span>
                    <span>→</span>
                  </button>
                  <button className="flex items-center justify-between border border-[#ef5a35] bg-[#ef5a35]/5 p-5 text-left hover:bg-[#ef5a35]/10" onClick={() => setEmailModalOpen(true)} type="button">
                    <span><span className="font-serif text-2xl text-[#ef5a35]">Email Studio &amp; HTML</span><span className="mt-1 block text-[9px] text-black/50">Responsive table HTML, desktop/mobile preview, and test inbox delivery.</span></span>
                    <span className="text-[#ef5a35] font-bold">→</span>
                  </button>
                  <button className="flex items-center justify-between border border-black/15 p-5 text-left hover:border-[#ef5a35]" onClick={exportJson} type="button">
                    <span><span className="font-serif text-2xl">Publication JSON</span><span className="mt-1 block text-[9px] text-black/40">Structured issue package for external publishing systems.</span></span>
                    <span>→</span>
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      <div className={`editor-workspace-layout flex items-start gap-0 ${pageOverviewOpen ? "overview-visible" : ""}`}>
      <aside className={`page-overview editor-only sticky top-20 max-h-[calc(100vh-6.5rem)] w-56 shrink-0 flex-col gap-2 overflow-y-auto border-y border-r border-black/10 bg-[#faf9f6]/95 p-3 backdrop-blur-md dark:border-white/10 dark:bg-[#1e1d1a]/95 dark:text-[#f2efe8] ${pageOverviewOpen ? "flex" : "hidden"}`} aria-label="Page overview">
        <div className="flex items-center justify-between px-1 pb-1">
          <div><p className="text-xs font-semibold text-black dark:text-white">Pages</p><p className="mt-0.5 text-[10px] text-black/50 dark:text-white/50">{pages.length} in this issue</p></div>
          <button aria-label="Close page overview" className="overview-close grid h-7 w-7 place-items-center rounded-lg text-black/50 hover:bg-black/5 hover:text-black dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white transition" onClick={() => setPageOverviewOpen(false)} type="button">×</button>
        </div>
        {pages.map((sections, index) => (
          <div
            className={`page-overview-card group relative cursor-pointer rounded-xl border p-2 text-left transition ${
              activePage === index
                ? "is-active border-[#ef5a35] dark:border-[#ff7859]"
                : "border-black/10 hover:border-black/25 dark:border-white/10 dark:hover:border-white/25"
            }`}
            draggable
            key={index}
            onDragOver={(event) => event.preventDefault()}
            onDragStart={() => {
              pageDragRef.current = index;
            }}
            onDrop={() => {
              if (pageDragRef.current !== null && pageDragRef.current !== index) {
                movePage(pageDragRef.current, index);
                pageDragRef.current = null;
              }
            }}
          >
            <a className="block" href={`#page-${index + 1}`} onClick={() => setActivePage(index)}>
              <div className="page-thumbnail" aria-hidden="true">
                <div className="page-thumbnail-header" />
                <div className="page-thumbnail-grid">
                  {sections.slice(0, 9).map((section) => <span key={section.id} style={{ gridColumn: `span ${section.width}` }} />)}
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between px-1">
                <span className="text-[11px] font-semibold">Page {index + 1}</span>
                <span className="text-[9px] opacity-60">{sections.length} blocks</span>
              </div>
            </a>

            <div className="page-overview-actions absolute right-2 top-2 hidden items-center gap-1 group-hover:flex group-focus-within:flex">
              <button
                aria-label={`Duplicate page ${index + 1}`}
                className="overview-duplicate grid h-6 w-6 place-items-center rounded-full text-[11px] font-semibold shadow-sm transition hover:scale-105"
                onClick={(e) => {
                  e.stopPropagation();
                  duplicatePage(index);
                }}
                title="Duplicate this page"
                type="button"
              >
                ＋
              </button>
              {pages.length > 1 && (
                <button
                  aria-label={`Delete page ${index + 1}`}
                  className="overview-delete grid h-6 w-6 place-items-center rounded-full text-[12px] font-semibold shadow-sm transition hover:scale-105"
                  onClick={(e) => {
                    e.stopPropagation();
                    void removePage(index);
                  }}
                  title="Delete this page"
                  type="button"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        ))}
        <button
          className="overview-add-page grid h-9 place-items-center rounded-lg border border-dashed"
          onClick={() => setPageMenuOpen(true)}
          title="Add page"
          type="button"
        >
          <EditorIcon name="add" />
        </button>
      </aside>

      <main className={`editor-canvas min-w-0 flex-1 mx-auto px-3 py-7 sm:px-6 md:py-12 ${sourceMode ? "max-w-[1680px]" : "max-w-[1040px]"}`}>
        <div className="canvas-zoom-control editor-only fixed bottom-4 right-4 z-30 flex items-center gap-1 rounded-xl border border-black/10 bg-[#faf9f6]/95 px-1.5 py-1 shadow-md backdrop-blur-md dark:border-white/15 dark:bg-[#1e1d1a]/95 dark:text-[#f2efe8]" aria-label="Canvas zoom">
          <button
            aria-pressed={pageOverviewOpen}
            className={`editor-overview-toggle inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition ${
              pageOverviewOpen
                ? "is-active bg-[#ef5a35]/15 text-[#ef5a35] dark:bg-[#ef5a35]/25 dark:text-[#ff7859]"
                : "text-black/75 hover:bg-black/5 hover:text-black dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white"
            }`}
            onClick={() => setPageOverviewOpen(!pageOverviewOpen)}
            title={pageOverviewOpen ? "Hide page overview" : "Show page overview"}
            type="button"
          >
            <EditorIcon name="pages" /><span className="font-semibold">Pages</span>
          </button>
          <span className="zoom-divider h-4 w-px bg-black/10 dark:bg-white/15" aria-hidden="true" />
          <button aria-label="Zoom out" className="zoom-button text-black/70 hover:text-black dark:text-white/80 dark:hover:text-white" disabled={canvasZoom <= 60} onClick={() => setCanvasZoom((value) => Math.max(60, value - 10))} type="button">−</button>
          <button aria-label="Reset zoom" className="zoom-value font-mono text-black/80 hover:text-black dark:text-white/90 dark:hover:text-white" onClick={() => setCanvasZoom(100)} title="Reset zoom to 100%" type="button">{canvasZoom}%</button>
          <button aria-label="Zoom in" className="zoom-button text-black/70 hover:text-black dark:text-white/80 dark:hover:text-white" disabled={canvasZoom >= 130} onClick={() => setCanvasZoom((value) => Math.min(130, value + 10))} type="button">+</button>
        </div>
        <div className={sourceMode ? "grid items-start gap-6 lg:grid-cols-[420px_minmax(0,1fr)]" : ""}>
          {sourceMode && (
            <aside className="editor-only sticky top-32 overflow-hidden border border-black/15 bg-[#171714] text-white">
              <div className="border-b border-white/10 p-5"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#ef5a35]">Smart writing mode</p><h2 className="mt-2 font-serif text-3xl">Write. We’ll design.</h2><p className="mt-3 text-[10px] leading-relaxed text-white/45">Start blocks with slash commands. Content is balanced across pages as you type.</p></div>
              <div className="relative">
                <textarea
                  className="h-[55vh] w-full resize-none bg-transparent p-5 font-mono text-xs leading-relaxed text-white/80 outline-none"
                  onChange={(event) => handleSourceChange(event.target.value, event.target.selectionStart)}
                  onKeyDown={handleSlashKey}
                  ref={sourceRef}
                  spellCheck
                  value={sourceText}
                />
                {slashQuery !== null && (
                  <div className="absolute left-4 right-4 top-4 z-30 max-h-72 overflow-y-auto border border-white/15 bg-[#242421] p-1 shadow-2xl">
                    <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                      <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-white/40">Insert a section</span>
                      <span className="text-[8px] text-white/25">↑↓ select · Enter insert</span>
                    </div>
                    {filteredSlashCommands.length ? filteredSlashCommands.map((item, index) => (
                      <button
                        className={`flex w-full items-center justify-between gap-4 px-3 py-3 text-left ${index === slashIndex ? "bg-white/10" : "hover:bg-white/5"}`}
                        key={item.command}
                        onMouseDown={(event) => {
                          event.preventDefault();
                          chooseSlashCommand(item.command);
                        }}
                        type="button"
                      >
                        <span><span className="block text-xs font-semibold text-white">/{item.command}</span><span className="mt-1 block text-[9px] text-white/35">{item.description}</span></span>
                        <span className="text-[9px] text-[#ef5a35]">{item.label}</span>
                      </button>
                    )) : <p className="px-3 py-5 text-center text-[10px] text-white/35">No matching section</p>}
                  </div>
                )}
              </div>
              <div className="border-t border-white/10 p-5"><button className="mb-3 flex items-center gap-2 rounded-full bg-[#ef5a35] px-4 py-2 text-[8px] font-bold uppercase tracking-[0.12em] text-white" onClick={rewriteSourceSelection} type="button"><EditorIcon name="write" /> Rewrite selection</button><p className="text-[9px] leading-loose text-white/40"><span className="text-white/70">Commands:</span> /Title · /Heading · /Article · /Poetry · /Quote · /Events · /Photo · /Notice · /Page · /Final</p></div>
            </aside>
          )}
          <div
            className="relative"
            id="pdf-document"
            style={{ zoom: exporting ? "1" : `${canvasZoom}%` }}
            onBlurCapture={() => {
              editSessionRef.current = false;
              saveContent();
            }}
            onFocusCapture={(event) => {
              if (!editSessionRef.current && (event.target as HTMLElement).classList.contains("editable")) {
                editSessionRef.current = true;
                captureCheckpoint("Before text edit");
              }
            }}
            onInput={scheduleContentSave}
            onMouseLeave={() => broadcastCursor(-100, -100)}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={captureCanvasSelection}
          >
          <MultiplayerCursors cursors={cursors} />
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
              className="page relative transition-shadow"
              id={`page-${pageIndex + 1}`}
              key={pageIndex}
              onClick={() => setActivePage(pageIndex)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (pageDragRef.current !== null && pageDragRef.current !== pageIndex) {
                  movePage(pageDragRef.current, pageIndex);
                  pageDragRef.current = null;
                }
              }}
            >
              <PageHeader
                masthead={pages[0]?.find((section) => section.id === "paper-masthead")?.content}
                newspaper={pages[0]?.[0]?.id === "paper-masthead"}
                onUpdateMasthead={(patch) => {
                  setPages((current) => current.map((sections, index) => index === 0
                    ? sections.map((section) => section.id === "paper-masthead"
                      ? { ...section, content: { ...section.content, ...patch } }
                      : section)
                    : sections));
                }}
                page={pageIndex + 1}
                total={pages.length}
              />

              {/* Floating Page Action Bar in Editor Mode */}
              <div
                className="page-controls editor-only absolute right-6 top-2.5 z-20 flex items-center gap-1 rounded-xl border border-black/10 bg-[#f8f5ed]/95 p-1 shadow-sm backdrop-blur-sm sm:right-10 md:right-14 dark:border-white/10 dark:bg-[#20201d]/95"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Drag Handle to reorder whole page */}
                <div
                  className="page-control-button grid h-7 w-7 cursor-grab place-items-center rounded-lg text-black/45 hover:bg-black/5 hover:text-black dark:text-[#f3f0e8]/55 dark:hover:bg-white/10 dark:hover:text-white"
                  draggable
                  onDragStart={() => {
                    pageDragRef.current = pageIndex;
                  }}
                  title="Drag whole page to reorder"
                >
                  <span className="select-none text-xs">⠿</span>
                </div>

                {/* Move Up */}
                <button
                  className="page-control-button grid h-7 w-7 place-items-center rounded-lg text-xs font-semibold text-black/55 hover:bg-black/5 hover:text-black disabled:pointer-events-none disabled:opacity-25 dark:text-[#f3f0e8]/70 dark:hover:bg-white/10 dark:hover:text-white"
                  disabled={pageIndex === 0}
                  onClick={() => movePage(pageIndex, pageIndex - 1)}
                  title="Move page up (earlier in issue)"
                  type="button"
                >
                  ↑
                </button>

                {/* Move Down */}
                <button
                  className="page-control-button grid h-7 w-7 place-items-center rounded-lg text-xs font-semibold text-black/55 hover:bg-black/5 hover:text-black disabled:pointer-events-none disabled:opacity-25 dark:text-[#f3f0e8]/70 dark:hover:bg-white/10 dark:hover:text-white"
                  disabled={pageIndex === pages.length - 1}
                  onClick={() => movePage(pageIndex, pageIndex + 1)}
                  title="Move page down (later in issue)"
                  type="button"
                >
                  ↓
                </button>

                <div className="mx-0.5 h-3.5 w-px bg-black/15 dark:bg-white/15" />

                {/* Duplicate Page Button */}
                <button
                  className="page-control-duplicate inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[9px] font-semibold text-[#ef5a35] transition"
                  onClick={() => duplicatePage(pageIndex)}
                  title="Duplicate entire page with all sections"
                  type="button"
                >
                  <span>＋ Duplicate</span>
                </button>

                {/* Remove Page Button */}
                {pages.length > 1 && (
                  <button
                    className="page-control-delete grid h-7 w-7 place-items-center rounded-lg text-xs text-black/40 transition dark:text-[#f3f0e8]/45"
                    onClick={() => removePage(pageIndex)}
                    title="Remove page"
                    type="button"
                  >
                    ×
                  </button>
                )}
              </div>
              <div className={`page-grid ${freeformMode ? "page-grid-freeform" : ""}`} style={freeformMode ? { minHeight: Math.max(1100, fallbackY + 24) } : undefined} onDragOver={(event) => { if (draggedSectionType.current) event.preventDefault(); }} onDrop={(event) => { if (draggedSectionType.current) { event.preventDefault(); dropBlock(pageIndex, ""); } }}>
                {sections.map((section, sectionIndex) => (
                  <BuilderBlock
                    bylineConvention={styleGuide.bylineConvention}
                    isCoverPhoto={section.id === "campus-photo"}
                    issueId={issueId}
                    key={section.id}
                    freeform={freeformMode}
                    freeformRect={freeformRects[sectionIndex]}
                    onUpdateFreeform={(targetPage, id, value) => {
                      rememberLayout();
                      setPages((current) => current.map((items, index) => index === targetPage ? items.map((item) => item.id === id ? { ...item, freeform: value } : item) : items) as Pages);
                    }}
                    onAi={rewriteSection}
                    onAction={blockAction}
                    onConfigureNoticeQr={(id) => setNoticeQrModalSectionId(id)}
                    onEditCrossword={(id) => setCrosswordModalSectionId(id)}
                    onSetLayoutVariant={(id, layoutVariant) => {
                      setPages((current) => current.map((items, index) => index === pageIndex
                        ? items.map((item) => item.id === id
                          ? { ...item, content: { ...item.content, layoutVariant } }
                          : item)
                        : items));
                    }}
                    onDragStart={(page, id) => {
                      dragged.current = { page, id };
                    }}
                    onDrop={dropBlock}
                    pageIndex={pageIndex}
                    section={section}
                  />
                ))}
              </div>
              {!sections.length && (
                <div className="editor-only mx-6 grid min-h-[760px] place-items-center border border-dashed border-black/20 sm:mx-10 md:mx-14">
                  <div className="text-center"><p className="font-serif text-3xl">This page is blank</p><button className="mt-5 rounded-full bg-[#171714] px-5 py-2.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white" onClick={() => { setActivePage(pageIndex); setLibraryOpen(true); }} type="button">Add first section</button></div>
                </div>
              )}

              {/* QoL: Print Safe-Zone Overflow Warning */}
              {pageOverflowHeights[pageIndex] && (
                <div className="editor-only mx-6 my-3 flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-900 sm:mx-10 md:mx-14 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
                  <div className="flex items-center gap-2 text-xs">
                    <EditorIcon name="alert" />
                    <span className="font-semibold">Print Safe-Zone:</span>
                    <span className="text-[11px] opacity-90">
                      Page {pageIndex + 1} content height ({pageOverflowHeights[pageIndex]}px) exceeds target boundary (~1350px).
                    </span>
                  </div>
                  <button
                    className="shrink-0 rounded-full bg-amber-600 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-amber-700"
                    onClick={balanceOverflow}
                    type="button"
                  >
                    Balance Page Flow
                  </button>
                </div>
              )}

              <button className="add-page-section editor-only" onClick={() => { setActivePage(pageIndex); setLibraryOpen(true); }} type="button">
                + Add section to page {pageIndex + 1}
              </button>
            </article>
          ); })}
          <button className="add-page-section editor-only bg-[#f8f5ed]" onClick={() => setPageMenuOpen(true)} type="button">+ Add another page</button>
          </div>
        </div>
      </main>
      </div>

      {/* QoL: Floating Word Count & Reading Time Meter */}
      <div className="editor-only fixed bottom-4 left-4 z-30 hidden sm:flex items-center gap-2 rounded-full border border-black/10 bg-[#f8f5ed]/95 px-3.5 py-1.5 text-[9px] font-medium tracking-wide text-black/55 dark:border-white/10 dark:bg-[#1a1916]/95 dark:text-white/65">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ef5a35]" />
          <span>Page {activePage + 1}: {wordStats.pageWords} words</span>
        </span>
        <span className="text-black/25 dark:text-white/25">·</span>
        <span>Issue: {wordStats.totalWords} words (~{Math.max(1, Math.ceil(wordStats.totalWords / 200))} min read)</span>
      </div>

      {/* Noticeboard Submission QR Modal */}
      {crosswordModalSectionId && (
        <CrosswordEditorModal
          initialData={pages.flat().find((section) => section.id === crosswordModalSectionId)?.content?.crossword || DEFAULT_CAMPUS_MINI_CROSSWORD}
          isOpen
          onClose={() => setCrosswordModalSectionId(null)}
          onSave={(crossword) => {
            rememberLayout();
            const nextPages = pages.map((sections) => sections.map((section) => section.id === crosswordModalSectionId
              ? { ...section, content: { ...section.content, crossword } }
              : section));
            setPages(nextPages);
            localStorage.setItem(`iow-layout-${issueId}`, JSON.stringify(nextPages));
            setCrosswordModalSectionId(null);
          }}
        />
      )}

      {/* Noticeboard Submission QR Modal */}
      {noticeQrModalSectionId && (
        <NoticeboardQrModal
          initialConfig={{
            qrUrl: pages
              .flat()
              .find((s) => s.id === noticeQrModalSectionId)?.content?.qrUrl,
            qrEnabled: pages
              .flat()
              .find((s) => s.id === noticeQrModalSectionId)?.content?.qrEnabled,
            qrLabel: pages
              .flat()
              .find((s) => s.id === noticeQrModalSectionId)?.content?.qrLabel,
            qrCampaign: pages
              .flat()
              .find((s) => s.id === noticeQrModalSectionId)?.content?.qrCampaign,
            useTrackingParams: pages
              .flat()
              .find((s) => s.id === noticeQrModalSectionId)?.content?.useTrackingParams,
          }}
          issueTitle={issue?.title ?? "Campus Issue"}
          onClose={() => setNoticeQrModalSectionId(null)}
          onSave={handleSaveNoticeQr}
          sectionId={noticeQrModalSectionId}
        />
      )}

      {/* Editorial Comments Drawer */}
      <CommentsPanel
        comments={comments}
        isOpen={commentsOpen}
        onAddComment={addComment}
        onClose={() => setCommentsOpen(false)}
        onDeleteComment={deleteComment}
        onToggleResolve={toggleResolveComment}
      />

      {/* Newsroom Live Chat Drawer */}
      <NewsroomChat
        currentUserId={myId}
        isOpen={chatOpen}
        messages={chatMessages}
        onClose={() => setChatOpen(false)}
        onSendMessage={postChatMessage}
      />

      {/* QoL Modals */}
      <KeyboardShortcutsModal
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      <ShareModal
        isOpen={shareOpen}
        issueId={issueId}
        issueTitle={issue?.title ?? "In Other Words"}
        onClose={() => setShareOpen(false)}
      />

      <PhotoPickerModal
        isOpen={photoPickerOpen}
        onClose={() => {
          setPhotoPickerOpen(false);
          setPhotoTargetKey(null);
        }}
        onSelect={handlePhotoPicked}
      />

      {/* Step 1: Floating Formatting Toolbar */}
      <FloatingFormatToolbar
        onAiRewrite={handleFloatingToolbarAiRewrite}
        paletteAccent={palette.accent}
      />

      {/* Step 2: Responsive Email Export & Test Sender Modal */}
      <EmailExportModal
        isOpen={emailModalOpen}
        issue={issue}
        onClose={() => setEmailModalOpen(false)}
        pages={pages}
        palette={palette}
        publicationName="In Other Words"
      />
    </div>
  );
}
