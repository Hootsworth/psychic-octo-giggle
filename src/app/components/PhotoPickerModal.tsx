import { useState, useMemo } from "react";

export interface StockPhoto {
  id: string;
  url: string;
  thumbnail: string;
  caption: string;
  credit: string;
  category: "Campus" | "Library" | "Architecture" | "Writing" | "Portraits";
}

export const CURATED_EDITORIAL_PHOTOS: StockPhoto[] = [
  {
    id: "campus-quad",
    url: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=85&w=1600",
    thumbnail: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?crop=entropy&cs=tinysrgb&fit=crop&w=400&h=300",
    caption: "Morning light over the historical campus quadrangle.",
    credit: "Photo by Vasily Kolotilov / Unsplash",
    category: "Campus",
  },
  {
    id: "library-stacks",
    url: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=85&w=1600",
    thumbnail: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?crop=entropy&cs=tinysrgb&fit=crop&w=400&h=300",
    caption: "Quiet hours inside the research collection stacks.",
    credit: "Photo by Susan Q Yin / Unsplash",
    category: "Library",
  },
  {
    id: "newspaper-press",
    url: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=85&w=1600",
    thumbnail: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?crop=entropy&cs=tinysrgb&fit=crop&w=400&h=300",
    caption: "Fresh off the cylinder presses before morning circulation.",
    credit: "Photo by Roman Kraft / Unsplash",
    category: "Writing",
  },
  {
    id: "typewriter-desk",
    url: "https://images.unsplash.com/photo-1455390582262-044cdead277a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=85&w=1600",
    thumbnail: "https://images.unsplash.com/photo-1455390582262-044cdead277a?crop=entropy&cs=tinysrgb&fit=crop&w=400&h=300",
    caption: "The student editor's draft station and revised manuscripts.",
    credit: "Photo by Patrick Fore / Unsplash",
    category: "Writing",
  },
  {
    id: "arch-facade",
    url: "https://images.unsplash.com/photo-1562774053-701939374585?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=85&w=1600",
    thumbnail: "https://images.unsplash.com/photo-1562774053-701939374585?crop=entropy&cs=tinysrgb&fit=crop&w=400&h=300",
    caption: "Gothic arches framing the central university courtyard.",
    credit: "Photo by Pang Yuhao / Unsplash",
    category: "Architecture",
  },
  {
    id: "student-reading",
    url: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=85&w=1600",
    thumbnail: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?crop=entropy&cs=tinysrgb&fit=crop&w=400&h=300",
    caption: "Independent study and term papers on the hall mezzanine.",
    credit: "Photo by Kimberly Farmer / Unsplash",
    category: "Campus",
  },
  {
    id: "coffee-notebook",
    url: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=85&w=1600",
    thumbnail: "https://images.unsplash.com/photo-1499750310107-5fef28a66643?crop=entropy&cs=tinysrgb&fit=crop&w=400&h=300",
    caption: "Early notes for the weekend column over espresso.",
    credit: "Photo by Andrew Neel / Unsplash",
    category: "Writing",
  },
  {
    id: "student-discussion",
    url: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=85&w=1600",
    thumbnail: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?crop=entropy&cs=tinysrgb&fit=crop&w=400&h=300",
    caption: "Editorial board debate regarding the upcoming issue theme.",
    credit: "Photo by Priscilla Du Preez / Unsplash",
    category: "Portraits",
  },
  {
    id: "lecture-hall",
    url: "https://images.unsplash.com/photo-1576495199011-eb94736d05d6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=85&w=1600",
    thumbnail: "https://images.unsplash.com/photo-1576495199011-eb94736d05d6?crop=entropy&cs=tinysrgb&fit=crop&w=400&h=300",
    caption: "The grand lecture amphitheater before morning assembly.",
    credit: "Photo by Good Free Photos / Unsplash",
    category: "Architecture",
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
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [customUrl, setCustomUrl] = useState("");
  const [customCaption, setCustomCaption] = useState("");
  const [customCredit, setCustomCredit] = useState("");

  const filteredPhotos = useMemo(() => {
    return CURATED_EDITORIAL_PHOTOS.filter((p) => {
      const matchesCategory =
        selectedCategory === "All" || p.category === selectedCategory;
      const matchesQuery =
        !search.trim() ||
        p.caption.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());
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

  const categories = ["All", "Campus", "Library", "Architecture", "Writing", "Portraits"];

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="my-8 w-full max-w-4xl rounded-2xl border border-black/15 bg-[#f8f5ed] p-6 shadow-2xl sm:p-8 dark:border-white/15 dark:bg-[#1a1916] dark:text-[#f3f0e8]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-black/10 pb-4 dark:border-white/10">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">
              Editorial Photo Archive
            </span>
            <h2 className="mt-1 font-serif text-3xl font-bold tracking-tight">
              Curated Photography
            </h2>
            <p className="mt-1 text-xs text-black/55 dark:text-white/60">
              Select high-resolution royalty-free imagery or provide your own web URL.
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

        {/* Filter Bar */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map((cat) => (
              <button
                className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                  selectedCategory === cat
                    ? "bg-[#171714] text-white dark:bg-white dark:text-black"
                    : "border border-black/15 bg-white/70 text-black/60 hover:bg-white dark:border-white/15 dark:bg-[#20201d] dark:text-white/60"
                }`}
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                type="button"
              >
                {cat}
              </button>
            ))}
          </div>

          <input
            className="rounded-full border border-black/15 bg-white/80 px-3.5 py-1.5 text-xs text-black placeholder-black/40 outline-none focus:border-[#ef5a35] dark:border-white/15 dark:bg-[#20201d] dark:text-white sm:w-60"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search keywords or captions…"
            type="text"
            value={search}
          />
        </div>

        {/* Photo Grid */}
        <div className="mt-5 grid grid-cols-2 gap-4 max-h-96 overflow-y-auto p-1 sm:grid-cols-3">
          {filteredPhotos.map((photo) => (
            <div
              className="group cursor-pointer overflow-hidden rounded-xl border border-black/15 bg-white text-left transition hover:-translate-y-0.5 hover:border-[#ef5a35] hover:shadow-lg dark:border-white/15 dark:bg-[#20201d]"
              key={photo.id}
              onClick={() => {
                onSelect(photo.url, photo.caption, photo.credit);
                onClose();
              }}
            >
              <div className="relative aspect-[1.35] overflow-hidden bg-black/10">
                <img
                  alt={photo.caption}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  loading="lazy"
                  src={photo.thumbnail}
                />
                <span className="absolute bottom-2 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[8.5px] font-semibold text-white backdrop-blur-xs">
                  {photo.category}
                </span>
              </div>
              <div className="p-3">
                <p className="line-clamp-2 font-serif text-xs leading-snug text-black/85 dark:text-white/90">
                  {photo.caption}
                </p>
                <p className="mt-1 truncate font-mono text-[9px] text-black/45 dark:text-white/45">
                  {photo.credit}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Custom Web URL Entry */}
        <form
          className="mt-6 rounded-xl border border-dashed border-black/20 bg-white/50 p-4 dark:border-white/20 dark:bg-[#20201d]/60"
          onSubmit={handleCustomSubmit}
        >
          <span className="block font-mono text-[9px] font-bold uppercase tracking-wider text-black/60 dark:text-white/60 mb-2">
            Or Paste Custom Image URL
          </span>
          <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
            <input
              className="rounded-lg border border-black/15 bg-white px-3 py-1.5 text-xs text-black outline-none focus:border-[#ef5a35] dark:border-white/15 dark:bg-black/30 dark:text-white"
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://example.com/photo.jpg"
              type="url"
              value={customUrl}
            />
            <input
              className="rounded-lg border border-black/15 bg-white px-3 py-1.5 text-xs text-black outline-none focus:border-[#ef5a35] dark:border-white/15 dark:bg-black/30 dark:text-white"
              onChange={(e) => setCustomCaption(e.target.value)}
              placeholder="Optional caption"
              type="text"
              value={customCaption}
            />
            <input
              className="rounded-lg border border-black/15 bg-white px-3 py-1.5 text-xs text-black outline-none focus:border-[#ef5a35] dark:border-white/15 dark:bg-black/30 dark:text-white"
              onChange={(e) => setCustomCredit(e.target.value)}
              placeholder="Photo credit"
              type="text"
              value={customCredit}
            />
            <button
              className="rounded-lg bg-[#ef5a35] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#d44826] transition disabled:opacity-50"
              disabled={!customUrl.trim()}
              type="submit"
            >
              Apply
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
