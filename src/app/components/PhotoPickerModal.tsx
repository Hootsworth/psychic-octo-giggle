import { useState, useMemo } from "react";

export interface StockPhoto {
  id: string;
  plate: string;
  url: string;
  thumbnail: string;
  caption: string;
  credit: string;
  category:
    | "Broadsheet & Print"
    | "Journal & Study"
    | "Archival & Library"
    | "Campus Reportage"
    | "Monochrome 35mm";
  tone: string;
}

export const CURATED_EDITORIAL_PHOTOS: StockPhoto[] = [
  {
    id: "broadsheet-coffee",
    plate: "PLATE 01",
    url: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=85&w=1600",
    thumbnail: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?crop=entropy&cs=tinysrgb&fit=crop&w=480&h=340",
    caption: "Morning broadsheet edition and espresso at the student union kiosk.",
    credit: "Photo by Roman Kraft / Unsplash",
    category: "Broadsheet & Print",
    tone: "Matte Print",
  },
  {
    id: "lead-typesetting",
    plate: "PLATE 02",
    url: "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=85&w=1600",
    thumbnail: "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?crop=entropy&cs=tinysrgb&fit=crop&w=480&h=340",
    caption: "Movable lead type drawer in the campus print guild workshop.",
    credit: "Photo by Bank Phrom / Unsplash",
    category: "Broadsheet & Print",
    tone: "Letterpress",
  },
  {
    id: "folded-gazette",
    plate: "PLATE 03",
    url: "https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=85&w=1600",
    thumbnail: "https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?crop=entropy&cs=tinysrgb&fit=crop&w=480&h=340",
    caption: "Folded newsprint broadsides awaiting dawn postal distribution.",
    credit: "Photo by Mr Mockup / Unsplash",
    category: "Broadsheet & Print",
    tone: "Newsprint",
  },
  {
    id: "bound-journal-light",
    plate: "PLATE 04",
    url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=85&w=1600",
    thumbnail: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?crop=entropy&cs=tinysrgb&fit=crop&w=480&h=340",
    caption: "Open clothbound reader on oak writing desk in late afternoon light.",
    credit: "Photo by Aaron Burden / Unsplash",
    category: "Journal & Study",
    tone: "Natural Warm",
  },
  {
    id: "editorial-typewriter",
    plate: "PLATE 05",
    url: "https://images.unsplash.com/photo-1455390582262-044cdead277a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=85&w=1600",
    thumbnail: "https://images.unsplash.com/photo-1455390582262-044cdead277a?crop=entropy&cs=tinysrgb&fit=crop&w=480&h=340",
    caption: "Drafting station with manual typewriter and revised page proofs.",
    credit: "Photo by Patrick Fore / Unsplash",
    category: "Journal & Study",
    tone: "Tactile Paper",
  },
  {
    id: "botanical-pages",
    plate: "PLATE 06",
    url: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=85&w=1600",
    thumbnail: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?crop=entropy&cs=tinysrgb&fit=crop&w=480&h=340",
    caption: "Pressed herbarium specimens pressed between vintage literary leaves.",
    credit: "Photo by Joanna Kosinska / Unsplash",
    category: "Journal & Study",
    tone: "Matte Grain",
  },
  {
    id: "reading-room-skylight",
    plate: "PLATE 07",
    url: "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=85&w=1600",
    thumbnail: "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?crop=entropy&cs=tinysrgb&fit=crop&w=480&h=340",
    caption: "Diffused northern skylight pouring across neoclassical reading desks.",
    credit: "Photo by Mick Haupt / Unsplash",
    category: "Archival & Library",
    tone: "Architectural",
  },
  {
    id: "historic-book-stacks",
    plate: "PLATE 08",
    url: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=85&w=1600",
    thumbnail: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?crop=entropy&cs=tinysrgb&fit=crop&w=480&h=340",
    caption: "Quiet research collection stacks spanning three vertical tiers.",
    credit: "Photo by Susan Q Yin / Unsplash",
    category: "Archival & Library",
    tone: "Rich Walnut",
  },
  {
    id: "bankers-lamp-carrel",
    plate: "PLATE 09",
    url: "https://images.unsplash.com/photo-1568667256549-094345857637?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=85&w=1600",
    thumbnail: "https://images.unsplash.com/photo-1568667256549-094345857637?crop=entropy&cs=tinysrgb&fit=crop&w=480&h=340",
    caption: "Green glass banker's lamp illuminating evening archival reference study.",
    credit: "Photo by Giammarco Boscaro / Unsplash",
    category: "Archival & Library",
    tone: "Archival Shadow",
  },
  {
    id: "student-editors-collab",
    plate: "PLATE 10",
    url: "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=85&w=1600",
    thumbnail: "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?crop=entropy&cs=tinysrgb&fit=crop&w=480&h=340",
    caption: "Editorial collective reviewing publication spreads and article galleys.",
    credit: "Photo by Eliott Reyna / Unsplash",
    category: "Campus Reportage",
    tone: "35mm Grain",
  },
  {
    id: "quad-sycamore-reader",
    plate: "PLATE 11",
    url: "https://images.unsplash.com/photo-1491841573634-28140fc7ced7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=85&w=1600",
    thumbnail: "https://images.unsplash.com/photo-1491841573634-28140fc7ced7?crop=entropy&cs=tinysrgb&fit=crop&w=480&h=340",
    caption: "Quiet midday reading hour under dappled sycamore shade on the lawn.",
    credit: "Photo by Joshua Hoehne / Unsplash",
    category: "Campus Reportage",
    tone: "Documentary",
  },
  {
    id: "stone-steps-discussion",
    plate: "PLATE 12",
    url: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=85&w=1600",
    thumbnail: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?crop=entropy&cs=tinysrgb&fit=crop&w=480&h=340",
    caption: "Seminar discussion continuing down the limestone steps of Old College.",
    credit: "Photo by Brooke Cagle / Unsplash",
    category: "Campus Reportage",
    tone: "Candid 35mm",
  },
  {
    id: "monochrome-cloister-reader",
    plate: "PLATE 13",
    url: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=85&w=1600",
    thumbnail: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?crop=entropy&cs=tinysrgb&fit=crop&w=480&h=340",
    caption: "Monochrome study: Solitary scholar beneath towering cloister vaulting.",
    credit: "Photo by Jaredd Craig / Unsplash",
    category: "Monochrome 35mm",
    tone: "Silver Gelatin",
  },
  {
    id: "film-negatives-rangefinder",
    plate: "PLATE 14",
    url: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=85&w=1600",
    thumbnail: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?crop=entropy&cs=tinysrgb&fit=crop&w=480&h=340",
    caption: "Mechanical film rangefinder, negative sleeve, and darkroom test print.",
    credit: "Photo by Alexander Andrews / Unsplash",
    category: "Monochrome 35mm",
    tone: "Contact Sheet",
  },
  {
    id: "morning-transit-gazette",
    plate: "PLATE 15",
    url: "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=85&w=1600",
    thumbnail: "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?crop=entropy&cs=tinysrgb&fit=crop&w=480&h=340",
    caption: "Commuter in transit engrossed in the morning political broadsheet.",
    credit: "Photo by Jonas Leupe / Unsplash",
    category: "Monochrome 35mm",
    tone: "Photojournalism",
  },
];

interface PhotoPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string, caption?: string, credit?: string) => void;
}

export default function PhotoPickerModal({
  isOpen,
  onClose,
  onSelect,
}: PhotoPickerModalProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All Plates");
  const [customUrl, setCustomUrl] = useState("");
  const [customCaption, setCustomCaption] = useState("");
  const [customCredit, setCustomCredit] = useState("");

  const filteredPhotos = useMemo(() => {
    return CURATED_EDITORIAL_PHOTOS.filter((p) => {
      const matchesCategory =
        selectedCategory === "All Plates" || p.category === selectedCategory;
      const matchesQuery =
        !search.trim() ||
        p.caption.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase()) ||
        p.plate.toLowerCase().includes(search.toLowerCase()) ||
        p.tone.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [search, selectedCategory]);

  if (!isOpen) return null;

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    onSelect(
      customUrl.trim(),
      customCaption.trim() || undefined,
      customCredit.trim() || undefined
    );
    onClose();
  };

  const categories = [
    "All Plates",
    "Broadsheet & Print",
    "Journal & Study",
    "Archival & Library",
    "Campus Reportage",
    "Monochrome 35mm",
  ];

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="my-8 w-full max-w-5xl rounded-xl border border-black/20 bg-[#f8f5ed] p-6 shadow-2xl sm:p-8 dark:border-white/20 dark:bg-[#1a1916] dark:text-[#f3f0e8]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Editorial Header */}
        <div className="flex items-start justify-between border-b border-black/15 pb-4 dark:border-white/15">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#ef5a35]" />
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-[#ef5a35]">
                Archival Press Collection · Vol. 08
              </span>
            </div>
            <h2 className="mt-1 font-serif text-3xl font-bold tracking-tight text-[#171714] dark:text-[#f3f0e8]">
              Curated Photography
            </h2>
            <p className="mt-1 font-serif text-xs italic text-black/60 dark:text-white/60">
              Authentic 35mm documentary reportage, printroom artifacts, and tactile journal plates.
            </p>
          </div>
          <button
            aria-label="Close photo archive"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-xl text-black/50 hover:bg-black/5 hover:text-black dark:border-white/10 dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white transition"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-black/10 pb-4 dark:border-white/10">
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  className={`rounded-md px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-wider transition ${
                    isSelected
                      ? "bg-[#171714] text-white shadow-xs dark:bg-white dark:text-black"
                      : "border border-black/15 bg-white/60 text-black/65 hover:border-black/30 hover:bg-white dark:border-white/15 dark:bg-[#20201d] dark:text-white/65 dark:hover:bg-[#282723]"
                  }`}
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  type="button"
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <div className="relative">
            <input
              className="rounded-md border border-black/15 bg-white/80 px-3 py-1 font-mono text-xs text-black placeholder-black/40 outline-none focus:border-[#ef5a35] dark:border-white/15 dark:bg-[#20201d] dark:text-white sm:w-56"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search plates & captions…"
              type="text"
              value={search}
            />
          </div>
        </div>

        {/* Editorial Photo Grid */}
        <div className="mt-5 grid grid-cols-1 gap-4 max-h-[480px] overflow-y-auto p-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPhotos.map((photo) => (
            <article
              className="group cursor-pointer overflow-hidden rounded-lg border border-black/15 bg-white text-left transition hover:border-[#ef5a35] hover:shadow-md dark:border-white/15 dark:bg-[#20201d]"
              key={photo.id}
              onClick={() => {
                onSelect(photo.url, photo.caption, photo.credit);
                onClose();
              }}
            >
              {/* Photo Frame */}
              <div className="relative aspect-[1.38] overflow-hidden bg-[#e8e4da] dark:bg-[#252420]">
                <img
                  alt={photo.caption}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  loading="lazy"
                  src={photo.thumbnail}
                  style={{
                    filter: "contrast(0.97) brightness(1.01) saturate(0.93)",
                  }}
                />
                {/* Plate Stamp Tag */}
                <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded-sm bg-[#171714]/85 px-1.5 py-0.5 text-white shadow-xs backdrop-blur-xs">
                  <span className="font-mono text-[8px] font-bold tracking-widest text-[#ef5a35]">
                    {photo.plate}
                  </span>
                </div>
                <div className="absolute bottom-2 right-2 rounded-sm bg-white/90 px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-wider text-black/75 shadow-xs backdrop-blur-xs dark:bg-black/80 dark:text-white/80">
                  {photo.tone}
                </div>
              </div>

              {/* Photo Caption & Metadata */}
              <div className="p-3.5">
                <p className="line-clamp-2 font-serif text-xs leading-snug text-[#171714] dark:text-[#f3f0e8]">
                  {photo.caption}
                </p>
                <div className="mt-2.5 flex items-center justify-between border-t border-black/10 pt-2 dark:border-white/10">
                  <span className="truncate font-mono text-[8.5px] uppercase tracking-wider text-black/45 dark:text-white/45">
                    {photo.credit}
                  </span>
                  <span className="shrink-0 font-mono text-[8.5px] font-bold uppercase tracking-wider text-[#ef5a35] opacity-0 transition-opacity group-hover:opacity-100">
                    Use Plate →
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Custom Web URL Entry */}
        <form
          className="mt-6 rounded-lg border border-dashed border-black/25 bg-[#faf8f4] p-4 dark:border-white/20 dark:bg-[#20201d]/60"
          onSubmit={handleCustomSubmit}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-black/70 dark:text-white/70">
              Direct Press Dispatch · Custom Web Image URL
            </span>
            <span className="font-mono text-[8.5px] text-black/40 dark:text-white/40">
              HTTPS image link
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
            <input
              className="rounded-md border border-black/15 bg-white px-3 py-1.5 font-mono text-xs text-black outline-none focus:border-[#ef5a35] dark:border-white/15 dark:bg-black/30 dark:text-white"
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://example.com/editorial-photo.jpg"
              type="url"
              value={customUrl}
            />
            <input
              className="rounded-md border border-black/15 bg-white px-3 py-1.5 font-serif text-xs text-black outline-none focus:border-[#ef5a35] dark:border-white/15 dark:bg-black/30 dark:text-white"
              onChange={(e) => setCustomCaption(e.target.value)}
              placeholder="Custom caption"
              type="text"
              value={customCaption}
            />
            <input
              className="rounded-md border border-black/15 bg-white px-3 py-1.5 font-mono text-xs text-black outline-none focus:border-[#ef5a35] dark:border-white/15 dark:bg-black/30 dark:text-white"
              onChange={(e) => setCustomCredit(e.target.value)}
              placeholder="Photo credit"
              type="text"
              value={customCredit}
            />
            <button
              className="rounded-md bg-[#ef5a35] px-4 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white hover:bg-[#d44826] transition disabled:opacity-40"
              disabled={!customUrl.trim()}
              type="submit"
            >
              Apply Plate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
