import { projectId } from "../../utils/supabase/info";
import { checkAiQuota, incrementAiUsage, type AppPreferences } from "./settingsStore";
import { authenticatedHeaders } from "./supabaseClient";

const endpoint = `https://${projectId}.supabase.co/functions/v1/make-server-c2909e49/ai/rewrite`;

export async function rewriteWithAi(text: string, preferences: AppPreferences, instruction: string) {
  // Check individual model quota
  const quota = checkAiQuota(preferences.provider, preferences);
  if (!quota.allowed) {
    const providerName = preferences.provider === "openai" ? "OpenAI" : "Google Gemini";
    throw new Error(
      `AI usage limit reached for ${providerName} (${quota.used}/${quota.limit} requests used). You can update your individual model limit or reset usage in Settings.`
    );
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: await authenticatedHeaders(),
    body: JSON.stringify({
      text,
      provider: preferences.provider,
      model: preferences.provider === "openai" ? preferences.openaiModel : preferences.geminiModel,
      tone: preferences.tone,
      length: preferences.length,
      language: preferences.language,
      instruction: instruction || preferences.customInstruction,
    }),
  });
  const responseText = await response.text();
  let body: { error?: string; text?: string };
  try {
    body = JSON.parse(responseText);
  } catch {
    const detail = responseText.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    throw new Error(
      response.status === 404
        ? "The AI endpoint is not deployed yet. Redeploy the Supabase Edge Function from Make settings."
        : detail
          ? `AI service returned an invalid response: ${detail.slice(0, 180)}`
          : `AI service is unavailable (${response.status}).`,
    );
  }
  if (!response.ok) throw new Error(body.error ?? `AI rewrite failed (${response.status})`);

  // Successfully generated: increment usage count for this specific model
  incrementAiUsage(preferences.provider);

  return String(body.text ?? "");
}
