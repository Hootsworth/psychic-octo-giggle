import { Link } from "react-router";
import { loadWorkspace } from "./store";
import BrandLogo from "./BrandLogo";

export default function Archive() {
  const issues = loadWorkspace().issues;
  return (
    <div className="app-shell min-h-screen bg-[#f8f5ed] text-[#171714]">
      <header className="flex items-center justify-between border-b border-black px-5 py-6 sm:px-10">
        <Link aria-label="In Other Words home" to="/"><BrandLogo className="h-16 w-32 object-left" priority /></Link>
        <div className="flex items-center gap-5 text-[9px] font-bold uppercase tracking-[0.14em]"><span className="hidden sm:block">The University Edition</span><Link to="/publishing">Publishing desk</Link></div>
      </header>
      <main>
        <section className="border-b border-black px-5 py-16 sm:px-10 sm:py-24">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">Public archive</p>
          <h1 className="mt-5 max-w-5xl font-serif text-[clamp(4.5rem,12vw,10rem)] leading-[0.75] tracking-[-0.07em]">Every issue, in other words.</h1>
          <p className="mt-10 max-w-md text-sm leading-relaxed text-black/55">Student stories, campus events, literature, photography, and the conversations that shape our university.</p>
        </section>
        <section className="grid sm:grid-cols-2 lg:grid-cols-3">
          {issues.map((issue, index) => <article className="group min-h-[420px] border-b border-r border-black p-7 sm:p-10" key={issue.id}><div className="flex justify-between text-[9px] font-bold uppercase tracking-[0.13em] text-black/40"><span>Issue {String(issues.length - index).padStart(2, "0")}</span><span>{issue.status}</span></div><div className="flex h-full flex-col justify-end pb-10"><p className="mb-4 text-[9px] font-bold uppercase tracking-[0.14em] text-[#ef5a35]">{issue.week}</p><h2 className="font-serif text-4xl leading-[0.95] tracking-[-0.04em]">{issue.title}</h2><Link className="mt-7 text-[9px] font-bold uppercase tracking-[0.12em] group-hover:text-[#ef5a35]" to={`/editor/${issue.id}`}>Read edition →</Link></div></article>)}
        </section>
      </main>
      <footer className="bg-[#171714] px-5 py-12 text-white sm:px-10"><div className="flex flex-wrap items-end justify-between gap-8"><h2 className="max-w-lg font-serif text-5xl leading-[0.9]">Made on campus, for everyone on campus.</h2><p className="text-[9px] uppercase tracking-[0.15em] text-white/40">© 2025 In Other Words</p></div></footer>
    </div>
  );
}
