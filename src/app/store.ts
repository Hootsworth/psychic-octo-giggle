import { authenticatedHeaders, supabase } from "./supabaseClient";
import { projectId } from "../../utils/supabase/info";

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

export type IssueDocument = {
  pages: unknown[][];
  content: string[];
  paletteId: string;
  fontId: string;
  freeformMode?: boolean;
  media: { key: string; value: string; meta?: Record<string, unknown> }[];
  comments?: unknown[];
  chatMessages?: unknown[];
};

export type PublishedIssueDocument = { issue: Issue; document: IssueDocument };

const WORKSPACE_KEY = "iow-workspace-v1";
const WORKSPACE_OWNER_KEY = "iow-workspace-owner-v1";
const endpoint = `https://${projectId}.supabase.co/functions/v1/make-server-c2909e49`;
let activeWorkspaceOwnerId: string | null = null;
const issueRevisions = new Map<string, string | null>();

class CloudRequestError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

export function activateWorkspaceOwner(ownerId: string | null) {
  // Issue records are shared by the newsroom. Switching auth users must not
  // erase the browser's local copy before the shared cloud workspace hydrates.
  activeWorkspaceOwnerId = ownerId;
}

function workspaceKey(ownerId = activeWorkspaceOwnerId) {
  return ownerId ? `${WORKSPACE_KEY}:${ownerId}` : WORKSPACE_KEY;
}

const now = () => new Date().toISOString();
export const makeId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const emptyWorkspace = (): Workspace => ({ folders: [], issues: [] });

export function loadWorkspace(ownerId = activeWorkspaceOwnerId): Workspace {
  try {
    const stored = localStorage.getItem(workspaceKey(ownerId));
    if (stored) return JSON.parse(stored) as Workspace;
  } catch {
    // A fresh workspace is safer than blocking the editor on malformed local data.
  }
  let initial = emptyWorkspace();
  if (ownerId) {
    const previousOwner = localStorage.getItem(WORKSPACE_OWNER_KEY);
    if (!previousOwner || previousOwner === ownerId) {
      try {
        const legacy = localStorage.getItem(WORKSPACE_KEY);
        if (legacy) initial = JSON.parse(legacy) as Workspace;
      } catch { /* Use a clean workspace when legacy data is malformed. */ }
    }
    localStorage.setItem(WORKSPACE_OWNER_KEY, ownerId);
  }
  localStorage.setItem(workspaceKey(ownerId), JSON.stringify(initial));
  return initial;
}

async function cloudRequest<T>(path: string, init: RequestInit = {}): Promise<T | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Your sign-in session has expired. Sign in again to sync cloud changes.");
  const response = await fetch(`${endpoint}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new CloudRequestError(body?.error || `Cloud request failed (${response.status}).`, response.status);
  }
  return response.status === 204 ? null : await response.json() as T;
}

function cacheWorkspace(workspace: Workspace) {
  localStorage.setItem(workspaceKey(), JSON.stringify(workspace));
  window.dispatchEvent(new CustomEvent("iow-workspace-change"));
}

export async function hydrateWorkspace(ownerId: string): Promise<Workspace> {
  activateWorkspaceOwner(ownerId);
  const remote = await cloudRequest<Workspace>("/workspace");
  if (remote) {
    cacheWorkspace(remote);
    localStorage.setItem(WORKSPACE_OWNER_KEY, ownerId);
    return remote;
  }
  let local = emptyWorkspace();
  if (localStorage.getItem(workspaceKey(ownerId))) {
    local = loadWorkspace(ownerId);
  } else {
    const previousOwner = localStorage.getItem(WORKSPACE_OWNER_KEY);
    if (!previousOwner || previousOwner === ownerId) {
      try {
        const legacy = localStorage.getItem(WORKSPACE_KEY);
        if (legacy) local = JSON.parse(legacy) as Workspace;
      } catch { /* Fall back to a newly seeded workspace. */ }
    }
    localStorage.setItem(workspaceKey(ownerId), JSON.stringify(local));
    localStorage.setItem(WORKSPACE_OWNER_KEY, ownerId);
  }
  await cloudRequest("/workspace", { method: "PUT", body: JSON.stringify(local) });
  return local;
}

export async function loadIssueDocument(issueId: string): Promise<IssueDocument | null> {
  const remote = await cloudRequest<IssueDocument & { updatedAt?: string; revision?: string }>(`/issues/${encodeURIComponent(issueId)}`);
  if (!remote) { issueRevisions.set(issueId, null); return null; }
  issueRevisions.set(issueId, remote.revision ?? remote.updatedAt ?? null);
  remote.media?.forEach((entry) => {
    try { localStorage.setItem(entry.key, entry.value); } catch { /* Cloud media remains available in the live editor even if local quota is exhausted. */ }
    if (entry.meta) { try { localStorage.setItem(`${entry.key}-meta`, JSON.stringify(entry.meta)); } catch { /* Metadata can be fetched again with the cloud document. */ } }
  });
  localStorage.setItem(`iow-layout-${issueId}`, JSON.stringify(remote.pages));
  localStorage.setItem(`iow-content-${issueId}`, JSON.stringify(remote.content));
  localStorage.setItem(`iow-palette-${issueId}`, remote.paletteId);
  localStorage.setItem(`iow-font-${issueId}`, remote.fontId);
  if (remote.freeformMode !== undefined) localStorage.setItem(`iow-freeform-${issueId}`, String(remote.freeformMode));
  if (remote.comments) localStorage.setItem(`iow-comments-${issueId}`, JSON.stringify(remote.comments));
  if (remote.chatMessages) localStorage.setItem(`iow-chat-${issueId}`, JSON.stringify(remote.chatMessages));
  return remote;
}

export async function saveIssueDocument(issueId: string, document: IssueDocument): Promise<void> {
  const baseVersion = issueRevisions.has(issueId) ? issueRevisions.get(issueId) ?? null : null;
  try {
    const result = await cloudRequest<{ media?: IssueDocument["media"]; updatedAt?: string; revision?: string }>(`/issues/${encodeURIComponent(issueId)}`, { method: "PUT", body: JSON.stringify({ ...document, baseUpdatedAt: baseVersion, baseRevision: baseVersion }) });
    if (!result) throw new Error("Sign in to save this issue to the cloud. Your browser copy is still available.");
    if (result.revision || result.updatedAt) issueRevisions.set(issueId, result.revision ?? result.updatedAt ?? null);
    result.media?.forEach((entry) => {
      try { localStorage.setItem(entry.key, entry.value); } catch { /* Keep the live media in memory when the browser quota is full. */ }
      if (entry.meta) { try { localStorage.setItem(`${entry.key}-meta`, JSON.stringify(entry.meta)); } catch { /* Cloud metadata remains authoritative even when browser quota is exhausted. */ } }
    });
    window.dispatchEvent(new CustomEvent("iow-issue-sync-success", { detail: { issueId } }));
  } catch (error) {
    if (error instanceof CloudRequestError && error.status === 409) {
      try {
        localStorage.setItem(`iow-conflict-draft-${issueId}`, JSON.stringify({
          pages: document.pages, content: document.content, paletteId: document.paletteId, fontId: document.fontId,
          mediaKeys: document.media.map(({ key, meta }) => ({ key, meta })), savedAt: new Date().toISOString(),
        }));
      } catch { /* The current editor session remains the recovery copy. */ }
      window.dispatchEvent(new CustomEvent("iow-issue-sync-conflict", { detail: { issueId, message: error.message } }));
    }
    throw error;
  }
}

let workspaceSaveTimer: ReturnType<typeof setTimeout> | null = null;
let queuedWorkspace: Workspace | null = null;

export function saveWorkspace(workspace: Workspace) {
  cacheWorkspace(workspace);
  queuedWorkspace = workspace;
  if (workspaceSaveTimer) clearTimeout(workspaceSaveTimer);
  workspaceSaveTimer = setTimeout(() => {
    const next = queuedWorkspace;
    queuedWorkspace = null;
    workspaceSaveTimer = null;
    if (!next) return;
    void cloudRequest("/workspace", { method: "PUT", body: JSON.stringify(next) })
      .then(() => window.dispatchEvent(new CustomEvent("iow-workspace-sync-success")))
      .catch((error) => window.dispatchEvent(new CustomEvent("iow-workspace-sync-error", { detail: error })));
  }, 250);
}

export async function loadPublishedIssues(): Promise<Issue[]> {
  const response = await fetch(`${endpoint}/public/archive`, { headers: await authenticatedHeaders() });
  if (!response.ok) throw new Error(`Could not load the public archive (${response.status}).`);
  return await response.json() as Issue[];
}

export async function loadPublishedIssueDocument(issueId: string): Promise<PublishedIssueDocument | null> {
  const response = await fetch(`${endpoint}/public/issues/${encodeURIComponent(issueId)}`, { headers: await authenticatedHeaders() });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Could not load the published issue (${response.status}).`);
  const published = await response.json() as PublishedIssueDocument;
  const document = published.document;
  document.media?.forEach((entry) => {
    try { localStorage.setItem(entry.key, entry.value); } catch { /* Public cloud images remain part of the returned document. */ }
    if (entry.meta) { try { localStorage.setItem(`${entry.key}-meta`, JSON.stringify(entry.meta)); } catch { /* Crop metadata is still available in the media record. */ } }
  });
  return published;
}

export function updateIssue(issueId: string, patch: Partial<Issue>) {
  const workspace = loadWorkspace();
  workspace.issues = workspace.issues.map((issue) =>
    issue.id === issueId ? { ...issue, ...patch, updatedAt: now() } : issue,
  );
  saveWorkspace(workspace);
}

export function cloneIssueDocument(sourceId: string, destinationId: string) {
  const suffixes = ["layout", "content", "palette", "font", "comments", "chat"];
  for (const suffix of suffixes) {
    const value = localStorage.getItem(`iow-${suffix}-${sourceId}`);
    if (value !== null) localStorage.setItem(`iow-${suffix}-${destinationId}`, value);
  }
  const mediaPrefix = `iow-media-${sourceId}-`;
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(mediaPrefix) || key.endsWith("-meta")) continue;
    const newKey = key.replace(`-${sourceId}-`, `-${destinationId}-`);
    const value = localStorage.getItem(key);
    if (value !== null) localStorage.setItem(newKey, value);
    const meta = localStorage.getItem(`${key}-meta`);
    if (meta !== null) localStorage.setItem(`${newKey}-meta`, meta);
  }
}

export function removeIssueDocument(issueId: string) {
  const prefixes = ["iow-layout-", "iow-content-", "iow-palette-", "iow-font-", "iow-comments-", "iow-chat-", `iow-media-${issueId}-`];
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (key && prefixes.some((prefix) => key.startsWith(prefix) && (prefix.startsWith("iow-media-") || key === `${prefix}${issueId}`))) {
      localStorage.removeItem(key);
    }
  }
  void cloudRequest(`/issues/${encodeURIComponent(issueId)}`, { method: "DELETE" }).catch((error) => {
    window.dispatchEvent(new CustomEvent("iow-workspace-sync-error", { detail: error }));
  });
}
