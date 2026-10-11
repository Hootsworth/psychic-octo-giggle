import { useState } from "react";
import { Link } from "react-router";
import { loadPreferences, savePreferences, type AiProvider, type AppPreferences, type AppTheme } from "./settingsStore";
import BackIcon from "./BackIcon";
import BrandLogo from "./BrandLogo";

const providers = [
  { id: "openai", name: "OpenAI", secret: "OPENAI_API_KEY", description: "ChatGPT and compatible OpenAI models" },
  { id: "gemini", name: "Google Gemini", secret: "GEMINI_API_KEY", description: "Gemini Flash and Pro models" },
] as const;

export default function Settings() {
  const [preferences, setPreferences] = useState<AppPreferences>(loadPreferences);
  const [saved, setSaved] = useState(false);

  const update = <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => {
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    savePreferences(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1200);
  };

  return (
    <div className="app-shell settings-screen min-h-screen bg-[#eeece6] text-[#171714]">
      <header className="flex items-center justify-between border-b border-black/10 bg-[#f8f5ed] px-5 py-4 sm:px-8">
        <div className="flex items-center gap-4">
          <Link aria-label="Back to dashboard" className="grid h-9 w-9 place-items-center rounded-full border border-black/15 hover:bg-white" to="/" title="Back to dashboard"><BackIcon /></Link>
          <BrandLogo className="h-11 w-20" />
          <div><p className="font-serif text-xl italic">Settings</p><p className="text-[8px] uppercase tracking-[0.16em] text-black/40">Workspace preferences & integrations</p></div>
        </div>
        <span className={`text-[9px] uppercase tracking-[0.12em] text-[#3e6a59] transition-opacity ${saved ? "opacity-100" : "opacity-0"}`}>Preferences saved</span>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-5 py-10 lg:grid-cols-[230px_1fr] lg:px-8 lg:py-14">
        <aside>
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#ef5a35]">Workspace settings</p>
          <h1 className="mt-3 font-serif text-5xl tracking-[-0.045em]">Make it yours.</h1>
          <p className="mt-5 text-xs leading-relaxed text-black/45">Preferences apply to this browser. Provider credentials stay securely in Supabase and are never returned to the app.</p>
        </aside>

        <div className="space-y-6">
          <section className="border border-black/10 bg-[#f8f5ed] p-6 sm:p-8">
            <div className="mb-7"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#ef5a35]">Appearance</p><h2 className="mt-2 font-serif text-3xl">Interface theme</h2></div>
            <div className="grid gap-3 sm:grid-cols-3">
              {(["light", "dark", "system"] as AppTheme[]).map((theme) => (
                <button className={`border p-5 text-left transition ${preferences.theme === theme ? "border-[#ef5a35] bg-white" : "border-black/10 hover:border-black/30"}`} key={theme} onClick={() => update("theme", theme)} type="button">
                  <span className={`mb-4 block h-14 rounded border ${theme === "dark" ? "border-white/10 bg-[#171714]" : theme === "system" ? "bg-[linear-gradient(90deg,#f8f5ed_50%,#171714_50%)]" : "border-black/10 bg-[#f8f5ed]"}`} />
                  <span className="text-xs font-semibold capitalize">{theme}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="border border-black/10 bg-[#f8f5ed] p-6 sm:p-8">
            <div className="mb-7"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#ef5a35]">AI integrations</p><h2 className="mt-2 font-serif text-3xl">Provider & model</h2><p className="mt-2 text-xs leading-relaxed text-black/45">Keys are configured as encrypted Supabase Edge Function secrets.</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              {providers.map((provider) => (
                <button className={`border p-5 text-left transition ${preferences.provider === provider.id ? "border-[#ef5a35] bg-white" : "border-black/10 hover:border-black/30"}`} key={provider.id} onClick={() => update("provider", provider.id as AiProvider)} type="button">
                  <div className="flex items-center justify-between"><span className="font-serif text-2xl">{provider.name}</span><span className="rounded-full bg-[#dce9e1] px-2 py-1 text-[8px] font-bold uppercase tracking-[0.1em] text-[#315b4b]">Secret configured</span></div>
                  <p className="mt-2 text-[10px] text-black/45">{provider.description}</p>
                  <p className="mt-4 font-mono text-[8px] text-black/30">{provider.secret}</p>
                </button>
              ))}
            </div>
            <label className="mt-6 block">
              <span className="mb-2 block text-[9px] font-bold uppercase tracking-[0.13em] text-black/40">Model identifier</span>
              <input className="w-full border border-black/15 bg-transparent px-4 py-3 text-sm outline-none focus:border-[#ef5a35]" onChange={(event) => update(preferences.provider === "openai" ? "openaiModel" : "geminiModel", event.target.value)} placeholder={preferences.provider === "openai" ? "gpt-4o-mini" : "gemini-2.0-flash"} value={preferences.provider === "openai" ? preferences.openaiModel : preferences.geminiModel} />
              <span className="mt-2 block text-[9px] text-black/35">Enter any model currently supported by the selected provider.</span>
            </label>
          </section>

          <section className="border border-black/10 bg-[#f8f5ed] p-6 sm:p-8">
            <div className="mb-7"><p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#ef5a35]">Writing defaults</p><h2 className="mt-2 font-serif text-3xl">Rewrite preferences</h2></div>
            <div className="grid gap-5 sm:grid-cols-2">
              <label><span className="settings-label">Tone</span><select className="settings-input" onChange={(event) => update("tone", event.target.value)} value={preferences.tone}><option>Clear and editorial</option><option>Warm and conversational</option><option>Formal and academic</option><option>Concise and direct</option><option>Playful and energetic</option><option>Poetic and expressive</option></select></label>
              <label><span className="settings-label">Length</span><select className="settings-input" onChange={(event) => update("length", event.target.value as AppPreferences["length"])} value={preferences.length}><option value="shorter">Shorter</option><option value="same">About the same</option><option value="longer">More developed</option></select></label>
              <label><span className="settings-label">Language</span><input className="settings-input" onChange={(event) => update("language", event.target.value)} value={preferences.language} /></label>
              <label><span className="settings-label">Additional guidance</span><input className="settings-input" onChange={(event) => update("customInstruction", event.target.value)} value={preferences.customInstruction} /></label>
            </div>
          </section>

          <section className="border border-[#c19639]/30 bg-[#eee2c7] p-5">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#745c22]">Privacy note</p>
            <p className="mt-2 text-xs leading-relaxed text-[#65501f]">Selected text is sent to the chosen AI provider when Rewrite is pressed. Do not submit private student records, unpublished personal information, or sensitive institutional data.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
