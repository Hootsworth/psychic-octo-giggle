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
import { loadWorkspace, updateIssue, type Issue } from "./store";
import { cloneTemplatePages, saveCustomTemplate } from "./templates";
import { rewriteWithAi } from "./ai";
import { checkAiQuota, loadPreferences } from "./settingsStore";
import BrandLogo from "./BrandLogo";
import { useAuth } from "./AuthContext";
import { useCollaboration } from "./collaboration/useCollaboration";
import MultiplayerCursors from "./collaboration/MultiplayerCursors";
import CollaboratorAvatars from "./collaboration/CollaboratorAvatars";
import CommentsPanel from "./collaboration/CommentsPanel";
import NewsroomChat from "./collaboration/NewsroomChat";
import type { DocChangePayload, EditorialComment, NewsroomMessage } from "./collaboration/types";
import CrosswordSection from "./games/CrosswordSection";
import CrosswordEditorModal from "./games/CrosswordEditorModal";
import SudokuSection from "./games/SudokuSection";
import WordSearchSection from "./games/WordSearchSection";
import type { CrosswordData, SudokuData, WordSearchData } from "./games/types";
import { DEFAULT_CAMPUS_MINI_CROSSWORD, DEFAULT_SUDOKU, DEFAULT_WORD_SEARCH } from "./games/presets";

const CAMPUS_IMAGE =
  "https://images.unsplash.com/photo-1576495199011-eb94736d05d6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=85&w=1600";

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
  | "wordsearch";

type Section = {
  id: string;
  type: SectionType;
  width: 4 | 6 | 8 | 12;
  height: "compact" | "regular" | "tall";
  content?: {
    eyebrow?: string;
    title?: string;
    byline?: string;
    body?: string;
    crossword?: CrosswordData;
    sudoku?: SudokuData;
    wordsearch?: WordSearchData;
  };
};

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

const SECTION_OPTIONS: { type: SectionType; name: string; description: string }[] = [
  { type: "heading", name: "Section heading", description: "Large editorial title" },
  { type: "article", name: "Article", description: "Headline and body copy" },
  { type: "photo", name: "Campus photo", description: "Uploadable image and caption" },
  { type: "poem", name: "Poetry", description: "Student poem with byline" },
  { type: "quote", name: "Pull quote", description: "Bold highlighted quotation" },
  { type: "events", name: "Events list", description: "Weekly dates and activities" },
  { type: "gossip", name: "Gossip corner", description: "Clubs and campus whispers" },
  { type: "gallery", name: "Photo pair", description: "Two uploadable images" },
  { type: "notice", name: "Noticeboard", description: "Submission or announcement" },
  { type: "divider", name: "Divider", description: "Labelled section break" },
  { type: "interview", name: "Interview", description: "Designed question and answer feature" },
  { type: "statistics", name: "By the numbers", description: "Large statistics and key figures" },
  { type: "timeline", name: "Timeline", description: "Chronological milestones or schedule" },
  { type: "recommendations", name: "Recommendations", description: "Curated books, films, links, or places" },
  { type: "audio", name: "Campus Audio", description: "Embedded playlist, podcast episode or campus radio track" },
  { type: "poll", name: "Student Poll", description: "Interactive community poll with live options" },
  { type: "crossword", name: "Crossword Puzzle", description: "Interactive campus crossword with visual grid & clues editor" },
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
];

const FONT_PAIRS = [
  { id: "newsreader", name: "Newsreader + DM Sans", serif: '"Newsreader", Georgia, serif', sans: '"DM Sans", sans-serif' },
  { id: "classic", name: "Georgia + Arial", serif: "Georgia, serif", sans: "Arial, sans-serif" },
  { id: "modern", name: "Arial + Arial", serif: "Arial, sans-serif", sans: "Arial, sans-serif" },
  { id: "traditional", name: "Times + Helvetica", serif: '"Times New Roman", serif', sans: "Helvetica, Arial, sans-serif" },
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
  const [meta, setMeta] = useState<{ position: string; alt: string }>(() => {
    try {
      return JSON.parse(localStorage.getItem(`${storageKey}-meta`) ?? '{"position":"center","alt":"Campus scene"}');
    } catch {
      return { position: "center", alt: "Campus scene" };
    }
  });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handlePhotoUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ storageKey: string; value?: string; meta?: { position: string; alt: string } }>).detail;
      if (detail?.storageKey === storageKey) {
        if (detail.value !== undefined) setImage(detail.value);
        if (detail.meta !== undefined) setMeta(detail.meta);
      }
    };
    window.addEventListener("iow-photo-update", handlePhotoUpdate);
    return () => window.removeEventListener("iow-photo-update", handlePhotoUpdate);
  }, [storageKey]);

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result);
      setImage(value);
      try {
        localStorage.setItem(storageKey, value);
        window.dispatchEvent(new CustomEvent("iow-photo-update", { detail: { storageKey, value, broadcast: true } }));
      } catch {
        window.alert("This image is too large for local storage. Try a smaller compressed image.");
      }
    };
    reader.readAsDataURL(file);
  };

  const updateMeta = (next: { position: string; alt: string }) => {
    setMeta(next);
    localStorage.setItem(`${storageKey}-meta`, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("iow-photo-update", { detail: { storageKey, meta: next, broadcast: true } }));
  };

  return (
    <div className="photo-field group relative h-full min-h-52 overflow-hidden bg-[#d7d3c8]">
      {image ? (
        <img alt={meta.alt} className="h-full w-full object-cover" src={image} style={{ objectPosition: meta.position }} />
      ) : (
        <div className="photo-placeholder flex h-full min-h-52 items-center justify-center">
          <span className="bg-[#f8f5ed] px-3 py-2 text-[9px] font-bold uppercase tracking-[0.18em]">
            Image placeholder
          </span>
        </div>
      )}
      <input accept="image/*" className="hidden" onChange={onFile} ref={inputRef} type="file" />
      <div className="editor-only absolute bottom-4 left-4 flex flex-wrap gap-1">
        <button className="rounded-full bg-[#f8f5ed] px-4 py-2 text-[9px] font-bold uppercase tracking-[0.14em] shadow-md hover:bg-[#ef5a35] hover:text-white" onClick={() => inputRef.current?.click()} type="button">{image ? "Replace" : label}</button>
        {image && <button className="rounded-full bg-[#f8f5ed] px-3 py-2 text-[9px] font-bold uppercase tracking-[0.12em] shadow-md hover:bg-[#ef5a35] hover:text-white" onClick={() => { const positions = ["center", "center top", "center bottom"]; updateMeta({ ...meta, position: positions[(positions.indexOf(meta.position) + 1) % positions.length] }); }} title="Cycle image focal point" type="button">Focus</button>}
        {image && <button className="rounded-full bg-[#f8f5ed] px-3 py-2 text-[9px] font-bold uppercase tracking-[0.12em] shadow-md hover:bg-[#ef5a35] hover:text-white" onClick={() => { const alt = window.prompt("Describe this image for screen readers", meta.alt)?.trim(); if (alt) updateMeta({ ...meta, alt }); }} type="button">Alt text</button>}
      </div>
    </div>
  );
}

function PageHeader({ page, total }: { page: number; total: number }) {
  return (
    <div className="mx-6 flex items-end justify-between border-b border-black pb-3 pt-7 sm:mx-10 md:mx-14">
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
  isCoverPhoto,
  mediaKey,
  onEditCrossword,
}: {
  section: Section;
  isCoverPhoto?: boolean;
  mediaKey: string;
  onEditCrossword?: () => void;
}) {
  const { type, content } = section;
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
    return (
      <div className="grid h-full bg-[#f8f5ed] md:grid-cols-[0.8fr_1.2fr]">
        <div className="bg-[#ef5a35] p-7 text-white sm:p-10">
          <Editable as="p" className="text-[9px] font-bold uppercase tracking-[0.18em]">{content?.eyebrow ?? "Feature"}</Editable>
          <Editable as="h2" className="mt-12 font-serif text-4xl leading-[0.95] tracking-[-0.04em]">
            {content?.title ?? "A new week, a blank page."}
          </Editable>
        </div>
        <div className="p-7 sm:p-10">
          <Editable as="p" className="drop-cap whitespace-pre-line font-serif text-lg leading-[1.7] text-black/80">
            {content?.body ?? "The campus feels different in September. New notebooks, old buildings, and the pleasant sense that anything might happen. This space belongs to the students filling it—with questions, stories, plans, and ideas."}
          </Editable>
          <Editable as="p" className="mt-5 text-[10px] font-bold uppercase tracking-[0.14em]">
            — The editorial team
          </Editable>
        </div>
      </div>
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
      <div className="flex h-full flex-col justify-between bg-[#ef5a35] p-8 text-white sm:p-10">
        <Editable as="p" className="text-[9px] font-bold uppercase tracking-[0.18em]">In their own words</Editable>
        <Editable as="h2" className="my-10 font-serif text-4xl italic leading-tight">
          {content?.body ?? "“The university is not just where we learn. It is what we make together.”"}
        </Editable>
        <Editable as="p" className="text-[10px] uppercase tracking-[0.14em]">— Student contributor</Editable>
      </div>
    );
  }

  if (type === "events") {
    return (
      <div className="h-full p-7 sm:p-10">
        <Editable as="h2" className="mb-6 font-serif text-4xl tracking-[-0.04em]">{content?.title ?? "This week"}</Editable>
        {content?.body ? (
          <Editable as="p" className="whitespace-pre-line border-y border-black/30 py-6 font-serif text-xl leading-[1.8]">{content.body}</Editable>
        ) : [
          ["MON 22", "Open mic night", "Student Union · 7:30 PM"],
          ["WED 24", "Astronomy Club stargazing", "East Lawn · 9:00 PM"],
          ["THU 25", "Women’s football: Home game", "University Field · 5:00 PM"],
          ["SAT 27", "Autumn societies fair", "Main Quad · 11:00 AM"],
        ].map(([date, title, place]) => (
          <div className="grid gap-2 border-t border-black/30 py-5 sm:grid-cols-[70px_1fr]" key={title}>
            <Editable as="span" className="text-[9px] font-bold text-[#ef5a35]">{date}</Editable>
            <div>
              <Editable as="h3" className="font-serif text-2xl leading-tight">{title}</Editable>
              <Editable as="p" className="mt-1 text-[9px] uppercase tracking-[0.12em] text-black/45">{place}</Editable>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === "gossip") {
    return (
      <div className="h-full bg-[#efe8d8] p-7 sm:p-9">
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
    return (
      <div className="grid h-full gap-px bg-black sm:grid-cols-2">
        <PhotoField label="Add club photo" storageKey={`${mediaKey}-a`} />
        <PhotoField label="Add event photo" storageKey={`${mediaKey}-b`} />
      </div>
    );
  }

  if (type === "notice") {
    return (
      <div className="h-full border border-black bg-[#f8f5ed] p-7">
        <Editable as="p" className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">{content?.eyebrow ?? "Noticeboard"}</Editable>
        <Editable as="h2" className="mt-6 font-serif text-3xl leading-tight">{content?.title ?? "Submit your work"}</Editable>
        <Editable as="p" className="mt-5 whitespace-pre-line text-sm leading-relaxed">
          {content?.body ?? "Poetry, short fiction, essays, photography, illustration, or fragments we don’t have a name for yet."}
        </Editable>
        <Editable as="p" className="mt-8 text-xs leading-relaxed text-black/50">
          Send up to 1,500 words to words@university.edu by Friday at noon.
        </Editable>
      </div>
    );
  }

  if (type === "interview") {
    return (
      <div className="grid h-full bg-[#171714] text-[#f8f5ed] md:grid-cols-[0.65fr_1.35fr]">
        <div className="flex flex-col justify-between border-b border-white/15 p-7 md:border-b-0 md:border-r sm:p-9">
          <Editable as="p" className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">{content?.eyebrow ?? "Five questions"}</Editable>
          <Editable as="h2" className="mt-12 font-serif text-4xl leading-[0.95] tracking-[-0.04em]">{content?.title ?? "A conversation with someone shaping campus"}</Editable>
          <Editable as="p" className="mt-7 text-[9px] uppercase tracking-[0.14em] text-white/40">{content?.byline ?? "Interview by the editorial team"}</Editable>
        </div>
        <Editable as="p" className="whitespace-pre-line p-7 font-serif text-lg leading-[1.65] text-white/75 sm:p-9">
          {content?.body ?? "Q — What idea are you carrying with you this semester?\n\nA — That the most useful work often begins as a conversation between people who see the same problem differently.\n\nQ — Where should students begin?\n\nA — With curiosity, and with one another."}
        </Editable>
      </div>
    );
  }

  if (type === "statistics") {
    return (
      <div className="h-full bg-[#efe8d8] p-7 sm:p-9">
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
    return (
      <div className="h-full p-7 sm:p-9">
        <Editable as="p" className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">{content?.eyebrow ?? "The shortlist"}</Editable>
        <Editable as="h2" className="mt-4 font-serif text-4xl tracking-[-0.04em]">{content?.title ?? "Things worth your time"}</Editable>
        {content?.body ? <Editable as="p" className="mt-8 whitespace-pre-line border-y border-black/20 py-5 font-serif text-xl leading-[1.7]">{content.body}</Editable> : <div className="mt-8 divide-y divide-black/20 border-y border-black/20">{[["01", "Read", "A book to carry between lectures"], ["02", "Watch", "A film everyone will be discussing"], ["03", "Listen", "The conversation of the week"]].map(([number, kind, title]) => <div className="grid grid-cols-[35px_65px_1fr] gap-3 py-5" key={number}><span className="text-[9px] font-bold text-[#ef5a35]">{number}</span><Editable as="span" className="text-[8px] font-bold uppercase tracking-[0.12em] text-black/40">{kind}</Editable><Editable as="p" className="font-serif text-lg leading-tight">{title}</Editable></div>)}</div>}
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
      <div className="flex h-full flex-col justify-between border-y border-black/15 bg-[#171714] p-7 text-white sm:p-9">
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">Campus Audio · Playlist</span>
            <span className="flex items-center gap-1.5 text-[8px] uppercase tracking-[0.14em] text-white/50">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ef5a35]" /> Live Audio
            </span>
          </div>
          <Editable as="h3" className="mt-3 font-serif text-3xl sm:text-4xl">
            {content?.title ?? "Tracks from the Library Basement"}
          </Editable>
          <Editable as="p" className="mt-2 text-xs leading-relaxed text-white/60">
            {content?.body ?? "Curated by the Campus Radio Society. Songs playing across study halls, rehearsal rooms, and dorm kitchens this week."}
          </Editable>
        </div>
        <div className="mt-6 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[#ef5a35] text-white">
              ▶
            </div>
            <div>
              <Editable as="p" className="text-xs font-semibold text-white">
                Track 01 · Late Autumn Reverie
              </Editable>
              <Editable as="p" className="text-[10px] text-white/45">
                The Student Quartet · 3:42
              </Editable>
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
      <CrosswordSection
        data={content?.crossword || DEFAULT_CAMPUS_MINI_CROSSWORD}
        isEditor={true}
        onEdit={onEditCrossword}
      />
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
    <div className="flex h-full flex-col justify-between bg-[#171714] p-8 text-[#f8f5ed] sm:p-12">
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
  pageIndex,
  isCoverPhoto,
  onDragStart,
  onDrop,
  onAction,
  issueId,
  onAi,
  onEditCrossword,
}: {
  section: Section;
  pageIndex: number;
  isCoverPhoto?: boolean;
  onDragStart: (page: number, id: string) => void;
  onDrop: (page: number, id: string) => void;
  onAction: (
    action: "up" | "down" | "width" | "height" | "duplicate" | "delete" | "setWidth" | "setHeight" | "widthStep" | "heightStep",
    page: number,
    id: string,
    extraValue?: any,
  ) => void;
  issueId: string;
  onAi: (sectionId: string) => void;
  onEditCrossword?: (sectionId: string) => void;
}) {
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
      data-section-id={section.id}
      draggable
      onDragOver={(event) => event.preventDefault()}
      onDragStart={() => onDragStart(pageIndex, section.id)}
      onDrop={(event: DragEvent) => {
        event.preventDefault();
        onDrop(pageIndex, section.id);
      }}
      style={{ gridColumn: `span ${section.width}` }}
    >
      {/* Top Left: Size & Dimension Pill Badge */}
      <div className="editor-only pointer-events-none absolute left-3 top-2.5 z-20 flex items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
        <span className="rounded-full border border-black/15 bg-[#f8f5ed]/95 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.1em] text-black/60 shadow-sm backdrop-blur-sm">
          {widthLabels[section.width] || `${section.width} cols`} · {heightLabels[section.height] || section.height}
        </span>
      </div>

      {/* Top Right: Full Floating Control Bar with intuitive Width & Height pickers */}
      <div className="block-controls editor-only">
        <span className="drag-handle" title="Drag to reorder block">⠿</span>

        {/* Dedicated Crossword Edit trigger */}
        {section.type === "crossword" && onEditCrossword && (
          <button
            className="inline-flex items-center gap-1 rounded bg-[#ef5a35] px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#d44826]"
            onClick={() => onEditCrossword(section.id)}
            title="Open Crossword Studio Modal"
            type="button"
          >
            <span>✏️ Studio</span>
          </button>
        )}

        {/* AI Rewrite */}
        <button aria-label="Rewrite section with AI" onClick={() => onAi(section.id)} title="Rewrite section with AI">
          <EditorIcon name="write" />
        </button>

        {/* Order controls */}
        <button onClick={() => onAction("up", pageIndex, section.id)} title="Move up">↑</button>
        <button onClick={() => onAction("down", pageIndex, section.id)} title="Move down">↓</button>

        {/* Intuitive Width Pills */}
        <div className="flex items-center gap-0.5 border-l border-black/10 px-1" title="Select Column Width">
          <span className="px-1 text-[8px] font-bold uppercase text-black/40">W:</span>
          {([4, 6, 8, 12] as const).map((w) => {
            const label = w === 4 ? "1/3" : w === 6 ? "1/2" : w === 8 ? "2/3" : "Full";
            const isActive = section.width === w;
            return (
              <button
                className={`h-5 w-auto min-w-5 rounded px-1.5 text-[8px] font-bold ${
                  isActive ? "bg-[#ef5a35] text-white" : "text-black/60 hover:bg-black/10"
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

        {/* Intuitive Height Pills */}
        <div className="flex items-center gap-0.5 border-l border-black/10 px-1" title="Select Row Height">
          <span className="px-1 text-[8px] font-bold uppercase text-black/40">H:</span>
          {(["compact", "regular", "tall"] as const).map((h) => {
            const label = h === "compact" ? "S" : h === "regular" ? "M" : "L";
            const isActive = section.height === h;
            return (
              <button
                className={`h-5 w-auto min-w-5 rounded px-1.5 text-[8px] font-bold ${
                  isActive ? "bg-[#ef5a35] text-white" : "text-black/60 hover:bg-black/10"
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

        <button onClick={() => onAction("duplicate", pageIndex, section.id)} title="Duplicate block">＋</button>
        <button className="text-black/50 hover:bg-red-600 hover:text-white" onClick={() => onAction("delete", pageIndex, section.id)} title="Delete block">×</button>
      </div>

      {/* Right Edge Interactive Width Resizer Handle */}
      <div className="editor-only absolute -right-3 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="flex items-center rounded-full border border-black/20 bg-white/95 p-0.5 shadow-md backdrop-blur-sm">
          <button
            className="grid h-5 w-5 place-items-center rounded-full text-[9px] font-bold text-black/60 hover:bg-[#ef5a35] hover:text-white disabled:opacity-30"
            disabled={section.width <= 4}
            onClick={() => onAction("widthStep", pageIndex, section.id, "shrink")}
            title="Narrow block (reduce columns)"
            type="button"
          >
            ◀
          </button>
          <span className="px-1 text-[8px] font-bold text-black/50">
            {section.width === 4 ? "1/3" : section.width === 6 ? "1/2" : section.width === 8 ? "2/3" : "Full"}
          </span>
          <button
            className="grid h-5 w-5 place-items-center rounded-full text-[9px] font-bold text-black/60 hover:bg-[#ef5a35] hover:text-white disabled:opacity-30"
            disabled={section.width >= 12}
            onClick={() => onAction("widthStep", pageIndex, section.id, "expand")}
            title="Widen block (increase columns)"
            type="button"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Bottom Edge Interactive Height Resizer Handle */}
      <div className="editor-only absolute -bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center rounded-full border border-black/20 bg-white/95 p-0.5 opacity-0 shadow-md backdrop-blur-sm transition-opacity group-hover:opacity-100">
        <button
          className="grid h-5 w-5 place-items-center rounded-full text-[9px] font-bold text-black/60 hover:bg-[#ef5a35] hover:text-white disabled:opacity-30"
          disabled={section.height === "compact"}
          onClick={() => onAction("heightStep", pageIndex, section.id, "shorter")}
          title="Make block shorter"
          type="button"
        >
          ▲
        </button>
        <span className="px-1.5 text-[8px] font-bold uppercase text-black/50">
          {section.height === "compact" ? "S" : section.height === "regular" ? "M" : "L"}
        </span>
        <button
          className="grid h-5 w-5 place-items-center rounded-full text-[9px] font-bold text-black/60 hover:bg-[#ef5a35] hover:text-white disabled:opacity-30"
          disabled={section.height === "tall"}
          onClick={() => onAction("heightStep", pageIndex, section.id, "taller")}
          title="Make block taller"
          type="button"
        >
          ▼
        </button>
      </div>

      <SectionContent
        isCoverPhoto={isCoverPhoto}
        mediaKey={`iow-media-${issueId}-${section.id}`}
        onEditCrossword={() => onEditCrossword?.(section.id)}
        section={section}
      />
    </section>
  );
}

type EditorIconName =
  | "back" | "workflow" | "write" | "palette" | "pages" | "undo" | "redo"
  | "add" | "preview" | "edit" | "save" | "type" | "bold" | "italic"
  | "underline" | "list" | "ordered" | "left" | "center" | "link"
  | "heading" | "clear" | "close";

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
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [pageMenuOpen, setPageMenuOpen] = useState(false);
  const [designOpen, setDesignOpen] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceText, setSourceText] = useState(sourceStarter);
  const [paletteId, setPaletteId] = useState(() => localStorage.getItem(`iow-palette-${issueId}`) ?? "campus");
  const [fontId, setFontId] = useState(() => localStorage.getItem(`iow-font-${issueId}`) ?? "newsreader");
  const [preview, setPreview] = useState(false);
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");
  const dragged = useRef<{ page: number; id: string } | null>(null);
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const contentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const aiApplyRef = useRef<(value: string) => void>(() => undefined);
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
  const [crosswordEditId, setCrosswordEditId] = useState<string | null>(null);

  const handleSaveCrossword = (newData: CrosswordData) => {
    if (!crosswordEditId) return;
    rememberLayout();
    setPages((prev) =>
      prev.map((sections) =>
        sections.map((sec) =>
          sec.id === crosswordEditId
            ? { ...sec, content: { ...sec.content, crossword: newData } }
            : sec
        )
      ) as Pages
    );
    setCrosswordEditId(null);
  };
  const slashStartRef = useRef(0);
  const pageDragRef = useRef<number | null>(null);
  const editSessionRef = useRef(false);
  const palette = PALETTES.find((item) => item.id === paletteId) ?? PALETTES[0];
  const fontPair = FONT_PAIRS.find((item) => item.id === fontId) ?? FONT_PAIRS[0];

  const { user } = useAuth();
  const isRemoteUpdateRef = useRef(false);

  const handleRemoteChange = useCallback((payload: DocChangePayload) => {
    if (payload.type === "field_edit") {
      const { index, html } = payload.data || {};
      if (typeof index === "number" && typeof html === "string") {
        const editables = document.querySelectorAll<HTMLElement>("#pdf-document .editable");
        const target = editables[index];
        if (target && document.activeElement !== target) {
          if (target.innerHTML !== html) {
            target.innerHTML = html;
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
      }
    } else if (payload.type === "media") {
      const { storageKey, value, meta } = payload.data || {};
      if (storageKey) {
        isRemoteUpdateRef.current = true;
        if (value !== undefined) localStorage.setItem(storageKey, value);
        if (meta !== undefined) localStorage.setItem(`${storageKey}-meta`, JSON.stringify(meta));
        window.dispatchEvent(new CustomEvent("iow-photo-update", { detail: { storageKey, value, meta, broadcast: false } }));
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
      content,
      media: collectMedia(),
      comments,
    };
  }, [pages, paletteId, fontId, comments]);

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
      if (detail?.broadcast && !isRemoteUpdateRef.current) {
        broadcastDocChange("media", { storageKey: detail.storageKey, value: detail.value, meta: detail.meta });
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

  const saveContent = () => {
    const content = Array.from(document.querySelectorAll<HTMLElement>("#pdf-document .editable")).map(
      (element) => element.innerHTML,
    );
    localStorage.setItem(`iow-content-${issueId}`, JSON.stringify(content));
    updateIssue(issueId, {});
    setSaved(true);
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
      if (key?.startsWith(prefix)) media[key] = localStorage.getItem(key) ?? "";
    }
    return media;
  };

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
    if (undoStack.current.length > 40) undoStack.current.shift();
    redoStack.current = [];
  };

  const updatePage = (page: number, updater: (sections: Section[]) => Section[]) => {
    rememberLayout();
    setPages((current) => current.map((sections, index) => (index === page ? updater(sections) : sections)) as Pages);
  };

  const addSection = (type: SectionType) => {
    const width =
      type === "notice" || type === "gossip"
        ? 4
        : type === "poem" ||
          type === "events" ||
          type === "timeline" ||
          type === "recommendations" ||
          type === "statistics" ||
          type === "crossword" ||
          type === "sudoku" ||
          type === "wordsearch"
        ? 6
        : 12;

    const contentForType: Section["content"] = {};
    if (type === "crossword") contentForType.crossword = DEFAULT_CAMPUS_MINI_CROSSWORD;
    if (type === "sudoku") contentForType.sudoku = DEFAULT_SUDOKU;
    if (type === "wordsearch") contentForType.wordsearch = DEFAULT_WORD_SEARCH;

    updatePage(activePage, (items) => [
      ...items,
      {
        id: `${type}-${Date.now()}`,
        type,
        width,
        height: type === "crossword" || type === "sudoku" ? "tall" : "regular",
        content: contentForType,
      },
    ]);
    setLibraryOpen(false);
    window.setTimeout(() => document.querySelector(`#page-${activePage + 1}`)?.scrollIntoView({ behavior: "smooth", block: "end" }), 50);
  };

  const addPage = (kind: PagePresetKind) => {
    rememberLayout();
    setPages((current) => [...current, pagePreset(kind)]);
    setActivePage(pages.length);
    setPageMenuOpen(false);
    window.setTimeout(() => document.querySelector(`#page-${pages.length + 1}`)?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const removePage = (pageIndex: number) => {
    if (pages.length === 1) {
      window.alert("A newsletter must contain at least one page.");
      return;
    }
    if (!window.confirm(`Remove page ${pageIndex + 1}? Its sections will be deleted.`)) return;
    rememberLayout();
    setPages((current) => current.filter((_, index) => index !== pageIndex));
    setActivePage((current) => Math.max(0, Math.min(current, pages.length - 2)));
  };

  const updateSource = (value: string) => {
    setSourceText(value);
    rememberLayout();
    setPages(compileSource(value));
    setActivePage(0);
  };

  const blockAction = (
    action: "up" | "down" | "width" | "height" | "duplicate" | "delete" | "setWidth" | "setHeight" | "widthStep" | "heightStep",
    page: number,
    id: string,
    extraValue?: any,
  ) => {
    updatePage(page, (items) => {
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) return items;
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
    window.setTimeout(() => setSaved(false), 1800);
  };

  const downloadPdf = async () => {
    const wasPreviewing = preview;
    setPreview(true);
    setExporting(true);
    setExportProgress("Preparing");
    try {
      await document.fonts.ready;
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
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
        const width = page.offsetWidth;
        const height = page.scrollHeight;
        const orientation = width > height ? "landscape" : "portrait";
        const canvas = await html2canvas(page, {
          backgroundColor: "#f8f5ed",
          scale: 2,
          useCORS: true,
          logging: false,
          width,
          height,
          windowWidth: width,
          windowHeight: height,
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
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.96), "JPEG", 0, 0, width, height, undefined, "FAST");
      }
      setExportProgress("Downloading");
      const filename = issue.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "newsletter";
      pdf?.save(`${filename}.pdf`);
    } catch (error) {
      console.error("PDF export failed", error);
      window.alert("The PDF could not be created. Check that uploaded images are available, then try again.");
    } finally {
      setExporting(false);
      setExportProgress("");
      setPreview(wasPreviewing);
    }
  };

  const undo = () => {
    const previous = undoStack.current.pop();
    if (!previous) return;
    redoStack.current.push(JSON.stringify(pages));
    setPages(JSON.parse(previous));
  };

  const redo = () => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push(JSON.stringify(pages));
    setPages(JSON.parse(next));
  };

  const setStatus = (status: Issue["status"]) => {
    const next = { ...issue, status };
    setIssue(next);
    updateIssue(issueId, { status });
  };

  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    scheduleContentSave();
  };

  const addLink = () => {
    const url = window.prompt("Paste a link URL");
    if (url) formatText("createLink", url);
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

  const rewriteSection = (sectionId: string) => {
    const section = document.querySelector<HTMLElement>(`[data-section-id="${sectionId}"]`);
    const fields = Array.from(section?.querySelectorAll<HTMLElement>(".editable") ?? []);
    const target = fields.sort((a, b) => b.innerText.length - a.innerText.length)[0];
    if (!target?.innerText.trim()) return;
    openAiRewrite(target.innerText, (value) => {
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
      window.alert("Select text in Writing Mode first.");
      return;
    }
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
  };

  const syncWritingFromCanvas = () => {
    const commandFor: Record<SectionType, string> = {
      cover: "Title", heading: "Heading", article: "Article", photo: "Photo",
      poem: "Poetry", quote: "Quote", events: "Events", gossip: "Gossip",
      gallery: "Gallery", notice: "Notice", divider: "Divider", footer: "Final",
      interview: "Interview", statistics: "Statistics", timeline: "Timeline",
      recommendations: "Recommendations",
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
    results.push({ tone: emptyPages ? "warn" : "pass", label: "Page structure", detail: emptyPages ? `${emptyPages} empty page${emptyPages === 1 ? "" : "s"}` : "Every page contains content" });
    results.push({ tone: overflow ? "warn" : "pass", label: "Page flow", detail: overflow ? `${overflow} page${overflow === 1 ? "" : "s"} should be rebalanced` : "No page overflow detected" });
    results.push({ tone: emptyFields ? "warn" : "pass", label: "Copy completeness", detail: emptyFields ? `${emptyFields} empty text field${emptyFields === 1 ? "" : "s"}` : "All text fields contain copy" });
    results.push({ tone: placeholders ? "warn" : "pass", label: "Photography", detail: placeholders ? `${placeholders} image placeholder${placeholders === 1 ? "" : "s"} remaining` : "All image slots are filled" });
    results.push({ tone: lowResolution ? "warn" : "pass", label: "Image resolution", detail: lowResolution ? `${lowResolution} image${lowResolution === 1 ? "" : "s"} may print softly` : "Image resolution looks suitable" });
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

  const saveAsTemplate = (scope: "issue" | "page") => {
    const name = window.prompt(scope === "issue" ? "Template name" : "Page template name")?.trim();
    if (!name) return;
    const selectedPages = scope === "issue" ? pages : [pages[activePage] ?? [], [], []];
    saveCustomTemplate({
      id: `custom-${Date.now()}`,
      name,
      description: scope === "issue" ? "Custom newsletter template created by your team." : "Custom page template created from the current page.",
      category: "Team template",
      accent: palette.accent,
      preview: "editorial",
      pages: selectedPages.slice(0, 3).concat([[], [], []]).slice(0, 3) as [Section[], Section[], Section[]],
    });
    captureCheckpoint(`Saved ${scope} as template`);
    window.alert(`“${name}” is now available when creating a newsletter.`);
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

  const mediaEntries = Object.entries(collectMedia()).filter(([, value]) => value.startsWith("data:image"));

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
      } as CSSProperties}
    >
      <header className="editor-bar sticky top-0 z-40 flex min-h-14 items-center justify-between gap-3 border-b border-black/15 bg-[#f4f1e9]/95 px-3 py-2 backdrop-blur-sm md:px-5">
        <div className="flex shrink-0 items-center gap-2">
          <Link aria-label="Back to dashboard" className="editor-icon-button" to="/" title="Back to dashboard"><EditorIcon name="back" /></Link>
          <BrandLogo className="h-10 w-20" />
          <div className="hidden xl:block">
            <p className="max-w-48 truncate text-[13px] font-semibold leading-none">{issue.title}</p>
          </div>
        </div>

        <nav className="flex max-w-[30vw] items-center overflow-x-auto rounded-full border border-black/15 bg-white/50 p-1">
          {pages.map((_, pageIndex) => (
            <a
              className={`rounded-full px-2.5 py-1.5 text-[9px] font-bold ${activePage === pageIndex ? "bg-white shadow-sm" : ""}`}
              href={`#page-${pageIndex + 1}`}
              key={pageIndex}
              onClick={() => setActivePage(pageIndex)}
            >
              {pageIndex + 1}
            </a>
          ))}
          <button aria-label="Add page" className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[#ef5a35] hover:bg-white" onClick={() => setPageMenuOpen(true)} title="Add page" type="button"><EditorIcon name="add" /></button>
        </nav>

        <div className="flex shrink-0 items-center gap-1.5">
          <CollaboratorAvatars
            collaborators={collaborators}
            isConnected={isConnected}
            myId={myId}
            myColor={userColor}
          />
          <span className="mx-1 hidden h-5 w-px bg-black/10 sm:block" />

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

          <span aria-label="Saved" className={`mr-1 h-2 w-2 rounded-full bg-[#3e6a59] transition-opacity ${saved ? "opacity-100" : "opacity-0"}`} title="Saved" />
          <button aria-label={sourceMode ? "Canvas mode" : "Writing mode"} className={`editor-icon-button ${sourceMode ? "bg-white text-[#ef5a35]" : ""}`} onClick={() => setSourceMode(!sourceMode)} title={sourceMode ? "Canvas mode" : "Writing mode"} type="button"><EditorIcon name="write" /></button>
          <button aria-label="Document design" className="editor-icon-button hidden sm:grid" onClick={() => setDesignOpen(true)} title="Document design" type="button"><EditorIcon name="palette" /></button>
          <button aria-label="Manage pages" className="editor-icon-button hidden sm:grid" onClick={() => setPageMenuOpen(true)} title="Manage pages" type="button"><EditorIcon name="pages" /></button>
          <button aria-label="Production studio" className={`editor-icon-button hidden sm:grid ${studioOpen ? "bg-white text-[#ef5a35]" : ""}`} onClick={() => setStudioOpen(true)} title="Production studio" type="button"><EditorIcon name="workflow" /></button>
          <button aria-label="Text formatting" className={`editor-icon-button ${formatOpen ? "bg-white text-[#ef5a35]" : ""}`} onClick={() => setFormatOpen(!formatOpen)} title="Text formatting" type="button"><EditorIcon name="type" /></button>
          <span className="mx-1 hidden h-5 w-px bg-black/10 lg:block" />
          <button aria-label="Undo layout change" className="editor-icon-button hidden lg:grid" disabled={!undoStack.current.length} onClick={undo} title="Undo layout change" type="button"><EditorIcon name="undo" /></button>
          <button aria-label="Redo layout change" className="editor-icon-button hidden lg:grid" disabled={!redoStack.current.length} onClick={redo} title="Redo layout change" type="button"><EditorIcon name="redo" /></button>
          <select aria-label="Publication status" className="hidden rounded-full border border-black/15 bg-transparent px-2 py-2 text-[8px] font-bold uppercase tracking-[0.08em] outline-none md:block" onChange={(event) => setStatus(event.target.value as Issue["status"])} value={issue.status}>
            <option value="draft">Draft</option>
            <option value="review">In review</option>
            <option value="published">Published</option>
          </select>
          <button aria-label="Add section" className="editor-icon-button" onClick={() => setLibraryOpen(true)} title="Add section" type="button"><EditorIcon name="add" /></button>
          <button aria-label={preview ? "Return to editing" : "Preview"} className="editor-icon-button" onClick={() => setPreview(!preview)} title={preview ? "Return to editing" : "Preview"} type="button"><EditorIcon name={preview ? "edit" : "preview"} /></button>
          <button aria-label="Save" className="editor-icon-button hidden md:grid" onClick={saveDraft} title="Save" type="button"><EditorIcon name="save" /></button>
          <button className="rounded-full bg-[#171714] px-4 py-2 text-[9px] font-bold uppercase tracking-[0.1em] text-white hover:bg-[#ef5a35] disabled:cursor-wait disabled:opacity-60" disabled={exporting} onClick={downloadPdf} type="button">
            {exporting ? exportProgress : "PDF"}
          </button>
        </div>
      </header>

      {formatOpen && (
        <div className="editor-only fixed right-4 top-[4.25rem] z-40 flex flex-wrap items-center gap-1 rounded-xl border border-black/15 bg-[#f8f5ed] p-2 shadow-xl">
          {[
            ["bold", "bold"], ["italic", "italic"], ["underline", "underline"],
            ["insertUnorderedList", "list"], ["insertOrderedList", "ordered"],
            ["justifyLeft", "left"], ["justifyCenter", "center"],
          ].map(([command, icon]) => (
            <button aria-label={command} className="editor-icon-button" key={command} onMouseDown={(event) => { event.preventDefault(); formatText(command); }} title={command} type="button"><EditorIcon name={icon as EditorIconName} /></button>
          ))}
          <span className="mx-1 h-8 w-px bg-black/10" />
          <button aria-label="Add link" className="editor-icon-button" onMouseDown={(event) => { event.preventDefault(); addLink(); }} title="Add link" type="button"><EditorIcon name="link" /></button>
          <button aria-label="Heading" className="editor-icon-button" onMouseDown={(event) => { event.preventDefault(); formatText("formatBlock", "h2"); }} title="Heading" type="button"><EditorIcon name="heading" /></button>
          <button aria-label="Clear formatting" className="editor-icon-button" onMouseDown={(event) => { event.preventDefault(); formatText("removeFormat"); }} title="Clear formatting" type="button"><EditorIcon name="clear" /></button>
          <span className="mx-1 h-8 w-px bg-black/10" />
          <button
            aria-label="Close text formatting"
            className="editor-icon-button text-black/50 hover:bg-[#ef5a35] hover:text-white"
            onClick={() => setFormatOpen(false)}
            title="Close formatting bar"
            type="button"
          >
            <EditorIcon name="close" />
          </button>
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
                  {aiResult && <button className="rounded-full bg-[#ef5a35] px-5 py-2.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white" onClick={() => { aiApplyRef.current(aiResult); setAiOpen(false); }} type="button">Use rewrite</button>}
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
        <div className="editor-only fixed inset-0 z-50 flex justify-end bg-black/30" onMouseDown={() => setLibraryOpen(false)}>
          <aside className="h-full w-full max-w-md overflow-y-auto bg-[#f8f5ed] p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="mb-7 flex items-start justify-between">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">Page {activePage + 1}</p>
                <h2 className="mt-2 font-serif text-4xl tracking-[-0.04em]">Add a section</h2>
              </div>
              <button className="text-2xl" onClick={() => setLibraryOpen(false)} type="button">×</button>
            </div>
            <p className="mb-6 text-xs leading-relaxed text-black/55">
              Pick a ready-made block. Once added, use its controls to move, resize, duplicate, or remove it.
            </p>
            <div className="grid gap-2">
              {SECTION_OPTIONS.map((option) => (
                <button className="group flex items-center justify-between border border-black/15 p-4 text-left transition hover:border-[#ef5a35] hover:bg-white" key={option.type} onClick={() => addSection(option.type)} type="button">
                  <span>
                    <span className="block font-serif text-xl">{option.name}</span>
                    <span className="mt-1 block text-[10px] text-black/45">{option.description}</span>
                  </span>
                  <span className="text-xl text-[#ef5a35] transition-transform group-hover:translate-x-1">+</span>
                </button>
              ))}
            </div>
          </aside>
        </div>
      )}

      {pageMenuOpen && (
        <div className="editor-only fixed inset-0 z-50 grid place-items-center bg-black/35 p-4" onMouseDown={() => setPageMenuOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto bg-[#f8f5ed] p-6 shadow-2xl sm:p-8" onMouseDown={(event) => event.stopPropagation()}>
            <div className="mb-7 flex items-start justify-between">
              <div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#ef5a35]">Document pages</p><h2 className="mt-2 font-serif text-4xl">Add a page</h2></div>
              <button className="text-2xl" onClick={() => setPageMenuOpen(false)} type="button">×</button>
            </div>
            <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.15em] text-black/40">Title page styles</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["title-editorial", "Editorial cover", "A bold masthead, issue headline, introduction, and hero photograph.", "01"],
                ["title-minimal", "Quiet minimal", "Generous white space, a restrained title, divider, and opening thought.", "Aa"],
                ["title-split", "Split statement", "Asymmetric headline and quotation columns followed by a photograph.", "½"],
              ].map(([id, name, description, mark]) => (
                <button className="group border border-black/15 p-5 text-left transition hover:border-[#ef5a35] hover:bg-white" key={id} onClick={() => addPage(id as PagePresetKind)} type="button">
                  <span className="mb-8 grid h-16 place-items-center border border-black/10 bg-[#efe8d8] font-serif text-3xl transition group-hover:bg-[#ef5a35] group-hover:text-white">{mark}</span>
                  <span className="font-serif text-2xl">{name}</span>
                  <span className="mt-2 block text-[10px] leading-relaxed text-black/45">{description}</span>
                </button>
              ))}
            </div>
            <p className="mb-3 mt-8 text-[9px] font-bold uppercase tracking-[0.15em] text-black/40">Contents page styles</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["contents-classic", "Classic index", "A traditional numbered contents list with a large editorial heading.", "1—6"],
                ["contents-grid", "Feature grid", "A modular feature directory paired with a compact weekly index.", "4×"],
                ["contents-numeric", "Numeric guide", "Issue statistics and a chronological reading route.", "123"],
              ].map(([id, name, description, mark]) => (
                <button className="group border border-black/15 p-5 text-left transition hover:border-[#ef5a35] hover:bg-white" key={id} onClick={() => addPage(id as PagePresetKind)} type="button">
                  <span className="mb-8 grid h-16 place-items-center border border-black/10 bg-[#efe8d8] font-serif text-2xl transition group-hover:bg-[#ef5a35] group-hover:text-white">{mark}</span>
                  <span className="font-serif text-2xl">{name}</span>
                  <span className="mt-2 block text-[10px] leading-relaxed text-black/45">{description}</span>
                </button>
              ))}
            </div>
            <p className="mb-3 mt-8 text-[9px] font-bold uppercase tracking-[0.15em] text-black/40">Utility pages</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[["blank", "Blank page", "An empty canvas ready for sections from the library."], ["final", "Final page", "Closing statement, quotation, and publication footer."]].map(([id, name, description]) => (
                <button className="border border-black/15 p-5 text-left transition hover:border-[#ef5a35] hover:bg-white" key={id} onClick={() => addPage(id as PagePresetKind)} type="button"><span className="font-serif text-2xl">{name}</span><span className="mt-2 block text-[10px] leading-relaxed text-black/45">{description}</span></button>
              ))}
            </div>
          </div>
        </div>
      )}

      {designOpen && (
        <div className="editor-only fixed inset-0 z-50 flex justify-end bg-black/35" onMouseDown={() => setDesignOpen(false)}>
          <aside className="h-full w-full max-w-sm overflow-y-auto bg-[#f8f5ed] p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#ef5a35]">Document design</p><h2 className="mt-2 font-serif text-4xl">Style the issue</h2></div><button className="text-2xl" onClick={() => setDesignOpen(false)} type="button">×</button></div>
            <p className="mb-4 mt-9 text-[9px] font-bold uppercase tracking-[0.14em] text-black/40">Color palette</p>
            <div className="grid gap-2">
              {PALETTES.map((item) => <button className={`flex items-center gap-4 border p-3 text-left ${paletteId === item.id ? "border-black" : "border-black/10"}`} key={item.id} onClick={() => setPaletteId(item.id)} type="button"><span className="flex overflow-hidden rounded-full border border-black/10"><span className="h-7 w-7" style={{ background: item.accent }} /><span className="h-7 w-7" style={{ background: item.paper }} /><span className="h-7 w-7" style={{ background: item.ink }} /></span><span className="text-xs font-semibold">{item.name}</span></button>)}
            </div>
            <p className="mb-4 mt-9 text-[9px] font-bold uppercase tracking-[0.14em] text-black/40">Typography</p>
            <div className="grid gap-2">
              {FONT_PAIRS.map((item) => <button className={`border p-4 text-left ${fontId === item.id ? "border-black" : "border-black/10"}`} key={item.id} onClick={() => setFontId(item.id)} type="button"><span className="block text-2xl" style={{ fontFamily: item.serif }}>Editorial Aa</span><span className="mt-2 block text-[9px] uppercase tracking-[0.12em] text-black/40" style={{ fontFamily: item.sans }}>{item.name}</span></button>)}
            </div>
          </aside>
        </div>
      )}

      {studioOpen && (
        <div className="editor-only fixed inset-0 z-50 flex justify-end bg-black/35" onMouseDown={() => setStudioOpen(false)}>
          <aside className="flex h-full w-full max-w-xl flex-col bg-[#f8f5ed] shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <header className="flex items-start justify-between border-b border-black/10 p-6">
              <div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#ef5a35]">Production studio</p><h2 className="mt-2 font-serif text-4xl">Finish with confidence.</h2></div>
              <button className="text-2xl text-black/35" onClick={() => setStudioOpen(false)} type="button">×</button>
            </header>
            <nav className="flex overflow-x-auto border-b border-black/10 px-3">
              {(["pages", "preflight", "history", "templates", "media", "export"] as StudioTab[]).map((tab) => (
                <button className={`border-b-2 px-3 py-4 text-[8px] font-bold uppercase tracking-[0.12em] ${studioTab === tab ? "border-[#ef5a35] text-[#ef5a35]" : "border-transparent text-black/40"}`} key={tab} onClick={() => { setStudioTab(tab); if (tab === "preflight") runPreflight(); }} type="button">{tab}</button>
              ))}
            </nav>
            <div className="flex-1 overflow-y-auto p-6">
              {studioTab === "pages" && (
                <div>
                  <div className="mb-6 flex items-center justify-between border border-black/10 p-4"><div><p className="text-xs font-semibold">Smart page flow</p><p className="mt-1 text-[9px] text-black/40">Move overflowing sections forward after text edits.</p></div><button className={`h-6 w-11 rounded-full p-1 transition ${smartFlow ? "bg-[#ef5a35]" : "bg-black/15"}`} onClick={() => setSmartFlow(!smartFlow)} type="button"><span className={`block h-4 w-4 rounded-full bg-white transition-transform ${smartFlow ? "translate-x-5" : ""}`} /></button></div>
                  <div className="grid gap-3">
                    {pages.map((sections, index) => (
                      <div className="flex items-center gap-4 border border-black/10 p-3" draggable key={index} onDragStart={() => { pageDragRef.current = index; }} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (pageDragRef.current !== null) movePage(pageDragRef.current, index); pageDragRef.current = null; }}>
                        <div className="grid h-16 w-12 shrink-0 place-items-center border border-black/15 bg-white text-[10px] font-bold">{index + 1}</div>
                        <div className="min-w-0 flex-1"><p className="text-xs font-semibold">Page {index + 1}</p><p className="mt-1 text-[9px] text-black/40">{sections.length} section{sections.length === 1 ? "" : "s"} · Drag to reorder</p></div>
                        <button className="px-2 text-black/35" disabled={index === 0} onClick={() => movePage(index, index - 1)} title="Move page up" type="button">↑</button>
                        <button className="px-2 text-black/35" disabled={index === pages.length - 1} onClick={() => movePage(index, index + 1)} title="Move page down" type="button">↓</button>
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
                <div><button className="studio-action mb-5" onClick={() => captureCheckpoint("Manual checkpoint")} type="button">Create checkpoint</button><div className="space-y-2">{checkpoints.length ? checkpoints.map((item) => <div className="flex items-center justify-between border border-black/10 p-4" key={item.id}><div><p className="text-xs font-semibold">{item.label}</p><p className="mt-1 text-[9px] text-black/40">{new Date(item.at).toLocaleString()} · {item.pages.length} pages</p></div><button className="text-[8px] font-bold uppercase tracking-[0.1em] text-[#ef5a35]" onClick={() => restoreCheckpoint(item)} type="button">Restore</button></div>) : <p className="py-12 text-center text-xs text-black/40">Checkpoints appear after edits or manual saves.</p>}</div></div>
              )}
              {studioTab === "templates" && (
                <div><p className="text-sm leading-relaxed text-black/55">Turn this issue—or only the selected page—into a reusable team template. Content and layout remain editable in every new issue.</p><div className="mt-6 grid gap-3 sm:grid-cols-2"><button className="border border-black/15 p-6 text-left hover:border-[#ef5a35]" onClick={() => saveAsTemplate("issue")} type="button"><span className="font-serif text-2xl">Save full issue</span><span className="mt-2 block text-[10px] text-black/40">Keep the complete page sequence.</span></button><button className="border border-black/15 p-6 text-left hover:border-[#ef5a35]" onClick={() => saveAsTemplate("page")} type="button"><span className="font-serif text-2xl">Save current page</span><span className="mt-2 block text-[10px] text-black/40">Use this page as a starting format.</span></button></div></div>
              )}
              {studioTab === "media" && (
                <div><div className="mb-5"><p className="text-xs font-semibold">Issue media</p><p className="mt-1 text-[9px] text-black/40">Uploaded images are stored locally with this issue. Captions and credits remain editable on canvas.</p></div>{mediaEntries.length ? <div className="grid grid-cols-2 gap-3">{mediaEntries.map(([key, value]) => <figure className="border border-black/10 bg-white p-2" key={key}><img alt="Uploaded issue media" className="aspect-video w-full object-cover" src={value} /><figcaption className="mt-2 flex items-center justify-between gap-2"><span className="truncate text-[8px] text-black/35">{key.split("-").slice(-2).join("-")}</span><button className="text-[8px] font-bold uppercase text-[#ef5a35]" onClick={() => { if (window.confirm("Remove this stored image?")) { localStorage.removeItem(key); window.location.reload(); } }} type="button">Remove</button></figcaption></figure>)}</div> : <p className="border border-dashed border-black/15 py-14 text-center text-xs text-black/40">No uploaded media yet.</p>}</div>
              )}
              {studioTab === "export" && (
                <div className="grid gap-3"><button className="flex items-center justify-between border border-black/15 p-5 text-left hover:border-[#ef5a35]" onClick={downloadPdf} type="button"><span><span className="font-serif text-2xl">Visual PDF</span><span className="mt-1 block text-[9px] text-black/40">Exact page dimensions and high-resolution rendering.</span></span><span>→</span></button><button className="flex items-center justify-between border border-black/15 p-5 text-left hover:border-[#ef5a35]" onClick={exportEmailHtml} type="button"><span><span className="font-serif text-2xl">Email-safe HTML</span><span className="mt-1 block text-[9px] text-black/40">Inline-styled table layout for external email delivery.</span></span><span>→</span></button><button className="flex items-center justify-between border border-black/15 p-5 text-left hover:border-[#ef5a35]" onClick={exportJson} type="button"><span><span className="font-serif text-2xl">Publication JSON</span><span className="mt-1 block text-[9px] text-black/40">Structured issue package for external publishing systems.</span></span><span>→</span></button></div>
              )}
            </div>
          </aside>
        </div>
      )}

      <aside className="editor-only fixed left-3 top-20 z-20 hidden max-h-[calc(100vh-6rem)] w-16 flex-col gap-2 overflow-y-auto 2xl:flex">
        {pages.map((sections, index) => <a className={`group relative grid h-20 place-items-center border bg-[#f8f5ed] text-[10px] font-bold shadow-sm ${activePage === index ? "border-[#ef5a35] text-[#ef5a35]" : "border-black/15 text-black/40"}`} draggable href={`#page-${index + 1}`} key={index} onClick={() => setActivePage(index)} onDragStart={() => { pageDragRef.current = index; }} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (pageDragRef.current !== null) movePage(pageDragRef.current, index); pageDragRef.current = null; }}><span>{index + 1}</span><span className="absolute bottom-1 text-[7px] font-normal">{sections.length} blocks</span></a>)}
        <button className="grid h-10 place-items-center border border-dashed border-black/20 bg-[#f8f5ed] text-[#ef5a35]" onClick={() => setPageMenuOpen(true)} title="Add page" type="button"><EditorIcon name="add" /></button>
      </aside>

      <main className={`mx-auto px-3 py-7 sm:px-6 md:py-12 ${sourceMode ? "max-w-[1680px]" : "max-w-[1040px]"}`}>
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
          {pages.map((sections, pageIndex) => (
            <article
              className="page relative"
              id={`page-${pageIndex + 1}`}
              key={pageIndex}
              onClick={() => setActivePage(pageIndex)}
            >
              <PageHeader page={pageIndex + 1} total={pages.length} />
              <button className="editor-only absolute right-6 top-16 z-20 rounded-full border border-black/15 bg-[#f8f5ed] px-3 py-1.5 text-[8px] font-bold uppercase tracking-[0.1em] text-black/45 hover:border-[#ef5a35] hover:text-[#ef5a35]" onClick={(event) => { event.stopPropagation(); removePage(pageIndex); }} type="button">Remove page</button>
              <div className="page-grid">
                {sections.map((section) => (
                  <BuilderBlock
                    isCoverPhoto={section.id === "campus-photo"}
                    issueId={issueId}
                    key={section.id}
                    onAi={rewriteSection}
                    onAction={blockAction}
                    onDragStart={(page, id) => {
                      dragged.current = { page, id };
                    }}
                    onDrop={dropBlock}
                    onEditCrossword={(id) => setCrosswordEditId(id)}
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
              <button className="add-page-section editor-only" onClick={() => { setActivePage(pageIndex); setLibraryOpen(true); }} type="button">
                + Add section to page {pageIndex + 1}
              </button>
            </article>
          ))}
          <button className="add-page-section editor-only bg-[#f8f5ed]" onClick={() => setPageMenuOpen(true)} type="button">+ Add another page</button>
          </div>
        </div>
      </main>

      {/* Crossword Builder Screen */}
      <CrosswordEditorModal
        initialData={
          pages
            .flat()
            .find((s) => s.id === crosswordEditId)?.content?.crossword ||
          DEFAULT_CAMPUS_MINI_CROSSWORD
        }
        isOpen={Boolean(crosswordEditId)}
        onClose={() => setCrosswordEditId(null)}
        onSave={handleSaveCrossword}
      />

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
        currentUserColor={userColor}
        currentUserId={myId}
        currentUserName={userName}
        isOpen={chatOpen}
        messages={chatMessages}
        onClose={() => setChatOpen(false)}
        onSendMessage={postChatMessage}
      />
    </div>
  );
}
