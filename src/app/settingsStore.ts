export type AppTheme = "light" | "dark" | "system";
export type AiProvider = "openai" | "gemini";

export type AppPreferences = {
  theme: AppTheme;
  provider: AiProvider;
  openaiModel: string;
  geminiModel: string;
  openaiApiKey?: string;
  geminiApiKey?: string;
  openaiLimit: number;
  geminiLimit: number;
  tone: string;
  length: "shorter" | "same" | "longer";
  language: string;
  customInstruction: string;
};

export type AiUsage = {
  openai: number;
  gemini: number;
};

const key = "iow-app-preferences";
const usageKey = "iow-ai-usage";

export const defaultPreferences: AppPreferences = {
  theme: "system",
  provider: "openai",
  openaiModel: "gpt-4o-mini",
  geminiModel: "gemini-2.0-flash",
  openaiApiKey: "",
  geminiApiKey: "",
  openaiLimit: 20,
  geminiLimit: 25,
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
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  }
}

if (typeof window !== "undefined") {
  try {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", () => {
      const current = loadPreferences();
      if (current.theme === "system") {
        applyTheme("system");
      }
    });
  } catch {
    // ignore
  }
}

export function savePreferences(preferences: AppPreferences) {
  localStorage.setItem(key, JSON.stringify(preferences));
  applyTheme(preferences.theme);
  window.dispatchEvent(new CustomEvent("iow-preferences-change", { detail: preferences }));
}

export function loadAiUsage(): AiUsage {
  try {
    return { openai: 0, gemini: 0, ...JSON.parse(localStorage.getItem(usageKey) ?? "{}") };
  } catch {
    return { openai: 0, gemini: 0 };
  }
}

export function incrementAiUsage(provider: AiProvider): AiUsage {
  const current = loadAiUsage();
  const next: AiUsage = {
    ...current,
    [provider]: (current[provider] || 0) + 1,
  };
  localStorage.setItem(usageKey, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("iow-ai-usage-change", { detail: next }));
  return next;
}

export function resetAiUsage(provider?: AiProvider): AiUsage {
  const current = loadAiUsage();
  const next: AiUsage = provider
    ? { ...current, [provider]: 0 }
    : { openai: 0, gemini: 0 };
  localStorage.setItem(usageKey, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("iow-ai-usage-change", { detail: next }));
  return next;
}

export function checkAiQuota(provider: AiProvider, preferences?: AppPreferences) {
  const prefs = preferences ?? loadPreferences();
  const usage = loadAiUsage();
  const used = usage[provider] || 0;
  const limit = provider === "openai" ? prefs.openaiLimit : prefs.geminiLimit;
  const remaining = Math.max(0, limit - used);
  return {
    allowed: used < limit,
    used,
    limit,
    remaining,
  };
}
