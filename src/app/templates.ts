export type TemplateSection = {
  id: string;
  type: "cover" | "heading" | "article" | "photo" | "poem" | "quote" | "events" | "gossip" | "gallery" | "notice" | "divider" | "footer" | "interview" | "statistics" | "timeline" | "recommendations" | "audio" | "poll" | "crossword" | "sudoku" | "wordsearch" | "textBox" | "shapeBox" | "imageBox";
  width: number;
  height: "compact" | "regular" | "tall";
  content?: object;
};

export type NewsletterTemplate = {
  id: string;
  name: string;
  description: string;
  category: string;
  accent: string;
  preview: "editorial" | "literary" | "events" | "research" | "blank";
  pages: [TemplateSection[], TemplateSection[], TemplateSection[]];
};

export const newsletterTemplates: NewsletterTemplate[] = [
  {
    id: "daily-newspaper",
    name: "Newspaper Edition",
    description: "A traditional broadsheet layout with masthead, front-page lead, news columns, and a classifieds strip.",
    category: "Newspaper mode",
    accent: "#20201d",
    preview: "editorial",
    pages: [
      [
        { id: "paper-masthead", type: "cover", width: 12, height: "regular" },
        { id: "paper-lead-photo", type: "photo", width: 12, height: "tall" },
        { id: "paper-lead-story", type: "article", width: 8, height: "tall" },
        { id: "paper-quick-briefs", type: "notice", width: 4, height: "tall" },
        { id: "paper-front-quote", type: "quote", width: 12, height: "compact" },
      ],
      [
        { id: "paper-news-heading", type: "heading", width: 12, height: "compact" },
        { id: "paper-campus-news", type: "article", width: 6, height: "tall" },
        { id: "paper-community-news", type: "article", width: 6, height: "tall" },
        { id: "paper-interview", type: "interview", width: 8, height: "regular" },
        { id: "paper-by-numbers", type: "statistics", width: 4, height: "regular" },
      ],
      [
        { id: "paper-weekend-heading", type: "heading", width: 12, height: "compact" },
        { id: "paper-events", type: "events", width: 8, height: "tall" },
        { id: "paper-notices", type: "notice", width: 4, height: "tall" },
        { id: "paper-opinion", type: "article", width: 8, height: "regular" },
        { id: "paper-crossword", type: "poem", width: 4, height: "regular" },
        { id: "paper-footer", type: "footer", width: 12, height: "compact" },
      ],
    ],
  },
  {
    id: "campus-weekly",
    name: "Campus Weekly",
    description: "A balanced issue for news, student voices, events, and photographs.",
    category: "General edition",
    accent: "#ef5a35",
    preview: "editorial",
    pages: [
      [
        { id: "cover", type: "cover", width: 12, height: "regular" },
        { id: "campus-photo", type: "photo", width: 12, height: "tall" },
        { id: "opening-article", type: "article", width: 12, height: "regular" },
      ],
      [
        { id: "voices-heading", type: "heading", width: 12, height: "compact" },
        { id: "featured-poem", type: "poem", width: 8, height: "tall" },
        { id: "submissions", type: "notice", width: 4, height: "tall" },
        { id: "fiction", type: "article", width: 12, height: "regular" },
      ],
      [
        { id: "wire-heading", type: "heading", width: 12, height: "compact" },
        { id: "weekly-events", type: "events", width: 8, height: "tall" },
        { id: "club-gossip", type: "gossip", width: 4, height: "tall" },
        { id: "week-gallery", type: "gallery", width: 12, height: "regular" },
        { id: "closing", type: "footer", width: 12, height: "compact" },
      ],
    ],
  },
  {
    id: "literary-review",
    name: "Literary Review",
    description: "A spacious journal for poetry, fiction, essays, and student artwork.",
    category: "Arts & literature",
    accent: "#7d5a87",
    preview: "literary",
    pages: [
      [
        { id: "lit-cover", type: "cover", width: 12, height: "tall" },
        { id: "lit-quote", type: "quote", width: 12, height: "regular" },
      ],
      [
        { id: "lit-heading", type: "heading", width: 12, height: "compact" },
        { id: "lit-poem-a", type: "poem", width: 6, height: "tall" },
        { id: "lit-poem-b", type: "poem", width: 6, height: "tall" },
        { id: "lit-art", type: "photo", width: 12, height: "regular" },
      ],
      [
        { id: "lit-divider", type: "divider", width: 12, height: "compact" },
        { id: "lit-story", type: "article", width: 8, height: "tall" },
        { id: "lit-submit", type: "notice", width: 4, height: "tall" },
        { id: "lit-footer", type: "footer", width: 12, height: "compact" },
      ],
    ],
  },
  {
    id: "clubs-events",
    name: "Clubs & Events",
    description: "A lively noticeboard for societies, fixtures, events, and campus talk.",
    category: "Campus life",
    accent: "#315b75",
    preview: "events",
    pages: [
      [
        { id: "events-cover", type: "cover", width: 12, height: "regular" },
        { id: "events-main", type: "events", width: 8, height: "tall" },
        { id: "events-notice", type: "notice", width: 4, height: "tall" },
      ],
      [
        { id: "clubs-heading", type: "heading", width: 12, height: "compact" },
        { id: "clubs-gallery", type: "gallery", width: 12, height: "tall" },
        { id: "clubs-gossip", type: "gossip", width: 6, height: "regular" },
        { id: "clubs-quote", type: "quote", width: 6, height: "regular" },
      ],
      [
        { id: "week-heading", type: "heading", width: 12, height: "compact" },
        { id: "week-events", type: "events", width: 12, height: "tall" },
        { id: "week-photo", type: "photo", width: 12, height: "regular" },
        { id: "events-footer", type: "footer", width: 12, height: "compact" },
      ],
    ],
  },
  {
    id: "research-digest",
    name: "Research Digest",
    description: "A clear academic edition for projects, discoveries, and faculty interviews.",
    category: "Academic",
    accent: "#3e6a59",
    preview: "research",
    pages: [
      [
        { id: "research-cover", type: "cover", width: 12, height: "regular" },
        { id: "research-photo", type: "photo", width: 12, height: "tall" },
        { id: "research-summary", type: "article", width: 12, height: "regular" },
      ],
      [
        { id: "discoveries-heading", type: "heading", width: 12, height: "compact" },
        { id: "research-a", type: "article", width: 6, height: "tall" },
        { id: "research-b", type: "article", width: 6, height: "tall" },
        { id: "research-quote", type: "quote", width: 12, height: "regular" },
      ],
      [
        { id: "research-notes", type: "heading", width: 12, height: "compact" },
        { id: "research-c", type: "article", width: 8, height: "tall" },
        { id: "research-notice", type: "notice", width: 4, height: "tall" },
        { id: "research-footer", type: "footer", width: 12, height: "compact" },
      ],
    ],
  },
  {
    id: "signal-noise",
    name: "Signal & Noise",
    description: "A bold, asymmetric edition for opinion, experiments, interviews, and cultural criticism.",
    category: "Creative editorial",
    accent: "#d94a2f",
    preview: "editorial",
    pages: [
      [
        { id: "signal-cover", type: "cover", width: 8, height: "tall" },
        { id: "signal-quote", type: "quote", width: 4, height: "tall" },
        { id: "signal-divider", type: "divider", width: 12, height: "compact" },
        { id: "signal-interview", type: "interview", width: 12, height: "regular" },
      ],
      [
        { id: "signal-heading", type: "heading", width: 12, height: "compact" },
        { id: "signal-stats", type: "statistics", width: 5, height: "regular" },
        { id: "signal-story", type: "article", width: 7, height: "regular" },
        { id: "signal-photo", type: "photo", width: 12, height: "tall" },
      ],
      [
        { id: "signal-recs", type: "recommendations", width: 8, height: "tall" },
        { id: "signal-notice", type: "notice", width: 4, height: "tall" },
        { id: "signal-footer", type: "footer", width: 12, height: "compact" },
      ],
    ],
  },
  {
    id: "campus-collage",
    name: "Campus Collage",
    description: "An image-led scrapbook for campus culture, people, places, and spontaneous moments.",
    category: "Visual edition",
    accent: "#b98a2e",
    preview: "events",
    pages: [
      [
        { id: "collage-cover", type: "cover", width: 12, height: "regular" },
        { id: "collage-gallery", type: "gallery", width: 12, height: "tall" },
        { id: "collage-quote", type: "quote", width: 12, height: "compact" },
      ],
      [
        { id: "collage-heading", type: "heading", width: 12, height: "compact" },
        { id: "collage-photo-a", type: "photo", width: 5, height: "tall" },
        { id: "collage-interview", type: "interview", width: 7, height: "tall" },
        { id: "collage-gossip", type: "gossip", width: 12, height: "regular" },
      ],
      [
        { id: "collage-timeline", type: "timeline", width: 7, height: "tall" },
        { id: "collage-recs", type: "recommendations", width: 5, height: "tall" },
        { id: "collage-footer", type: "footer", width: 12, height: "compact" },
      ],
    ],
  },
  {
    id: "after-hours",
    name: "After Hours",
    description: "A dramatic arts-and-culture issue for performances, nightlife, music, and late ideas.",
    category: "Arts & culture",
    accent: "#6f52a2",
    preview: "literary",
    pages: [
      [
        { id: "after-cover", type: "cover", width: 12, height: "tall" },
        { id: "after-events", type: "events", width: 7, height: "regular" },
        { id: "after-quote", type: "quote", width: 5, height: "regular" },
      ],
      [
        { id: "after-heading", type: "heading", width: 12, height: "compact" },
        { id: "after-poem", type: "poem", width: 5, height: "tall" },
        { id: "after-interview", type: "interview", width: 7, height: "tall" },
        { id: "after-gallery", type: "gallery", width: 12, height: "regular" },
      ],
      [
        { id: "after-recs", type: "recommendations", width: 6, height: "tall" },
        { id: "after-timeline", type: "timeline", width: 6, height: "tall" },
        { id: "after-footer", type: "footer", width: 12, height: "compact" },
      ],
    ],
  },
  {
    id: "blank",
    name: "Blank Newsletter",
    description: "Three empty pages. Build your own reusable format from the section library.",
    category: "Start from scratch",
    accent: "#171714",
    preview: "blank",
    pages: [[], [], []],
  },
];

export function cloneTemplatePages(templateId: string) {
  const template = [...newsletterTemplates, ...loadCustomTemplates()].find((item) => item.id === templateId) ?? newsletterTemplates[0];
  return JSON.parse(JSON.stringify(template.pages)) as NewsletterTemplate["pages"];
}

export function loadCustomTemplates(): NewsletterTemplate[] {
  try {
    return JSON.parse(localStorage.getItem("iow-custom-templates") ?? "[]");
  } catch {
    return [];
  }
}

export function saveCustomTemplate(template: NewsletterTemplate) {
  const templates = loadCustomTemplates();
  localStorage.setItem(
    "iow-custom-templates",
    JSON.stringify([template, ...templates.filter((item) => item.id !== template.id)]),
  );
}
