import { projectId } from "../../utils/supabase/info";
import { checkAiQuota, incrementAiUsage, type AppPreferences } from "./settingsStore";
import { authenticatedHeaders } from "./supabaseClient";

const edgeEndpoint = `https://${projectId}.supabase.co/functions/v1/make-server-c2909e49/ai/rewrite`;

export async function rewriteWithAi(text: string, preferences: AppPreferences, instruction: string) {
  // Check individual model quota
  const quota = checkAiQuota(preferences.provider, preferences);
  if (!quota.allowed) {
    const providerName = preferences.provider === "openai" ? "OpenAI" : "Google Gemini";
    throw new Error(
      `AI usage limit reached for ${providerName} (${quota.used}/${quota.limit} requests used). You can update your individual model limit or reset usage in Settings.`
    );
  }

  const systemPrompt = `You are an expert editorial writer and copy editor for a high-quality university newsletter called "In Other Words".
Rewrite the following text adhering to these parameters:
- Tone: ${preferences.tone || "Clear and editorial"}
- Target Length: ${preferences.length || "same"}
- Language: ${preferences.language || "English"}
- Direction: ${instruction || preferences.customInstruction || "Preserve names, dates, quotes, and factual meaning."}

Return only the polished rewritten text directly without conversational prefixes or markdown formatting wrappers.`;

  // 1. Direct Google Gemini API call if key is provided in Settings
  if (preferences.provider === "gemini" && preferences.geminiApiKey?.trim()) {
    const geminiKey = preferences.geminiApiKey.trim();
    const model = preferences.geminiModel || "gemini-2.0-flash";
    const fullPrompt = `${systemPrompt}\n\nOriginal text to rewrite:\n${text}`;
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: { temperature: 0.7 },
        }),
      },
    );

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || `Google Gemini request failed (${response.status})`);
    }

    const rewritten = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!rewritten) throw new Error("Gemini returned an empty response.");

    incrementAiUsage("gemini");
    return rewritten;
  }

  // 2. Direct OpenAI API call if key is provided in Settings
  if (preferences.provider === "openai" && preferences.openaiApiKey?.trim()) {
    const openaiKey = preferences.openaiApiKey.trim();
    const model = preferences.openaiModel || "gpt-4o-mini";

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || `OpenAI request failed (${response.status})`);
    }

    const rewritten = data.choices?.[0]?.message?.content?.trim();
    if (!rewritten) throw new Error("OpenAI returned an empty response.");

    incrementAiUsage("openai");
    return rewritten;
  }

  // 3. Fallback to Supabase Edge Function
  try {
    const response = await fetch(edgeEndpoint, {
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
    let body: { error?: string; text?: string } = {};
    try {
      body = JSON.parse(responseText);
    } catch {
      // not json
    }

    if (response.ok && body.text) {
      incrementAiUsage(preferences.provider);
      return String(body.text);
    }

    if (response.status === 404 || !response.ok) {
      const providerName = preferences.provider === "openai" ? "OpenAI" : "Google Gemini";
      throw new Error(
        `AI service is not configured on the server yet. You can activate it immediately by adding your free ${providerName} API key in Settings → AI Integrations (Google Gemini provides free keys at aistudio.google.com).`
      );
    }
  } catch (err: any) {
    if (err.message?.includes("free")) {
      throw err;
    }
    const providerName = preferences.provider === "openai" ? "OpenAI" : "Google Gemini";
    throw new Error(
      `AI service is not configured on the server yet. You can activate it immediately by adding your free ${providerName} API key in Settings → AI Integrations (Google Gemini provides free keys at aistudio.google.com).`
    );
  }

  throw new Error("Unable to complete AI rewrite. Please check your API key in Settings.");
}
