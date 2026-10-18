import { useEffect } from "react";
import { Link } from "react-router";
import BackIcon from "./BackIcon";
import BrandLogo from "./BrandLogo";

const RELEASE_VERSION = "2026-10-newspaper-mode";
const LAST_SEEN_KEY = "iow-release-notes-last-seen";

export const hasUnreadReleaseNotes = () => localStorage.getItem(LAST_SEEN_KEY) !== RELEASE_VERSION;

const releases = [
  {
    version: "October 2026",
    date: "October 18, 2026",
    label: "New design mode",
    title: "A newspaper edition, ready to edit",
    description: "Start a separate newspaper-style edition from the New newsletter picker. The new layout opens with a classic masthead and includes dedicated spaces for a lead story, campus news, opinion, events, and notices. Your existing newsletter issues keep their original design.",
    points: ["Three editable newspaper pages", "Traditional masthead, issue lines, and print-inspired hierarchy", "Available alongside the existing newsletter templates"],
  },
];

export default function ReleaseNotes() {
  useEffect(() => {
    localStorage.setItem(LAST_SEEN_KEY, RELEASE_VERSION);
  }, []);

  return (
    <div className="app-shell min-h-screen bg-[#eeece6] text-[#171714]">
      <header className="flex items-center justify-between border-b border-black/10 bg-[#f8f5ed] px-5 py-4 sm:px-8">
        <div className="flex items-center gap-4">
          <Link aria-label="Back to dashboard" className="grid h-9 w-9 place-items-center rounded-full border border-black/15 hover:bg-white" to="/" title="Back to dashboard"><BackIcon /></Link>
          <BrandLogo className="h-11 w-20" />
          <div><p className="font-serif text-xl italic">Release notes</p><p className="text-[8px] uppercase tracking-[0.16em] text-black/40">What’s new in In Other Words</p></div>
        </div>
        <span className="hidden text-[9px] font-bold uppercase tracking-[0.14em] text-[#3e6a59] sm:block">Product updates</span>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-16">
        <div className="mb-10 max-w-2xl">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">The newsroom, evolving</p>
          <h1 className="mt-3 font-serif text-5xl tracking-[-0.05em] sm:text-7xl">Fresh off the press.</h1>
          <p className="mt-5 text-sm leading-relaxed text-black/55">A running record of new tools and improvements for your editorial workspace.</p>
        </div>

        <div className="relative space-y-8 border-l border-black/15 pl-6 sm:pl-10">
          {releases.map((release) => (
            <article className="relative border border-black/10 bg-[#f8f5ed] p-6 sm:p-9" key={release.version}>
              <span className="absolute -left-[31px] top-8 h-3 w-3 rounded-full border-2 border-[#eeece6] bg-[#ef5a35] sm:-left-[46px]" />
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#ef5a35]">{release.version}</span>
                <span className="h-1 w-1 rounded-full bg-black/25" />
                <span className="text-[9px] text-black/40">{release.date}</span>
                <span className="ml-auto border border-black/15 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.1em]">{release.label}</span>
              </div>
              <h2 className="mt-5 max-w-3xl font-serif text-3xl leading-tight tracking-[-0.03em] sm:text-4xl">{release.title}</h2>
              <p className="mt-4 max-w-3xl text-xs leading-[1.8] text-black/60 sm:text-sm">{release.description}</p>
              <ul className="mt-6 grid gap-3 border-t border-black/10 pt-5 sm:grid-cols-3">
                {release.points.map((point) => <li className="flex gap-2 text-[10px] leading-relaxed text-black/65" key={point}><span className="text-[#ef5a35]">✳</span>{point}</li>)}
              </ul>
            </article>
          ))}
        </div>

        <Link className="mt-10 inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.12em] text-black/55 hover:text-[#ef5a35]" to="/">← Back to your newsroom</Link>
      </main>
    </div>
  );
}
