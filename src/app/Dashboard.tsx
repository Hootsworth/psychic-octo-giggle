import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  cloneIssueDocument,
  initWorkspaceRealtimeSync,
  loadWorkspace,
  makeId,
  removeIssueDocument,
  saveWorkspace,
  type Issue,
  type Workspace,
} from "./store";
import { cloneTemplatePages, loadCustomTemplates, newsletterTemplates, type NewsletterTemplate } from "./templates";
import { useAuth } from "./AuthContext";
import BrandLogo from "./BrandLogo";

const colors = ["#ef5a35", "#3e6a59", "#7d5a87", "#c19639", "#315b75"];

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace>(loadWorkspace);

  useEffect(() => {
    const handleWorkspaceChange = () => {
      setWorkspace(loadWorkspace());
    };
    window.addEventListener("iow-workspace-change", handleWorkspaceChange);
    initWorkspaceRealtimeSync(setWorkspace);
    return () => {
      window.removeEventListener("iow-workspace-change", handleWorkspaceChange);
    };
  }, []);

  const [view, setView] = useState("all");
  const [folderName, setFolderName] = useState("");
  const [search, setSearch] = useState("");
  const [templateOpen, setTemplateOpen] = useState(false);
  const availableTemplates = [...newsletterTemplates, ...loadCustomTemplates()];

  const commit = (next: Workspace) => {
    setWorkspace(next);
    saveWorkspace(next);
  };

  const createIssue = (template: NewsletterTemplate) => {
    const id = makeId("issue");
    const issue: Issue = {
      id,
      title: template.id === "blank" ? "Untitled university edition" : `New ${template.name}`,
      week: new Intl.DateTimeFormat("en", { month: "long", day: "numeric", year: "numeric" }).format(new Date()),
      status: "draft",
      folderId: view.startsWith("folder:") ? view.slice(7) : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(`iow-layout-${id}`, JSON.stringify(cloneTemplatePages(template.id)));
    commit({ ...workspace, issues: [issue, ...workspace.issues] });
    setTemplateOpen(false);
    window.location.href = `/editor/${id}`;
  };

  const createFolder = () => {
    const name = folderName.trim();
    if (!name) return;
    const id = makeId("folder");
    commit({
      ...workspace,
      folders: [
        ...workspace.folders,
        { id, name, color: colors[workspace.folders.length % colors.length], createdAt: new Date().toISOString() },
      ],
    });
    setFolderName("");
    setView(`folder:${id}`);
  };

  const renameFolder = (id: string) => {
    const folder = workspace.folders.find((item) => item.id === id);
    const name = window.prompt("Rename folder", folder?.name)?.trim();
    if (!name) return;
    commit({
      ...workspace,
      folders: workspace.folders.map((item) => (item.id === id ? { ...item, name } : item)),
    });
  };

  const deleteFolder = (id: string) => {
    if (!window.confirm("Delete this folder? Its newsletters will move to All newsletters.")) return;
    commit({
      folders: workspace.folders.filter((folder) => folder.id !== id),
      issues: workspace.issues.map((issue) => (issue.folderId === id ? { ...issue, folderId: null } : issue)),
    });
    setView("all");
  };

  const duplicateIssue = (issue: Issue) => {
    const id = makeId("issue");
    const copy = {
      ...issue,
      id,
      title: `${issue.title} — Copy`,
      status: "draft" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    cloneIssueDocument(issue.id, id);
    commit({ ...workspace, issues: [copy, ...workspace.issues] });
  };

  const renameIssue = (issue: Issue) => {
    const title = window.prompt("Rename newsletter", issue.title)?.trim();
    if (!title) return;
    commit({
      ...workspace,
      issues: workspace.issues.map((item) =>
        item.id === issue.id
          ? { ...item, title, updatedAt: new Date().toISOString() }
          : item,
      ),
    });
  };

  const deleteIssue = (issue: Issue) => {
    if (!window.confirm(`Delete “${issue.title}”? This cannot be undone.`)) return;
    removeIssueDocument(issue.id);
    commit({ ...workspace, issues: workspace.issues.filter((item) => item.id !== issue.id) });
  };

  const moveIssue = (issueId: string, folderId: string) => {
    commit({
      ...workspace,
      issues: workspace.issues.map((issue) =>
        issue.id === issueId
          ? { ...issue, folderId: folderId || null, updatedAt: new Date().toISOString() }
          : issue,
      ),
    });
  };

  const issues = useMemo(() => {
    const query = search.toLowerCase();
    return workspace.issues.filter((issue) => {
      const matchesSearch = `${issue.title} ${issue.week}`.toLowerCase().includes(query);
      if (!matchesSearch) return false;
      if (view === "drafts") return issue.status === "draft";
      if (view === "review") return issue.status === "review";
      if (view === "published") return issue.status === "published";
      if (view.startsWith("folder:")) return issue.folderId === view.slice(7);
      return true;
    });
  }, [workspace, view, search]);

  const viewTitle =
    view === "all"
      ? "All newsletters"
      : view === "drafts"
        ? "Drafts"
        : view === "review"
          ? "In review"
          : view === "published"
            ? "Published"
            : workspace.folders.find((folder) => folder.id === view.slice(7))?.name ?? "Folder";

  return (
    <div className="app-shell min-h-screen bg-[#eeece6] text-[#171714]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-black/10 bg-[#171714] text-white md:flex">
        <div className="border-b border-white/10 p-6">
          <BrandLogo className="h-24 w-full object-left" priority />
          <p className="mt-1 text-[8px] uppercase tracking-[0.18em] text-white/40">Editorial workspace</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-4">
          <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.18em] text-white/35">Workspace</p>
          {[
            ["all", "All newsletters", workspace.issues.length],
            ["drafts", "Drafts", workspace.issues.filter((issue) => issue.status === "draft").length],
            ["review", "In review", workspace.issues.filter((issue) => issue.status === "review").length],
            ["published", "Published", workspace.issues.filter((issue) => issue.status === "published").length],
          ].map(([id, label, count]) => (
            <button
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-xs ${view === id ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5"}`}
              key={id}
              onClick={() => setView(String(id))}
              type="button"
            >
              <span>{label}</span><span className="text-[9px]">{count}</span>
            </button>
          ))}
          <div className="mb-2 mt-8 flex items-center justify-between px-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/35">Folders</p>
          </div>
          {workspace.folders.map((folder) => (
            <div className="group flex items-center" key={folder.id}>
              <button
                className={`flex flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs ${view === `folder:${folder.id}` ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5"}`}
                onClick={() => setView(`folder:${folder.id}`)}
                type="button"
              >
                <span className="h-2 w-2 rounded-full" style={{ background: folder.color }} />
                <span className="truncate">{folder.name}</span>
              </button>
              <button className="hidden px-1 text-white/35 group-hover:block" onClick={() => renameFolder(folder.id)} title="Rename" type="button">···</button>
              <button className="hidden px-1 text-white/35 hover:text-[#ef5a35] group-hover:block" onClick={() => deleteFolder(folder.id)} title="Delete" type="button">×</button>
            </div>
          ))}
          <div className="mt-3 flex gap-2 px-3">
            <input
              className="min-w-0 flex-1 border-b border-white/20 bg-transparent py-2 text-xs text-white outline-none placeholder:text-white/25"
              onChange={(event) => setFolderName(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && createFolder()}
              placeholder="New folder"
              value={folderName}
            />
            <button className="text-lg text-[#ef5a35]" onClick={createFolder} type="button">+</button>
          </div>
        </nav>
        <div className="border-t border-white/10 p-5 text-[10px] text-white/40">
          <Link className="mb-2 block rounded-lg border border-white/10 px-3 py-2.5 text-center text-[9px] font-bold uppercase tracking-[0.12em] text-white/60 hover:bg-white/5 hover:text-white" to="/settings">
            Settings
          </Link>
          <Link className="mb-2 block rounded-lg bg-white px-3 py-2.5 text-center text-[9px] font-bold uppercase tracking-[0.12em] text-black hover:bg-[#ef5a35] hover:text-white" to="/publishing">
            Publishing desk
          </Link>
          <div className="mb-4 mt-3 rounded-lg border border-white/10 bg-white/5 p-3 text-left">
            <div className="mb-2.5 min-w-0">
              <p className="truncate text-[11px] font-semibold text-white">
                {user?.user_metadata?.full_name ?? "Editorial member"}
              </p>
              <p className="truncate text-[9px] text-white/50" title={user?.email}>
                {user?.email}
              </p>
            </div>
            <button
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-[#ef5a35] px-3 py-2 text-center text-[9px] font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-white hover:text-black"
              onClick={() => void signOut()}
              type="button"
            >
              Sign out <span>→</span>
            </button>
          </div>
          <p className="text-white/70">University Editorial Team</p>
          <p className="mt-1">Local workspace · Phase 1</p>
        </div>
      </aside>

      <main className="min-h-screen md:ml-64">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-black/10 bg-[#eeece6]/95 px-5 py-4 backdrop-blur-md sm:px-8">
          <div className="md:hidden">
            <BrandLogo className="h-12 w-24 object-left" />
          </div>
          <label className="hidden w-full max-w-sm md:block">
            <input
              className="w-full rounded-full border border-black/15 bg-white/60 px-5 py-2.5 text-xs outline-none focus:border-[#ef5a35]"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search issues, dates, and editions"
              value={search}
            />
          </label>
          <div className="flex items-center gap-2">
            <button className="rounded-full bg-[#ef5a35] px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white hover:bg-[#171714]" onClick={() => setTemplateOpen(true)} type="button">
              New newsletter
            </button>
          </div>
        </header>

        <div className="p-5 sm:p-8 lg:p-12">
          <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">Editorial dashboard</p>
              <h1 className="font-serif text-5xl tracking-[-0.045em] sm:text-6xl">{viewTitle}</h1>
            </div>
            <p className="text-xs text-black/45">{issues.length} {issues.length === 1 ? "newsletter" : "newsletters"}</p>
          </div>

          {issues.length ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {issues.map((issue, index) => (
                <article className="group overflow-hidden border border-black/12 bg-[#f8f5ed] transition hover:-translate-y-1 hover:shadow-xl" key={issue.id}>
                  <Link className="block" to={`/editor/${issue.id}`}>
                    <div className={`relative flex aspect-[1.45] flex-col justify-between p-6 ${index % 3 === 1 ? "bg-[#efe8d8]" : index % 3 === 2 ? "bg-[#171714] text-white" : "bg-[#ef5a35] text-white"}`}>
                      <div className="flex justify-between text-[8px] font-bold uppercase tracking-[0.16em] opacity-65">
                        <span>In Other Words</span><span>University Edition</span>
                      </div>
                      <h2 className="max-w-[90%] font-serif text-3xl leading-[0.95] tracking-[-0.04em]">{issue.title}</h2>
                    </div>
                  </Link>
                  <div className="p-5">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <Link className="font-serif text-xl leading-tight hover:text-[#ef5a35]" to={`/editor/${issue.id}`}>{issue.title}</Link>
                        <p className="mt-1 text-[10px] text-black/45">{issue.week}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[8px] font-bold uppercase tracking-[0.1em] ${issue.status === "published" ? "bg-[#dce9e1] text-[#315b4b]" : issue.status === "review" ? "bg-[#eee2c7] text-[#745c22]" : "bg-black/5 text-black/45"}`}>
                        {issue.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 border-t border-black/10 pt-4">
                      <select
                        aria-label="Move to folder"
                        className="min-w-0 flex-1 bg-transparent text-[9px] uppercase tracking-[0.08em] text-black/45 outline-none"
                        onChange={(event) => moveIssue(issue.id, event.target.value)}
                        value={issue.folderId ?? ""}
                      >
                        <option value="">No folder</option>
                        {workspace.folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
                      </select>
                      <button className="text-[9px] font-bold uppercase tracking-[0.08em] hover:text-[#ef5a35]" onClick={() => duplicateIssue(issue)} type="button">Duplicate</button>
                      <button className="text-[9px] font-bold uppercase tracking-[0.08em] hover:text-[#ef5a35]" onClick={() => renameIssue(issue)} type="button">Rename</button>
                      <button className="text-lg text-black/30 hover:text-[#ef5a35]" onClick={() => deleteIssue(issue)} title="Delete" type="button">×</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="border border-dashed border-black/20 bg-white/30 px-6 py-24 text-center">
              <h2 className="font-serif text-3xl">Nothing here yet</h2>
              <p className="mx-auto mt-3 max-w-sm text-xs leading-relaxed text-black/45">Create a newsletter or move an existing issue into this folder.</p>
              <button className="mt-6 rounded-full bg-[#171714] px-5 py-2.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white" onClick={() => setTemplateOpen(true)} type="button">Create newsletter</button>
            </div>
          )}
        </div>
      </main>

      {templateOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#171714]/65 p-4 backdrop-blur-sm sm:p-8" onMouseDown={() => setTemplateOpen(false)}>
          <div className="mx-auto max-w-6xl bg-[#eeece6] p-5 shadow-2xl sm:p-8" onMouseDown={(event) => event.stopPropagation()}>
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">New newsletter</p>
                <h2 className="mt-2 font-serif text-5xl tracking-[-0.045em]">Choose a starting point</h2>
                <p className="mt-3 max-w-xl text-xs leading-relaxed text-black/50">Every template opens as a fully editable three-page newsletter. Sections can be moved, resized, duplicated, removed, or replaced.</p>
              </div>
              <button className="text-3xl text-black/40 hover:text-black" onClick={() => setTemplateOpen(false)} type="button">×</button>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {availableTemplates.map((template) => (
                <button
                  className={`group overflow-hidden border bg-[#f8f5ed] text-left transition hover:-translate-y-1 hover:border-[#ef5a35] hover:shadow-xl ${template.id === "blank" ? "border-dashed border-black/30" : "border-black/10"}`}
                  key={template.id}
                  onClick={() => createIssue(template)}
                  type="button"
                >
                  <div className={`relative aspect-[1.45] overflow-hidden p-5 ${template.preview === "blank" ? "bg-[#f8f5ed]" : "text-white"}`} style={{ backgroundColor: template.preview === "blank" ? undefined : template.accent }}>
                    {template.preview === "blank" ? (
                      <div className="grid h-full place-items-center border border-dashed border-black/20"><span className="text-5xl font-light text-black/20">+</span></div>
                    ) : (
                      <>
                        <div className="flex justify-between border-b border-white/50 pb-2 text-[7px] font-bold uppercase tracking-[0.15em]"><span>In Other Words</span><span>01 / 03</span></div>
                        <div className="mt-7 max-w-[85%] font-serif text-3xl leading-[0.85] tracking-[-0.05em]">
                          {template.preview === "literary" ? "Student words, given room." : template.preview === "events" ? "What’s on this week." : template.preview === "research" ? "Ideas changing how we see." : "Back to where ideas begin."}
                        </div>
                        <div className="absolute bottom-4 right-4 h-12 w-16 border border-white/40 bg-white/10" />
                      </>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between"><span className="text-[8px] font-bold uppercase tracking-[0.14em]" style={{ color: template.accent }}>{template.category}</span><span className="text-lg transition-transform group-hover:translate-x-1">→</span></div>
                    <h3 className="mt-3 font-serif text-2xl">{template.name}</h3>
                    <p className="mt-2 text-[10px] leading-relaxed text-black/45">{template.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
