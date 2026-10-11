import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  loadWorkflow,
  saveWorkflow,
  workflowId,
  type Approval,
  type Assignment,
  type Member,
  type MemberRole,
  type Submission,
  type Workflow,
} from "./workflowStore";
import BackIcon from "./BackIcon";
import BrandLogo from "./BrandLogo";

type Tab = "overview" | "assignments" | "submissions" | "approvals" | "team" | "activity";

const roles: MemberRole[] = [
  "Editor in chief",
  "Faculty adviser",
  "Section editor",
  "Copy editor",
  "Photographer",
  "Contributor",
];

const emptyWorkflow: Workflow = {
  members: [],
  assignments: [],
  submissions: [],
  approvals: [],
  comments: [],
  audit: [],
};

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "orange" | "green" | "red" }) {
  const tones = {
    neutral: "bg-black/5 text-black/50",
    orange: "bg-[#f4dfd5] text-[#9d3e22]",
    green: "bg-[#dce9e1] text-[#315b4b]",
    red: "bg-[#f0d9d7] text-[#8b342e]",
  };
  return <span className={`rounded-full px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.1em] ${tones[tone]}`}>{children}</span>;
}

function Initials({ name }: { name: string }) {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#171714] text-[9px] font-bold text-white">
      {name.split(" ").map((part) => part[0]).join("").slice(0, 2)}
    </span>
  );
}

export default function WorkflowPage() {
  const [workflow, setWorkflow] = useState<Workflow>(emptyWorkflow);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [sync, setSync] = useState<"saved" | "saving" | "offline" | "error">("saved");
  const [activeMemberId, setActiveMemberId] = useState("");

  useEffect(() => {
    loadWorkflow()
      .then((data) => {
        setWorkflow(data);
        setActiveMemberId(data.members[0]?.id ?? "");
        if (localStorage.getItem("iow-phase2-offline")) setSync("offline");
      })
      .catch(() => setSync("offline"))
      .finally(() => setLoading(false));
  }, []);

  const activeMember = workflow.members.find((member) => member.id === activeMemberId) ?? workflow.members[0];

  const commit = (next: Workflow, action: string) => {
    const audited: Workflow = {
      ...next,
      audit: [
        {
          id: workflowId("audit"),
          actor: activeMember?.name ?? "Editorial team",
          action,
          at: new Date().toISOString(),
        },
        ...next.audit,
      ].slice(0, 100),
    };
    setWorkflow(audited);
    setSync("saving");
    saveWorkflow(audited)
      .then(() => setSync("saved"))
      .catch(() => setSync("offline"));
  };

  const memberName = (id: string) => workflow.members.find((member) => member.id === id)?.name ?? "Unassigned";

  const createAssignment = () => {
    const title = window.prompt("Assignment title")?.trim();
    if (!title || !activeMember) return;
    const assignment: Assignment = {
      id: workflowId("assignment"),
      title,
      issue: "Back to where ideas begin",
      assigneeId: activeMember.id,
      due: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      status: "todo",
      priority: "normal",
    };
    commit({ ...workflow, assignments: [assignment, ...workflow.assignments] }, `created assignment “${title}”`);
  };

  const updateAssignment = (id: string, patch: Partial<Assignment>) => {
    const item = workflow.assignments.find((assignment) => assignment.id === id);
    commit(
      { ...workflow, assignments: workflow.assignments.map((assignment) => assignment.id === id ? { ...assignment, ...patch } : assignment) },
      `updated assignment “${item?.title ?? "Assignment"}”`,
    );
  };

  const deleteAssignment = (id: string) => {
    const item = workflow.assignments.find((assignment) => assignment.id === id);
    if (!window.confirm(`Delete “${item?.title}”?`)) return;
    commit({ ...workflow, assignments: workflow.assignments.filter((assignment) => assignment.id !== id) }, `deleted assignment “${item?.title}”`);
  };

  const createSubmission = () => {
    const title = window.prompt("Submission title")?.trim();
    if (!title) return;
    const submission: Submission = {
      id: workflowId("submission"),
      title,
      author: "Student contributor",
      category: "Literature",
      status: "new",
      consent: false,
      submittedAt: new Date().toISOString(),
      notes: "",
    };
    commit({ ...workflow, submissions: [submission, ...workflow.submissions] }, `received submission “${title}”`);
  };

  const updateSubmission = (id: string, patch: Partial<Submission>) => {
    const item = workflow.submissions.find((submission) => submission.id === id);
    if (patch.status === "accepted" && !item?.consent) {
      window.alert("Publication consent must be confirmed before accepting this submission.");
      return;
    }
    commit(
      { ...workflow, submissions: workflow.submissions.map((submission) => submission.id === id ? { ...submission, ...patch } : submission) },
      `updated submission “${item?.title ?? "Submission"}”`,
    );
  };

  const createApproval = () => {
    const issue = window.prompt("Newsletter or issue name")?.trim();
    if (!issue || !activeMember) return;
    const approval: Approval = {
      id: workflowId("approval"),
      issue,
      stage: "Copy review",
      ownerId: activeMember.id,
      status: "waiting",
      due: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
    };
    commit({ ...workflow, approvals: [approval, ...workflow.approvals] }, `created approval request for “${issue}”`);
  };

  const updateApproval = (id: string, patch: Partial<Approval>) => {
    const approval = workflow.approvals.find((item) => item.id === id);
    commit(
      { ...workflow, approvals: workflow.approvals.map((item) => item.id === id ? { ...item, ...patch } : item) },
      `${patch.status === "approved" ? "approved" : "updated"} “${approval?.issue ?? "Issue"}”`,
    );
  };

  const inviteMember = () => {
    const name = window.prompt("Team member name")?.trim();
    if (!name) return;
    const email = window.prompt("University email")?.trim();
    if (!email) return;
    const member: Member = {
      id: workflowId("member"),
      name,
      email,
      role: "Contributor",
      status: "invited",
    };
    commit({ ...workflow, members: [...workflow.members, member] }, `invited ${name} to the editorial team`);
  };

  const updateMember = (id: string, patch: Partial<Member>) => {
    const member = workflow.members.find((item) => item.id === id);
    commit(
      { ...workflow, members: workflow.members.map((item) => item.id === id ? { ...item, ...patch } : item) },
      `updated ${member?.name ?? "a team member"}’s access`,
    );
  };

  const addComment = () => {
    const body = window.prompt("Add editorial comment")?.trim();
    if (!body || !activeMember) return;
    commit(
      {
        ...workflow,
        comments: [
          {
            id: workflowId("comment"),
            issue: "Back to where ideas begin",
            authorId: activeMember.id,
            body,
            createdAt: new Date().toISOString(),
            resolved: false,
          },
          ...workflow.comments,
        ],
      },
      "added an editorial comment",
    );
  };

  const unresolved = workflow.comments.filter((comment) => !comment.resolved).length;
  const dueSoon = workflow.assignments.filter((assignment) => assignment.status !== "done").length;
  const consentNeeded = workflow.submissions.filter((submission) => !submission.consent).length;
  const waitingApprovals = workflow.approvals.filter((approval) => approval.status !== "approved").length;

  const notifications = useMemo(
    () => [
      ...(consentNeeded ? [`${consentNeeded} submission${consentNeeded === 1 ? "" : "s"} need publication consent`] : []),
      ...(waitingApprovals ? [`${waitingApprovals} approval${waitingApprovals === 1 ? "" : "s"} waiting`] : []),
      ...(unresolved ? [`${unresolved} unresolved editorial comment${unresolved === 1 ? "" : "s"}`] : []),
    ],
    [consentNeeded, waitingApprovals, unresolved],
  );

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-[#eeece6] text-xs uppercase tracking-[0.15em] text-black/45">Loading editorial workspace</div>;
  }

  return (
    <div className="app-shell min-h-screen bg-[#eeece6] text-[#171714]">
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 border-b border-black/10 bg-[#171714] px-5 py-4 text-white sm:px-8">
        <div className="flex items-center gap-4">
          <Link aria-label="Back to dashboard" className="grid h-9 w-9 place-items-center rounded-full border border-white/15 hover:bg-white/10" to="/" title="Back to dashboard"><BackIcon /></Link>
          <BrandLogo className="h-11 w-20" />
          <div>
            <p className="font-serif text-xl italic">Editorial workflow</p>
            <p className="text-[8px] uppercase tracking-[0.18em] text-white/35">Phase 2 · University newsroom</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`hidden text-[9px] uppercase tracking-[0.12em] sm:block ${sync === "saved" ? "text-[#9bc5ad]" : sync === "saving" ? "text-white/45" : "text-[#ef9b7e]"}`}>
            {sync === "saved" ? "Synced to Supabase" : sync === "saving" ? "Saving…" : sync === "offline" ? "Working from local copy" : "Sync failed"}
          </span>
          <select
            className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-[9px] text-white outline-none"
            onChange={(event) => setActiveMemberId(event.target.value)}
            value={activeMemberId}
          >
            {workflow.members.map((member) => <option className="text-black" key={member.id} value={member.id}>Viewing as {member.name}</option>)}
          </select>
        </div>
      </header>

      <div className="border-b border-black/10 bg-[#f8f5ed] px-4 sm:px-8">
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto">
          {(["overview", "assignments", "submissions", "approvals", "team", "activity"] as Tab[]).map((item) => (
            <button
              className={`border-b-2 px-4 py-4 text-[9px] font-bold uppercase tracking-[0.13em] ${tab === item ? "border-[#ef5a35] text-[#ef5a35]" : "border-transparent text-black/40 hover:text-black"}`}
              key={item}
              onClick={() => setTab(item)}
              type="button"
            >
              {item}
              {item === "submissions" && consentNeeded > 0 ? <span className="ml-2 rounded-full bg-[#ef5a35] px-1.5 py-0.5 text-[7px] text-white">{consentNeeded}</span> : null}
            </button>
          ))}
        </nav>
      </div>

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        {tab === "overview" && (
          <>
            <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
              <div>
                <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">Good morning, {activeMember?.name.split(" ")[0]}</p>
                <h1 className="font-serif text-5xl tracking-[-0.045em] sm:text-6xl">The newsroom at a glance</h1>
              </div>
              <Link className="rounded-full bg-[#171714] px-5 py-2.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white" to="/editor/issue-current">Open current issue</Link>
            </div>
            <div className="grid gap-px overflow-hidden border border-black/10 bg-black/10 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Open assignments", dueSoon, "Needs attention"],
                ["New submissions", workflow.submissions.filter((item) => item.status === "new").length, "Incoming work"],
                ["Waiting approvals", waitingApprovals, "Editorial gates"],
                ["Open comments", unresolved, "Team discussion"],
              ].map(([label, value, note]) => (
                <div className="bg-[#f8f5ed] p-6" key={String(label)}>
                  <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-black/40">{label}</p>
                  <p className="mt-5 font-serif text-5xl">{value}</p>
                  <p className="mt-2 text-[9px] text-[#ef5a35]">{note}</p>
                </div>
              ))}
            </div>
            <div className="mt-7 grid gap-7 lg:grid-cols-[1.4fr_0.6fr]">
              <section className="border border-black/10 bg-[#f8f5ed] p-6 sm:p-8">
                <div className="mb-6 flex items-center justify-between">
                  <div><p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#ef5a35]">Production</p><h2 className="mt-2 font-serif text-3xl">Current assignments</h2></div>
                  <button className="text-[9px] font-bold uppercase tracking-[0.1em]" onClick={() => setTab("assignments")} type="button">View all →</button>
                </div>
                <div className="divide-y divide-black/10 border-y border-black/10">
                  {workflow.assignments.slice(0, 4).map((assignment) => (
                    <div className="grid gap-3 py-5 sm:grid-cols-[1fr_130px_90px] sm:items-center" key={assignment.id}>
                      <div><p className="font-serif text-xl">{assignment.title}</p><p className="mt-1 text-[9px] text-black/40">{assignment.issue}</p></div>
                      <p className="text-[10px]">{memberName(assignment.assigneeId)}</p>
                      <Badge tone={assignment.status === "done" ? "green" : assignment.priority === "high" ? "orange" : "neutral"}>{assignment.status}</Badge>
                    </div>
                  ))}
                </div>
              </section>
              <aside className="bg-[#171714] p-6 text-white sm:p-8">
                <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#ef5a35]">Notifications</p>
                <h2 className="mt-2 font-serif text-3xl">Before publishing</h2>
                <div className="mt-7 divide-y divide-white/10 border-y border-white/10">
                  {notifications.length ? notifications.map((notification) => <p className="py-5 text-xs leading-relaxed text-white/65" key={notification}>{notification}</p>) : <p className="py-5 text-xs text-white/45">Everything is clear.</p>}
                </div>
              </aside>
            </div>
            <section className="mt-7 border border-black/10 bg-[#f8f5ed] p-6 sm:p-8">
              <div className="mb-6 flex items-center justify-between">
                <div><p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#ef5a35]">Discussion</p><h2 className="mt-2 font-serif text-3xl">Editorial comments</h2></div>
                <button className="rounded-full border border-black/15 px-4 py-2 text-[9px] font-bold uppercase tracking-[0.1em]" onClick={addComment} type="button">Add comment</button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {workflow.comments.map((comment) => (
                  <article className={`border p-5 ${comment.resolved ? "border-black/10 opacity-55" : "border-[#ef5a35]/40 bg-[#ef5a35]/[0.03]"}`} key={comment.id}>
                    <div className="flex items-center gap-3"><Initials name={memberName(comment.authorId)} /><div><p className="text-xs font-semibold">{memberName(comment.authorId)}</p><p className="text-[9px] text-black/40">{comment.issue}</p></div></div>
                    <p className="mt-4 text-sm leading-relaxed">{comment.body}</p>
                    <button className="mt-5 text-[9px] font-bold uppercase tracking-[0.1em] text-[#ef5a35]" onClick={() => commit({ ...workflow, comments: workflow.comments.map((item) => item.id === comment.id ? { ...item, resolved: !item.resolved } : item) }, `${comment.resolved ? "reopened" : "resolved"} an editorial comment`)} type="button">{comment.resolved ? "Reopen" : "Resolve"}</button>
                  </article>
                ))}
              </div>
            </section>
          </>
        )}

        {tab === "assignments" && (
          <section>
            <PageTitle eyebrow="Production desk" title="Assignments & deadlines" action="New assignment" onAction={createAssignment} />
            <div className="overflow-x-auto border border-black/10 bg-[#f8f5ed]">
              <table className="w-full min-w-[850px] text-left">
                <thead className="border-b border-black/10 text-[8px] uppercase tracking-[0.15em] text-black/40"><tr><th className="p-5">Assignment</th><th>Assignee</th><th>Due</th><th>Priority</th><th>Status</th><th /></tr></thead>
                <tbody className="divide-y divide-black/10">
                  {workflow.assignments.map((assignment) => (
                    <tr key={assignment.id}>
                      <td className="p-5"><p className="font-serif text-xl">{assignment.title}</p><p className="mt-1 text-[9px] text-black/40">{assignment.issue}</p></td>
                      <td><select className="bg-transparent text-xs" onChange={(event) => updateAssignment(assignment.id, { assigneeId: event.target.value })} value={assignment.assigneeId}>{workflow.members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></td>
                      <td><input className="bg-transparent text-xs" onChange={(event) => updateAssignment(assignment.id, { due: event.target.value })} type="date" value={assignment.due} /></td>
                      <td><button onClick={() => updateAssignment(assignment.id, { priority: assignment.priority === "high" ? "normal" : "high" })} type="button"><Badge tone={assignment.priority === "high" ? "orange" : "neutral"}>{assignment.priority}</Badge></button></td>
                      <td><select className="bg-transparent text-xs" onChange={(event) => updateAssignment(assignment.id, { status: event.target.value as Assignment["status"] })} value={assignment.status}><option value="todo">To do</option><option value="in progress">In progress</option><option value="review">Review</option><option value="done">Done</option></select></td>
                      <td className="pr-5 text-right"><button className="text-lg text-black/25 hover:text-[#ef5a35]" onClick={() => deleteAssignment(assignment.id)} type="button">×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "submissions" && (
          <section>
            <PageTitle eyebrow="Student contributions" title="Submission inbox" action="Add submission" onAction={createSubmission} />
            <div className="grid gap-4">
              {workflow.submissions.map((submission) => (
                <article className="grid gap-5 border border-black/10 bg-[#f8f5ed] p-5 sm:grid-cols-[1fr_130px_150px_150px] sm:items-center sm:p-6" key={submission.id}>
                  <div><div className="flex items-center gap-2"><Badge>{submission.category}</Badge>{!submission.consent && <Badge tone="red">Consent needed</Badge>}</div><h2 className="mt-3 font-serif text-2xl">{submission.title}</h2><p className="mt-1 text-[9px] text-black/40">{submission.author} · {new Date(submission.submittedAt).toLocaleDateString()}</p></div>
                  <label className="flex items-center gap-2 text-[10px]"><input checked={submission.consent} onChange={(event) => updateSubmission(submission.id, { consent: event.target.checked })} type="checkbox" /> Publication consent</label>
                  <select className="rounded border border-black/10 bg-transparent px-3 py-2 text-[10px]" onChange={(event) => updateSubmission(submission.id, { category: event.target.value })} value={submission.category}><option>Poetry</option><option>Short fiction</option><option>Literature</option><option>Photography</option><option>Events</option><option>Anonymous tip</option></select>
                  <select className="rounded border border-black/10 bg-transparent px-3 py-2 text-[10px]" onChange={(event) => updateSubmission(submission.id, { status: event.target.value as Submission["status"] })} value={submission.status}><option value="new">New</option><option value="review">In review</option><option value="shortlisted">Shortlisted</option><option value="accepted">Accepted</option><option value="declined">Declined</option></select>
                </article>
              ))}
            </div>
            <p className="mt-5 max-w-2xl text-[10px] leading-relaxed text-black/45">Demo-safe contributor labels are used here. Before collecting real student details, configure authenticated submission forms, university retention rules, and consent language approved by your institution.</p>
          </section>
        )}

        {tab === "approvals" && (
          <section>
            <PageTitle eyebrow="Publication gates" title="Review & approval" action="Request approval" onAction={createApproval} />
            <div className="grid gap-5 lg:grid-cols-2">
              {workflow.approvals.map((approval) => (
                <article className="border border-black/10 bg-[#f8f5ed] p-6 sm:p-8" key={approval.id}>
                  <div className="flex items-start justify-between gap-3"><Badge tone={approval.status === "approved" ? "green" : approval.status === "changes requested" ? "red" : "orange"}>{approval.status}</Badge><span className="text-[9px] text-black/40">Due {approval.due}</span></div>
                  <h2 className="mt-6 font-serif text-3xl">{approval.issue}</h2>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.12em] text-black/40">{approval.stage} · {memberName(approval.ownerId)}</p>
                  <div className="mt-8 flex flex-wrap gap-2">
                    <button className="rounded-full bg-[#315b4b] px-4 py-2 text-[9px] font-bold uppercase tracking-[0.1em] text-white" onClick={() => updateApproval(approval.id, { status: "approved" })} type="button">Approve</button>
                    <button className="rounded-full border border-black/15 px-4 py-2 text-[9px] font-bold uppercase tracking-[0.1em]" onClick={() => updateApproval(approval.id, { status: "changes requested" })} type="button">Request changes</button>
                    <select className="ml-auto bg-transparent text-[9px]" onChange={(event) => updateApproval(approval.id, { ownerId: event.target.value })} value={approval.ownerId}>{workflow.members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === "team" && (
          <section>
            <PageTitle eyebrow="Access & roles" title="Editorial team" action="Invite member" onAction={inviteMember} />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {workflow.members.map((member) => (
                <article className="border border-black/10 bg-[#f8f5ed] p-6" key={member.id}>
                  <div className="flex items-center gap-3"><Initials name={member.name} /><div><h2 className="font-serif text-xl">{member.name}</h2><p className="text-[9px] text-black/40">{member.email}</p></div><span className="ml-auto"><Badge tone={member.status === "active" ? "green" : "orange"}>{member.status}</Badge></span></div>
                  <select className="mt-6 w-full border-t border-black/10 bg-transparent pt-4 text-[10px]" onChange={(event) => updateMember(member.id, { role: event.target.value as MemberRole })} value={member.role}>{roles.map((role) => <option key={role}>{role}</option>)}</select>
                  <p className="mt-3 text-[9px] leading-relaxed text-black/40">{member.role === "Faculty adviser" ? "Can review and approve issues." : member.role === "Contributor" ? "Can submit and edit assigned work." : "Can manage editorial content and assignments."}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        {tab === "activity" && (
          <section>
            <PageTitle eyebrow="Accountability" title="Activity history" />
            <div className="border-y border-black/10 bg-[#f8f5ed]">
              {workflow.audit.map((event) => (
                <div className="grid gap-2 border-b border-black/10 px-5 py-5 last:border-0 sm:grid-cols-[160px_1fr_180px] sm:px-7" key={event.id}>
                  <p className="text-xs font-semibold">{event.actor}</p>
                  <p className="text-xs text-black/65">{event.action}</p>
                  <p className="text-[9px] text-black/35 sm:text-right">{new Date(event.at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function PageTitle({
  eyebrow,
  title,
  action,
  onAction,
}: {
  eyebrow: string;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
      <div><p className="mb-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">{eyebrow}</p><h1 className="font-serif text-5xl tracking-[-0.045em] sm:text-6xl">{title}</h1></div>
      {action && <button className="rounded-full bg-[#171714] px-5 py-2.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white hover:bg-[#ef5a35]" onClick={onAction} type="button">{action}</button>}
    </div>
  );
}
