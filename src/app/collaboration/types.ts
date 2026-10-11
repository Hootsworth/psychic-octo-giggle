export type Collaborator = {
  id: string;
  name: string;
  email: string;
  color: string;
  joinedAt: number;
};

export type CursorPosition = {
  id: string;
  name: string;
  email: string;
  color: string;
  xPercent: number; // 0 to 100% relative to #pdf-document
  yPercent: number; // 0 to 100% relative to #pdf-document
  lastMoved: number;
};

export type DocChangePayload = {
  type: "layout" | "content" | "palette" | "font" | "full" | "field_edit";
  data: any;
  senderId: string;
  senderName: string;
  timestamp: number;
};

export const AESTHETIC_COLLAB_PALETTE = [
  "#ef5a35", // Editorial Coral
  "#7c3aed", // Rich Iris
  "#059669", // Deep Emerald
  "#d97706", // Warm Ochre
  "#0284c7", // Sky Cerulean
  "#e11d48", // Crimson Rose
  "#0d9488", // Persian Teal
  "#9333ea", // Velvet Violet
  "#4f46e5", // Ultramarine Indigo
  "#ea580c", // Burnt Sienna
];

export function getAestheticColor(seed: string): string {
  if (!seed) return AESTHETIC_COLLAB_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AESTHETIC_COLLAB_PALETTE.length;
  return AESTHETIC_COLLAB_PALETTE[index];
}

export function getInitials(nameOrEmail: string): string {
  if (!nameOrEmail) return "U";
  const clean = nameOrEmail.split("@")[0].trim();
  const parts = clean.split(/[\s._-]+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}
