import { supabase } from "./supabaseClient";

export type IssueStatus = "draft" | "review" | "published";

export type Folder = {
  id: string;
  name: string;
  color: string;
  createdAt: string;
};

export type Issue = {
  id: string;
  title: string;
  week: string;
  status: IssueStatus;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Workspace = {
  folders: Folder[];
  issues: Issue[];
};

const WORKSPACE_KEY = "iow-workspace-v1";

const now = () => new Date().toISOString();
export const makeId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const seedWorkspace = (): Workspace => ({
  folders: [
    { id: "folder-2025", name: "2025 Editions", color: "#ef5a35", createdAt: now() },
    { id: "folder-special", name: "Special Editions", color: "#3e6a59", createdAt: now() },
  ],
  issues: [
    {
      id: "issue-current",
      title: "Back to where ideas begin",
      week: "September 22–28, 2025",
      status: "draft",
      folderId: "folder-2025",
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: "issue-welcome",
      title: "The Welcome Week Edition",
      week: "September 15–21, 2025",
      status: "review",
      folderId: "folder-2025",
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: "issue-summer",
      title: "Notes from a Quiet Campus",
      week: "June 16–22, 2025",
      status: "published",
      folderId: "folder-2025",
      createdAt: now(),
      updatedAt: now(),
    },
  ],
});

export function loadWorkspace(): Workspace {
  try {
    const stored = localStorage.getItem(WORKSPACE_KEY);
    if (stored) return JSON.parse(stored) as Workspace;
  } catch {
    // A fresh workspace is safer than blocking the editor on malformed local data.
  }
  const seeded = seedWorkspace();
  localStorage.setItem(WORKSPACE_KEY, JSON.stringify(seeded));
  return seeded;
}

let workspaceChannel: any = null;

export function initWorkspaceRealtimeSync(onSync?: (workspace: Workspace) => void) {
  if (workspaceChannel) return workspaceChannel;

  workspaceChannel = supabase.channel("global-workspace-sync", {
    config: { broadcast: { ack: false, self: false } },
  });

  workspaceChannel
    .on("broadcast", { event: "sync_workspace" }, ({ payload }: { payload: Workspace }) => {
      if (payload && payload.issues) {
        localStorage.setItem(WORKSPACE_KEY, JSON.stringify(payload));
        window.dispatchEvent(new CustomEvent("iow-workspace-change"));
        if (onSync) onSync(payload);
      }
    })
    .subscribe();

  return workspaceChannel;
}

export function broadcastWorkspace(workspace: Workspace) {
  if (workspaceChannel) {
    workspaceChannel.send({
      type: "broadcast",
      event: "sync_workspace",
      payload: workspace,
    });
  }
}

export function saveWorkspace(workspace: Workspace) {
  localStorage.setItem(WORKSPACE_KEY, JSON.stringify(workspace));
  window.dispatchEvent(new CustomEvent("iow-workspace-change"));
  broadcastWorkspace(workspace);
}

export function updateIssue(issueId: string, patch: Partial<Issue>) {
  const workspace = loadWorkspace();
  workspace.issues = workspace.issues.map((issue) =>
    issue.id === issueId ? { ...issue, ...patch, updatedAt: now() } : issue,
  );
  saveWorkspace(workspace);
}

export function cloneIssueDocument(sourceId: string, destinationId: string) {
  const layout = localStorage.getItem(`iow-layout-${sourceId}`);
  const content = localStorage.getItem(`iow-content-${sourceId}`);
  if (layout) localStorage.setItem(`iow-layout-${destinationId}`, layout);
  if (content) localStorage.setItem(`iow-content-${destinationId}`, content);
}

export function removeIssueDocument(issueId: string) {
  localStorage.removeItem(`iow-layout-${issueId}`);
  localStorage.removeItem(`iow-content-${issueId}`);
}
