import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

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
app.get("/make-server-c2909e49/health", (c) => {
  return c.json({ status: "ok" });
});

// AI Rewrite endpoint
app.post("/make-server-c2909e49/ai/rewrite", async (c) => {
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