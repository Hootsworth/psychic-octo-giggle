import { projectId } from "../../utils/supabase/info";
import { authenticatedHeaders } from "./supabaseClient";

export type ChannelStatus = "not ready" | "review" | "ready" | "published";
export type Release = {
  id: string;
  issueId: string;
  title: string;
  status: "draft" | "scheduled" | "published" | "failed";
  scheduledAt: string;
  channels: { pdf: ChannelStatus; web: ChannelStatus; email: ChannelStatus };
  slug: string;
};
export type Campaign = {
  id: string;
  releaseId: string;
  subject: string;
  previewText: string;
  audience: string;
  status: "draft" | "review" | "scheduled" | "sent";
  scheduledAt: string;
};
export type Publishing = {
  releases: Release[];
  campaigns: Campaign[];
  deliveryLog: { id: string; channel: string; title: string; status: string; at: string }[];
  analytics: { totalReaders: number; pdfDownloads: number; emailOpenRate: number; clickRate: number; webViews: number; subscribers: number };
  settings: { publicationName: string; senderName: string; senderEmail: string; archivePath: string };
};

const endpoint = `https://${projectId}.supabase.co/functions/v1/make-server-c2909e49/publishing`;
const fallbackKey = "iow-phase3-publishing";
const offlineKey = "iow-phase3-offline";
const demo: Publishing = {
  releases: [
    { id: "release-1", issueId: "issue-current", title: "Back to where ideas begin", status: "scheduled", scheduledAt: "2025-09-28T09:00:00.000Z", channels: { pdf: "ready", web: "ready", email: "review" }, slug: "back-to-where-ideas-begin" },
    { id: "release-2", issueId: "issue-summer", title: "Notes from a Quiet Campus", status: "published", scheduledAt: "2025-06-22T09:00:00.000Z", channels: { pdf: "published", web: "published", email: "published" }, slug: "notes-from-a-quiet-campus" },
  ],
  campaigns: [
    { id: "campaign-1", releaseId: "release-1", subject: "This week: ideas, poems, and news from campus", previewText: "The latest edition of In Other Words", audience: "Campus subscribers", status: "draft", scheduledAt: "2025-09-28T09:15:00.000Z" },
  ],
  deliveryLog: [
    { id: "delivery-1", channel: "Web", title: "Notes from a Quiet Campus", status: "delivered", at: "2025-06-22T09:00:00.000Z" },
    { id: "delivery-2", channel: "Email", title: "Notes from a Quiet Campus", status: "delivered", at: "2025-06-22T09:15:00.000Z" },
  ],
  analytics: { totalReaders: 2847, pdfDownloads: 416, emailOpenRate: 62.4, clickRate: 18.7, webViews: 3921, subscribers: 1240 },
  settings: { publicationName: "In Other Words", senderName: "University Editorial Team", senderEmail: "newsletter@university.edu", archivePath: "/archive" },
};

export const publishingId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export async function loadPublishing(): Promise<Publishing> {
  try {
    const response = await fetch(endpoint, { headers: await authenticatedHeaders() });
    if (!response.ok) throw new Error(await response.text());
    const value = (await response.json()) as Publishing;
    localStorage.setItem(fallbackKey, JSON.stringify(value));
    localStorage.removeItem(offlineKey);
    return value;
  } catch {
    localStorage.setItem(offlineKey, "true");
    const fallback = localStorage.getItem(fallbackKey);
    if (fallback) return JSON.parse(fallback) as Publishing;
    localStorage.setItem(fallbackKey, JSON.stringify(demo));
    return demo;
  }
}

export async function savePublishing(value: Publishing) {
  localStorage.setItem(fallbackKey, JSON.stringify(value));
  const response = await fetch(endpoint, {
    method: "PUT",
    headers: await authenticatedHeaders(),
    body: JSON.stringify(value),
  });
  if (!response.ok) throw new Error(await response.text());
  localStorage.removeItem(offlineKey);
}
