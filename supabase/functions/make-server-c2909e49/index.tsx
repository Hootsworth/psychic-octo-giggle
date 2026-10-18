import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";
const app = new Hono();

const API_PREFIX = "/make-server-c2909e49";
const ISSUE_MEDIA_BUCKET = "newsletter-issue-media";
const SHARED_WORKSPACE_KEY = "workspace:shared";
const SHARED_PUBLISHING_KEY = "publishing:shared";
const admin = () => createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
let sharedWorkspaceMigration: Promise<any> | null = null;
let sharedPublishingMigration: Promise<any> | null = null;

function registerRoute(method: "GET" | "POST" | "PUT" | "DELETE", path: string, handler: any) {
  app.on(method, path, handler);
  app.on(method, `${API_PREFIX}${path}`, handler);
}

async function authenticatedUser(c: any) {
  const token = c.req.header("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) return null;
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getUser(token);
  return error ? null : data.user;
}

async function signedMedia(media: any[] = []) {
  const storage = admin().storage.from(ISSUE_MEDIA_BUCKET);
  return Promise.all(media.map(async (entry) => {
    const { data, error } = await storage.createSignedUrl(entry.path, 60 * 60 * 24 * 7);
    if (error) throw error;
    return { key: entry.key, value: data.signedUrl, meta: entry.meta ?? {} };
  }));
}

async function saveMedia(userId: string, issueId: string, incoming: any[] = [], previous: any[] = []) {
  if (!incoming.length && !previous.length) return { media: [], removed: [] };
  const storage = admin().storage.from(ISSUE_MEDIA_BUCKET);
  const { data: bucket } = await admin().storage.getBucket(ISSUE_MEDIA_BUCKET);
  const hasImageUploads = incoming.some((entry) => typeof entry?.value === "string" && entry.value.startsWith("data:image/"));
  if (!bucket && hasImageUploads) {
    const { error } = await admin().storage.createBucket(ISSUE_MEDIA_BUCKET, { public: false, fileSizeLimit: "8MB" });
    if (error && !error.message.toLowerCase().includes("already exists")) throw error;
  }
  const oldByKey = new Map(previous.map((entry) => [entry.key, entry]));
  const saved = [];
  const uploaded = [];
  for (const entry of incoming) {
    if (!entry || typeof entry.key !== "string") continue;
    if (typeof entry.value === "string" && entry.value.startsWith("data:image/")) {
      const match = entry.value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/);
      if (!match) continue;
      const binary = Uint8Array.from(atob(match[2]), (character) => character.charCodeAt(0));
      if (binary.byteLength > 8 * 1024 * 1024) throw new Error("Issue images must be 8 MB or smaller.");
      const extension = match[1].split("/")[1].replace("jpeg", "jpg").replace(/[^a-z0-9]/gi, "");
      const path = `${userId}/${issueId}/${encodeURIComponent(entry.key)}-${crypto.randomUUID()}.${extension}`;
      const { error } = await storage.upload(path, binary, { contentType: match[1], upsert: true });
      if (error) throw error;
      uploaded.push(path);
      saved.push({ key: entry.key, path, meta: entry.meta ?? {} });
      continue;
    }
    const existing = oldByKey.get(entry.key);
    if (existing) saved.push({ ...existing, meta: entry.meta ?? existing.meta ?? {} });
    else if (typeof entry.value === "string" && entry.value.startsWith("https://")) {
      try {
        const url = new URL(entry.value);
        const storageHost = new URL(Deno.env.get("SUPABASE_URL")!).host;
        const prefix = `/storage/v1/object/sign/${ISSUE_MEDIA_BUCKET}/`;
        if (url.host === storageHost && url.pathname.startsWith(prefix) && url.searchParams.has("token")) {
          saved.push({ key: entry.key, path: decodeURIComponent(url.pathname.slice(prefix.length)), meta: entry.meta ?? {} });
        }
      } catch { /* Ignore external URLs and malformed signed media references. */ }
    }
  }
  const retained = new Set(saved.map((entry) => entry.path));
  const removed = previous.filter((entry) => !retained.has(entry.path)).map((entry) => entry.path);
  return { media: saved, removed, uploaded };
}

function issueKey(userId: string, issueId: string) {
  return `issue:${userId}:${issueId}`;
}

function sharedIssueKey(issueId: string) {
  return `issue:shared:${issueId}`;
}

async function ensureSharedWorkspace() {
  const existing = await kv.get(SHARED_WORKSPACE_KEY);
  if (existing && Array.isArray(existing.issues) && Array.isArray(existing.folders) && existing.migrationVersion >= 2) return existing;
  if (sharedWorkspaceMigration) return await sharedWorkspaceMigration;

  sharedWorkspaceMigration = (async () => {
    if (existing && Array.isArray(existing.issues) && Array.isArray(existing.folders)) {
      const legacyDocuments = await kv.getEntriesByPrefix("issue:");
      const issueMap = new Map<string, any>(existing.issues.map((issue: any) => [issue.id, issue]));
      const bestDocuments = new Map<string, { document: any; stamp: number }>();

      for (const entry of legacyDocuments) {
        const match = entry.key.match(/^issue:([^:]+):(.+)$/);
        if (!match || match[1] === "shared" || !validIssueId(match[2])) continue;
        const issueId = match[2];
        const stamp = Date.parse(entry.value?.updatedAt ?? "") || 0;
        const current = bestDocuments.get(issueId);
        if (!current || stamp >= current.stamp) bestDocuments.set(issueId, { document: entry.value, stamp });
      }

      const docsToSave: Array<[string, any]> = [];
      for (const [issueId, candidate] of bestDocuments) {
        const currentDocument = await kv.get(sharedIssueKey(issueId));
        const currentStamp = Date.parse(currentDocument?.updatedAt ?? "") || 0;
        if (!currentDocument || candidate.stamp > currentStamp) {
          docsToSave.push([sharedIssueKey(issueId), candidate.document]);
        }

        const issue = issueMap.get(issueId);
        if (!issue) {
          const timestamp = candidate.document?.updatedAt ?? new Date().toISOString();
          issueMap.set(issueId, {
            id: issueId,
            title: "Recovered newsletter",
            week: "Recovered from a previous workspace",
            status: "draft",
            folderId: null,
            createdAt: timestamp,
            updatedAt: timestamp,
          });
        } else if (candidate.stamp > (Date.parse(issue.updatedAt ?? "") || 0)) {
          issueMap.set(issueId, { ...issue, updatedAt: candidate.document?.updatedAt ?? issue.updatedAt });
        }
      }

      if (docsToSave.length) await kv.mset(docsToSave.map(([key]) => key), docsToSave.map(([, document]) => document));
      const upgraded = {
        ...existing,
        ownerId: "shared",
        migrationVersion: 2,
        issues: [...issueMap.values()].sort((a, b) => (Date.parse(b.updatedAt ?? "") || 0) - (Date.parse(a.updatedAt ?? "") || 0)),
      };
      await kv.set(SHARED_WORKSPACE_KEY, upgraded);
      return upgraded;
    }

    const rows = await kv.getByPrefix("user:");
    const workspaces = rows.filter((value: any) => value && Array.isArray(value.issues) && Array.isArray(value.folders) && typeof value.ownerId === "string");
    const folders = new Map<string, any>();
    const issueCandidates = new Map<string, { issue: any; stamp: number }>();
    const documents = new Map<string, { document: any; stamp: number }>();

    for (const workspace of workspaces) {
      for (const folder of workspace.folders) {
        if (folder?.id && !folders.has(folder.id)) folders.set(folder.id, folder);
      }
      for (const issue of workspace.issues) {
        if (!issue?.id || !validIssueId(issue.id)) continue;
        const document = await kv.get(issueKey(workspace.ownerId, issue.id));
        const issueStamp = Date.parse(issue.updatedAt ?? issue.createdAt ?? "") || 0;
        const documentStamp = Date.parse(document?.updatedAt ?? "") || 0;
        const stamp = Math.max(issueStamp, documentStamp);
        const current = issueCandidates.get(issue.id);
        if (!current || stamp >= current.stamp) {
          issueCandidates.set(issue.id, { issue, stamp });
        }
        const currentDocument = documents.get(issue.id);
        if (document && (!currentDocument || documentStamp >= currentDocument.stamp)) {
          documents.set(issue.id, { document, stamp: documentStamp });
        }
      }
    }

    const issues = [...issueCandidates.entries()]
      .map(([issueId, { issue }]) => {
        const document = documents.get(issueId)?.document;
        return document?.updatedAt && Date.parse(document.updatedAt) > (Date.parse(issue.updatedAt ?? "") || 0)
          ? { ...issue, updatedAt: document.updatedAt }
          : issue;
      })
      .sort((a, b) => (Date.parse(b.updatedAt ?? "") || 0) - (Date.parse(a.updatedAt ?? "") || 0));

    // Copy each issue's newest saved document before publishing the shared index.
    for (const [issueId, candidate] of documents) await kv.set(sharedIssueKey(issueId), candidate.document);

    const shared = { folders: [...folders.values()], issues, ownerId: "shared", migrationVersion: 1 };
    await kv.set(SHARED_WORKSPACE_KEY, shared);
    return shared;
  })().finally(() => { sharedWorkspaceMigration = null; });

  return await sharedWorkspaceMigration;
}

async function ensureSharedPublishing() {
  const existing = await kv.get(SHARED_PUBLISHING_KEY);
  if (existing && Array.isArray(existing.releases) && Array.isArray(existing.campaigns)) return existing;
  if (sharedPublishingMigration) return await sharedPublishingMigration;

  sharedPublishingMigration = (async () => {
    const rows = await kv.getByPrefix("user:");
    const candidates = rows.filter((value: any) => value && Array.isArray(value.releases) && Array.isArray(value.campaigns));
    candidates.sort((a: any, b: any) =>
      (b.releases.length + b.campaigns.length + (b.deliveryLog?.length ?? 0)) -
      (a.releases.length + a.campaigns.length + (a.deliveryLog?.length ?? 0)));
    const primary = candidates[0];
    if (!primary) return null;

    const releases = new Map<string, any>();
    const campaigns = new Map<string, any>();
    const deliveryLog = new Map<string, any>();
    for (const candidate of candidates) {
      for (const release of candidate.releases ?? []) if (release?.id && !releases.has(release.id)) releases.set(release.id, release);
      for (const campaign of candidate.campaigns ?? []) if (campaign?.id && !campaigns.has(campaign.id)) campaigns.set(campaign.id, campaign);
      for (const entry of candidate.deliveryLog ?? []) if (entry?.id && !deliveryLog.has(entry.id)) deliveryLog.set(entry.id, entry);
    }

    const shared = {
      ...primary,
      releases: [...releases.values()],
      campaigns: [...campaigns.values()],
      deliveryLog: [...deliveryLog.values()],
    };
    await kv.set(SHARED_PUBLISHING_KEY, shared);
    return shared;
  })().finally(() => { sharedPublishingMigration = null; });

  return await sharedPublishingMigration;
}

function validIssueId(value: string) {
  return /^[a-zA-Z0-9_-]{1,160}$/.test(value);
}

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
registerRoute("GET", "/health", (c) => {
  return c.json({ status: "ok" });
});

// Every signed-in newsroom member uses the same issue index and documents.
registerRoute("GET", "/workspace", async (c) => {
  const user = await authenticatedUser(c);
  if (!user) return c.json({ error: "Authentication required." }, 401);
  try {
    return c.json(await ensureSharedWorkspace());
  } catch (error: any) {
    return c.json({ error: error.message ?? "Could not load workspace." }, 500);
  }
});

registerRoute("PUT", "/workspace", async (c) => {
  const user = await authenticatedUser(c);
  if (!user) return c.json({ error: "Authentication required." }, 401);
  if (Number(c.req.header("Content-Length") ?? 0) > 1024 * 1024) return c.json({ error: "Workspace payload is too large." }, 413);
  try {
    const value = await c.req.json();
    if (!value || !Array.isArray(value.issues) || !Array.isArray(value.folders)) return c.json({ error: "Invalid workspace data." }, 400);
    const current = await ensureSharedWorkspace();
    if (current.issues.length > 0 && value.issues.length === 0) {
      return c.json({ error: "Refusing to replace the shared newsroom with an empty workspace." }, 409);
    }
    await kv.set(SHARED_WORKSPACE_KEY, { ...value, ownerId: "shared" });
    return c.json({ ok: true });
  } catch (error: any) {
    return c.json({ error: error.message ?? "Could not save workspace." }, 500);
  }
});

registerRoute("GET", "/publishing", async (c) => {
  const user = await authenticatedUser(c);
  if (!user) return c.json({ error: "Authentication required." }, 401);
  try {
    return c.json(await ensureSharedPublishing());
  } catch (error: any) {
    return c.json({ error: error.message ?? "Could not load publishing data." }, 500);
  }
});

registerRoute("PUT", "/publishing", async (c) => {
  const user = await authenticatedUser(c);
  if (!user) return c.json({ error: "Authentication required." }, 401);
  if (Number(c.req.header("Content-Length") ?? 0) > 1024 * 1024) return c.json({ error: "Publishing payload is too large." }, 413);
  try {
    const value = await c.req.json();
    if (!value || !Array.isArray(value.releases) || !Array.isArray(value.campaigns) || !Array.isArray(value.deliveryLog)) {
      return c.json({ error: "Invalid publishing data." }, 400);
    }
    await kv.set(SHARED_PUBLISHING_KEY, value);
    return c.json({ ok: true });
  } catch (error: any) {
    return c.json({ error: error.message ?? "Could not save publishing data." }, 500);
  }
});

// Legacy per-user issue documents are migrated above. New saves use shared keys.
registerRoute("GET", "/issues/:issueId", async (c) => {
  const user = await authenticatedUser(c);
  if (!user) return c.json({ error: "Authentication required." }, 401);
  const issueId = c.req.param("issueId");
  if (!validIssueId(issueId)) return c.json({ error: "Invalid issue id." }, 400);
  try {
    await ensureSharedWorkspace();
    const value = await kv.get(sharedIssueKey(issueId)) ?? await kv.get(issueKey(user.id, issueId));
    if (!value) return c.json(null);
    return c.json({ ...value, media: await signedMedia(value.media) });
  } catch (error: any) {
    return c.json({ error: error.message ?? "Could not load issue." }, 500);
  }
});

registerRoute("PUT", "/issues/:issueId", async (c) => {
  const user = await authenticatedUser(c);
  if (!user) return c.json({ error: "Authentication required." }, 401);
  const issueId = c.req.param("issueId");
  if (!validIssueId(issueId)) return c.json({ error: "Invalid issue id." }, 400);
  if (Number(c.req.header("Content-Length") ?? 0) > 40 * 1024 * 1024) return c.json({ error: "Issue payload is too large." }, 413);
  try {
    const value = await c.req.json();
    if (!value || !Array.isArray(value.pages) || !Array.isArray(value.content) || typeof value.paletteId !== "string" || typeof value.fontId !== "string") {
      return c.json({ error: "Invalid issue document." }, 400);
    }
    await ensureSharedWorkspace();
    const key = sharedIssueKey(issueId);
    const previous = await kv.get(key);
    const mediaResult = await saveMedia(user.id, issueId, Array.isArray(value.media) ? value.media : [], previous?.media ?? []);
    const updatedAt = new Date().toISOString();
    const revision = crypto.randomUUID();
    const nextDocument = {
      issueId,
      pages: value.pages,
      content: value.content,
      paletteId: value.paletteId,
      fontId: value.fontId,
      freeformMode: value.freeformMode === true,
      media: mediaResult.media,
      comments: Array.isArray(value.comments) ? value.comments : [],
      chatMessages: Array.isArray(value.chatMessages) ? value.chatMessages : [],
      updatedAt,
      revision,
    };
    const usesRevision = typeof previous?.revision === "string";
    const expectedVersion = usesRevision
      ? (typeof value.baseRevision === "string" ? value.baseRevision : null)
      : (typeof value.baseUpdatedAt === "string" ? value.baseUpdatedAt : null);
    const didSave = await kv.setIfVersion(key, usesRevision ? "revision" : "updatedAt", expectedVersion, nextDocument);
    if (!didSave) {
      if (mediaResult.uploaded.length) await admin().storage.from(ISSUE_MEDIA_BUCKET).remove(mediaResult.uploaded);
      return c.json({ error: "This issue changed in another session. Your local edits are preserved; reload the latest issue before saving again." }, 409);
    }
    if (mediaResult.removed.length) await admin().storage.from(ISSUE_MEDIA_BUCKET).remove(mediaResult.removed);
    return c.json({ ok: true, updatedAt, revision, media: await signedMedia(mediaResult.media) });
  } catch (error: any) {
    return c.json({ error: error.message ?? "Could not save issue." }, 500);
  }
});

registerRoute("DELETE", "/issues/:issueId", async (c) => {
  const user = await authenticatedUser(c);
  if (!user) return c.json({ error: "Authentication required." }, 401);
  const issueId = c.req.param("issueId");
  if (!validIssueId(issueId)) return c.json({ error: "Invalid issue id." }, 400);
  try {
    const key = sharedIssueKey(issueId);
    await ensureSharedWorkspace();
    const previous = await kv.get(key);
    if (previous?.media?.length) {
      await admin().storage.from(ISSUE_MEDIA_BUCKET).remove(previous.media.map((entry: any) => entry.path));
    }
    await kv.del(key);
    return c.json({ ok: true });
  } catch (error: any) {
    return c.json({ error: error.message ?? "Could not delete issue." }, 500);
  }
});

// Published issues have a read-only public path for the archive and reader.
registerRoute("GET", "/public/archive", async (c) => {
  try {
    const workspace = await ensureSharedWorkspace();
    const issues = workspace.issues.filter((issue: any) => issue.status === "published");
    return c.json(issues);
  } catch (error: any) {
    return c.json({ error: error.message ?? "Could not load archive." }, 500);
  }
});

registerRoute("GET", "/public/issues/:issueId", async (c) => {
  const issueId = c.req.param("issueId");
  if (!validIssueId(issueId)) return c.json({ error: "Invalid issue id." }, 400);
  try {
    const workspace = await ensureSharedWorkspace();
    const issue = workspace.issues.find((entry: any) => entry.id === issueId && entry.status === "published");
    if (!issue) return c.json({ error: "Published issue not found." }, 404);
    const document = await kv.get(sharedIssueKey(issueId));
    if (!document) return c.json({ error: "Published issue content not found." }, 404);
    return c.json({ issue, document: { ...document, media: await signedMedia(document.media) } });
  } catch (error: any) {
    return c.json({ error: error.message ?? "Could not load published issue." }, 500);
  }
});

// AI Rewrite endpoint
registerRoute("POST", "/ai/rewrite", async (c) => {
  try {
    const { text, provider, model, tone, length, language, instruction } = await c.req.json();
    if (!text) {
      return c.json({ error: "No text provided for rewriting." }, 400);
    }

    const systemPrompt = `You are an expert editorial writer and copy editor for a high-quality university newsletter called "In Other Words".
Rewrite the provided text adhering to these parameters:
- Desired Tone: ${tone || "Clear and editorial"}
- Target Length: ${length || "same"}
- Language: ${language || "English"}
- Guidance: ${instruction || "Preserve names, dates, quotes, and factual meaning."}

Return only the rewritten text directly without conversational conversational prefixes or markdown formatting wrappers.`;

    if (provider === "openai") {
      const apiKey = Deno.env.get("OPENAI_API_KEY");
      if (!apiKey) {
        return c.json({ error: "OPENAI_API_KEY is not set in Supabase Edge Function secrets." }, 400);
      }
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model || "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return c.json({ error: data.error?.message || "OpenAI request failed." }, res.status);
      }
      return c.json({ text: data.choices?.[0]?.message?.content || "" });
    } else {
      // Google Gemini
      const apiKey = Deno.env.get("GEMINI_API_KEY");
      if (!apiKey) {
        return c.json({ error: "GEMINI_API_KEY is not set in Supabase Edge Function secrets." }, 400);
      }
      const geminiModel = model || "gemini-2.0-flash";
      const fullPrompt = `${systemPrompt}\n\nOriginal Text to Rewrite:\n${text}`;
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        return c.json({ error: data.error?.message || "Gemini request failed." }, res.status);
      }
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      return c.json({ text: reply });
    }
  } catch (err: any) {
    return c.json({ error: err.message || "Failed to process AI rewrite." }, 500);
  }
});

Deno.serve(app.fetch);
