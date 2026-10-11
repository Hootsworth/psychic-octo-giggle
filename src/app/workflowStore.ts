import { projectId } from "../../utils/supabase/info";
import { authenticatedHeaders } from "./supabaseClient";

export type MemberRole =
  | "Editor in chief"
  | "Faculty adviser"
  | "Section editor"
  | "Copy editor"
  | "Photographer"
  | "Contributor";

export type Member = {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  status: "active" | "invited";
};

export type Assignment = {
  id: string;
  title: string;
  issue: string;
  assigneeId: string;
  due: string;
  status: "todo" | "in progress" | "review" | "done";
  priority: "normal" | "high";
};

export type Submission = {
  id: string;
  title: string;
  author: string;
  category: string;
  status: "new" | "review" | "shortlisted" | "accepted" | "declined";
  consent: boolean;
  submittedAt: string;
  notes: string;
};

export type Approval = {
  id: string;
  issue: string;
  stage: string;
  ownerId: string;
  status: "waiting" | "in progress" | "approved" | "changes requested";
  due: string;
};

export type EditorialComment = {
  id: string;
  issue: string;
  authorId: string;
  body: string;
  createdAt: string;
  resolved: boolean;
};

export type AuditEvent = {
  id: string;
  actor: string;
  action: string;
  at: string;
};

export type Workflow = {
  members: Member[];
  assignments: Assignment[];
  submissions: Submission[];
  approvals: Approval[];
  comments: EditorialComment[];
  audit: AuditEvent[];
};

const endpoint = `https://${projectId}.supabase.co/functions/v1/make-server-c2909e49/workflow`;
const fallbackKey = "iow-phase2-workflow";
const offlineKey = "iow-phase2-offline";

const demoWorkflow: Workflow = {
  members: [
    { id: "member-1", name: "Avery Morgan", email: "editor@university.edu", role: "Editor in chief", status: "active" },
    { id: "member-2", name: "Samira Patel", email: "faculty@university.edu", role: "Faculty adviser", status: "active" },
    { id: "member-3", name: "Leo Bennett", email: "culture@university.edu", role: "Section editor", status: "active" },
    { id: "member-4", name: "Mina Chen", email: "contributor@university.edu", role: "Contributor", status: "invited" },
  ],
  assignments: [
    { id: "assignment-1", title: "Copy-edit the featured poem", issue: "Back to where ideas begin", assigneeId: "member-3", due: "2025-09-24", status: "in progress", priority: "high" },
    { id: "assignment-2", title: "Confirm event times with clubs", issue: "Back to where ideas begin", assigneeId: "member-1", due: "2025-09-23", status: "todo", priority: "normal" },
    { id: "assignment-3", title: "Faculty publication review", issue: "The Welcome Week Edition", assigneeId: "member-2", due: "2025-09-25", status: "review", priority: "high" },
  ],
  submissions: [
    { id: "submission-1", title: "Library at 4:17", author: "Student contributor", category: "Poetry", status: "shortlisted", consent: true, submittedAt: "2025-09-20T10:00:00.000Z", notes: "Strong fit for Student Voices." },
    { id: "submission-2", title: "The Night Bus Home", author: "Student contributor", category: "Short fiction", status: "new", consent: true, submittedAt: "2025-09-21T15:30:00.000Z", notes: "" },
    { id: "submission-3", title: "Societies Fair Photo Essay", author: "Student contributor", category: "Photography", status: "review", consent: false, submittedAt: "2025-09-22T08:15:00.000Z", notes: "Awaiting release confirmation." },
  ],
  approvals: [
    { id: "approval-1", issue: "Back to where ideas begin", stage: "Copy review", ownerId: "member-3", status: "in progress", due: "2025-09-24" },
    { id: "approval-2", issue: "The Welcome Week Edition", stage: "Faculty approval", ownerId: "member-2", status: "waiting", due: "2025-09-25" },
  ],
  comments: [
    { id: "comment-1", issue: "Back to where ideas begin", authorId: "member-2", body: "Please confirm that every event time has a source before publication.", createdAt: "2025-09-22T09:00:00.000Z", resolved: false },
    { id: "comment-2", issue: "Back to where ideas begin", authorId: "member-3", body: "The poem has been copy-edited and the author approved the final line breaks.", createdAt: "2025-09-22T11:20:00.000Z", resolved: true },
  ],
  audit: [
    { id: "audit-1", actor: "Avery Morgan", action: "moved an issue to copy review", at: "2025-09-22T09:10:00.000Z" },
    { id: "audit-2", actor: "Leo Bennett", action: "shortlisted a poetry submission", at: "2025-09-22T10:45:00.000Z" },
  ],
};

export async function loadWorkflow(): Promise<Workflow> {
  try {
    const response = await fetch(endpoint, {
      headers: await authenticatedHeaders(),
    });
    if (!response.ok) throw new Error(await response.text());
    const workflow = (await response.json()) as Workflow;
    localStorage.removeItem(offlineKey);
    localStorage.setItem(fallbackKey, JSON.stringify(workflow));
    return workflow;
  } catch (error) {
    localStorage.setItem(offlineKey, "true");
    const fallback = localStorage.getItem(fallbackKey);
    if (fallback) return JSON.parse(fallback) as Workflow;
    localStorage.setItem(fallbackKey, JSON.stringify(demoWorkflow));
    return demoWorkflow;
  }
}

export async function saveWorkflow(workflow: Workflow) {
  localStorage.setItem(fallbackKey, JSON.stringify(workflow));
  const response = await fetch(endpoint, {
    method: "PUT",
    headers: await authenticatedHeaders(),
    body: JSON.stringify(workflow),
  });
  if (!response.ok) throw new Error(await response.text());
  localStorage.removeItem(offlineKey);
}

export const workflowId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
