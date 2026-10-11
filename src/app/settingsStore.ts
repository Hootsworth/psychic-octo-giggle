export type AppTheme = "light" | "dark" | "system";
export type AiProvider = "openai" | "gemini";

export type AppPreferences = {
  theme: AppTheme;
  provider: AiProvider;
  openaiModel: string;
  geminiModel: string;
  tone: string;
  length: "shorter" | "same" | "longer";
  language: string;
  customInstruction: string;
};

const key = "iow-app-preferences";
export const defaultPreferences: AppPreferences = {
  theme: "system",
  provider: "openai",
  openaiModel: "gpt-4o-mini",
  geminiModel: "gemini-2.0-flash",
  tone: "Clear and editorial",
  length: "same",
  language: "English",
  customInstruction: "Preserve names, dates, quotations, and factual meaning.",
};

export function loadPreferences(): AppPreferences {
  try {
    return { ...defaultPreferences, ...JSON.parse(localStorage.getItem(key) ?? "{}") };
  } catch {
    return defaultPreferences;
  }
}

export function applyTheme(theme: AppTheme) {
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

export function savePreferences(preferences: AppPreferences) {
  localStorage.setItem(key, JSON.stringify(preferences));
  applyTheme(preferences.theme);
  window.dispatchEvent(new CustomEvent("iow-preferences-change", { detail: preferences }));
}
