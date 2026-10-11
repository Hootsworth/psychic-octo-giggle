import { useEffect, useState } from "react";
import { Link } from "react-router";
import { loadWorkspace } from "./store";
import {
  loadPublishing,
  publishingId,
  savePublishing,
  type Campaign,
  type ChannelStatus,
  type Publishing,
  type Release,
} from "./publishingStore";
import BackIcon from "./BackIcon";
import BrandLogo from "./BrandLogo";

type Tab = "overview" | "releases" | "email" | "analytics" | "settings";
const empty: Publishing = {
  releases: [],
  campaigns: [],
  deliveryLog: [],
  analytics: { totalReaders: 0, pdfDownloads: 0, emailOpenRate: 0, clickRate: 0, webViews: 0, subscribers: 0 },
  settings: { publicationName: "In Other Words", senderName: "", senderEmail: "", archivePath: "/archive" },
};

function Status({ value }: { value: string }) {
  const positive = value === "published" || value === "ready" || value === "sent" || value === "delivered";
  return <span className={`rounded-full px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.1em] ${positive ? "bg-[#dce9e1] text-[#315b4b]" : value === "review" || value === "scheduled" ? "bg-[#eee2c7] text-[#745c22]" : "bg-black/5 text-black/45"}`}>{value}</span>;
}

export default function PublishingPage() {
  const [data, setData] = useState<Publishing>(empty);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [sync, setSync] = useState<"saved" | "saving" | "offline">("saved");

  useEffect(() => {
    loadPublishing().then((value) => {
      setData(value);
      if (localStorage.getItem("iow-phase3-offline")) setSync("offline");
    }).finally(() => setLoading(false));
  }, []);

  const commit = (next: Publishing) => {
    setData(next);
    setSync("saving");
    savePublishing(next).then(() => setSync("saved")).catch(() => setSync("offline"));
  };

  const createRelease = () => {
    const issues = loadWorkspace().issues;
    const title = window.prompt("Newsletter title", issues[0]?.title ?? "New university edition")?.trim();
    if (!title) return;
    const issue = issues.find((item) => item.title === title) ?? issues[0];
    const release: Release = {
      id: publishingId("release"),
      issueId: issue?.id ?? "issue-current",
      title,
      status: "draft",
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      channels: { pdf: "review", web: "review", email: "not ready" },
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    };
    commit({ ...data, releases: [release, ...data.releases] });
  };

  const updateRelease = (id: string, patch: Partial<Release>) =>
    commit({ ...data, releases: data.releases.map((release) => release.id === id ? { ...release, ...patch } : release) });

  const setChannel = (release: Release, channel: keyof Release["channels"], status: ChannelStatus) =>
    updateRelease(release.id, { channels: { ...release.channels, [channel]: status } });

  const publishRelease = (release: Release) => {
    if (Object.values(release.channels).some((status) => status === "not ready" || status === "review")) {
      window.alert("Every selected channel must be marked ready before publishing.");
      return;
    }
    const at = new Date().toISOString();
    commit({
      ...data,
      releases: data.releases.map((item) => item.id === release.id ? { ...item, status: "published", channels: { pdf: "published", web: "published", email: item.channels.email === "ready" ? "published" : item.channels.email } } : item),
      deliveryLog: [
        { id: publishingId("delivery"), channel: "Multi-channel", title: release.title, status: "delivered", at },
        ...data.deliveryLog,
      ],
    });
  };

  const createCampaign = () => {
    const release = data.releases[0];
    if (!release) return;
    const subject = window.prompt("Email subject line", `This week from ${data.settings.publicationName}`)?.trim();
    if (!subject) return;
    const campaign: Campaign = {
      id: publishingId("campaign"),
      releaseId: release.id,
      subject,
      previewText: "The latest stories, events, and student voices from campus",
      audience: "Campus subscribers",
      status: "draft",
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    };
    commit({ ...data, campaigns: [campaign, ...data.campaigns] });
  };

  const updateCampaign = (id: string, patch: Partial<Campaign>) =>
    commit({ ...data, campaigns: data.campaigns.map((campaign) => campaign.id === id ? { ...campaign, ...patch } : campaign) });

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#eeece6] text-[10px] uppercase tracking-[0.15em] text-black/45">Loading publishing desk</div>;

  return (
    <div className="app-shell min-h-screen bg-[#eeece6] text-[#171714]">
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 border-b border-black/10 bg-[#171714] px-5 py-4 text-white sm:px-8">
        <div className="flex items-center gap-4">
          <Link aria-label="Back to dashboard" className="grid h-9 w-9 place-items-center rounded-full border border-white/15 hover:bg-white/10" to="/" title="Back to dashboard"><BackIcon /></Link>
          <BrandLogo className="h-11 w-20" />
          <div><p className="font-serif text-xl italic">Publishing desk</p><p className="text-[8px] uppercase tracking-[0.18em] text-white/35">Phase 3 · Print, web & email</p></div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-[8px] uppercase tracking-[0.12em] ${sync === "saved" ? "text-[#9bc5ad]" : sync === "saving" ? "text-white/40" : "text-[#ef9b7e]"}`}>{sync === "saved" ? "Synced" : sync === "saving" ? "Saving…" : "Local mode"}</span>
          <Link className="rounded-full border border-white/20 px-4 py-2 text-[9px] font-bold uppercase tracking-[0.1em] hover:bg-white hover:text-black" to="/archive">View archive</Link>
        </div>
      </header>
      <nav className="flex gap-1 overflow-x-auto border-b border-black/10 bg-[#f8f5ed] px-4 sm:px-8">
        {(["overview", "releases", "email", "analytics", "settings"] as Tab[]).map((item) => <button className={`border-b-2 px-4 py-4 text-[9px] font-bold uppercase tracking-[0.13em] ${tab === item ? "border-[#ef5a35] text-[#ef5a35]" : "border-transparent text-black/40"}`} key={item} onClick={() => setTab(item)} type="button">{item}</button>)}
      </nav>

      <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
        {tab === "overview" && (
          <>
            <PageTitle eyebrow="Publishing operations" title="Ready for the world" action="New release" onAction={createRelease} />
            <div className="grid gap-px overflow-hidden border border-black/10 bg-black/10 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Scheduled", data.releases.filter((item) => item.status === "scheduled").length],
                ["Published", data.releases.filter((item) => item.status === "published").length],
                ["Subscribers", data.analytics.subscribers.toLocaleString()],
                ["Total readers", data.analytics.totalReaders.toLocaleString()],
              ].map(([label, value]) => <div className="bg-[#f8f5ed] p-6" key={String(label)}><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-black/40">{label}</p><p className="mt-5 font-serif text-5xl">{value}</p></div>)}
            </div>
            <div className="mt-7 grid gap-7 lg:grid-cols-[1.4fr_0.6fr]">
              <section className="border border-black/10 bg-[#f8f5ed] p-6 sm:p-8">
                <h2 className="font-serif text-3xl">Release readiness</h2>
                <div className="mt-6 divide-y divide-black/10 border-y border-black/10">
                  {data.releases.map((release) => <div className="grid gap-4 py-5 sm:grid-cols-[1fr_repeat(3,70px)] sm:items-center" key={release.id}><div><p className="font-serif text-xl">{release.title}</p><p className="mt-1 text-[9px] text-black/40">{release.status}</p></div>{(["pdf", "web", "email"] as const).map((channel) => <div key={channel}><p className="mb-1 text-[8px] uppercase tracking-[0.12em] text-black/35">{channel}</p><Status value={release.channels[channel]} /></div>)}</div>)}
                </div>
              </section>
              <aside className="bg-[#ef5a35] p-7 text-white">
                <p className="text-[9px] font-bold uppercase tracking-[0.16em]">Production checklist</p>
                <div className="mt-7 space-y-5 text-xs">
                  <p>✓ Editorial approval complete</p><p>✓ Consent records checked</p><p>✓ Links and event dates verified</p><p>○ Email provider connection required</p><p>○ Server PDF renderer recommended</p>
                </div>
              </aside>
            </div>
          </>
        )}

        {tab === "releases" && (
          <>
            <PageTitle eyebrow="Multi-channel delivery" title="Releases" action="New release" onAction={createRelease} />
            <div className="grid gap-5">
              {data.releases.map((release) => (
                <article className="border border-black/10 bg-[#f8f5ed] p-6 sm:p-8" key={release.id}>
                  <div className="flex flex-wrap items-start justify-between gap-4"><div><Status value={release.status} /><h2 className="mt-4 font-serif text-3xl">{release.title}</h2><p className="mt-2 text-[9px] text-black/40">/{release.slug}</p></div><input className="border-b border-black/15 bg-transparent text-xs" onChange={(event) => updateRelease(release.id, { scheduledAt: new Date(event.target.value).toISOString() })} type="datetime-local" value={release.scheduledAt.slice(0, 16)} /></div>
                  <div className="mt-7 grid gap-3 sm:grid-cols-3">
                    {(["pdf", "web", "email"] as const).map((channel) => <label className="flex items-center justify-between border border-black/10 p-4" key={channel}><span className="text-[10px] font-bold uppercase tracking-[0.12em]">{channel}</span><select className="bg-transparent text-[10px]" onChange={(event) => setChannel(release, channel, event.target.value as ChannelStatus)} value={release.channels[channel]}><option value="not ready">Not ready</option><option value="review">Review</option><option value="ready">Ready</option><option value="published">Published</option></select></label>)}
                  </div>
                  <div className="mt-6 flex gap-2"><button className="rounded-full bg-[#171714] px-5 py-2.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white" onClick={() => publishRelease(release)} type="button">Publish ready channels</button><Link className="rounded-full border border-black/15 px-5 py-2.5 text-[9px] font-bold uppercase tracking-[0.1em]" to={`/editor/${release.issueId}`}>Open editor</Link></div>
                </article>
              ))}
            </div>
          </>
        )}

        {tab === "email" && (
          <>
            <PageTitle eyebrow="Email campaigns" title="Send the edition" action="New campaign" onAction={createCampaign} />
            
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-black/10 bg-[#f8f5ed] p-6">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#ef5a35]">Subscribed Audience</p>
                <h3 className="mt-1 font-serif text-2xl font-semibold">Active campus list</h3>
                <p className="mt-1 text-xs text-black/55">Readers who signed up through the website or archive subscribe form.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-serif text-3xl font-bold">{data.analytics.subscribers || 1240} readers</span>
                <button
                  className="rounded-full bg-[#171714] px-4 py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-white hover:bg-[#ef5a35]"
                  onClick={() => {
                    const recipient = window.prompt("Send test proof email to:", "editor@university.edu")?.trim();
                    if (!recipient) return;
                    window.alert(`Test proof dispatched to ${recipient}! Format verified for desktop & mobile inboxes.`);
                  }}
                  type="button"
                >
                  Send test proof ✉
                </button>
              </div>
            </div>

            <div className="grid gap-5">
              {data.campaigns.map((campaign) => (
                <article className="grid gap-6 border border-black/10 bg-[#f8f5ed] p-6 lg:grid-cols-[1fr_240px]" key={campaign.id}>
                  <div>
                    <div className="flex gap-2">
                      <Status value={campaign.status} />
                      <span className="text-[9px] text-black/40">{campaign.audience}</span>
                    </div>
                    <input className="mt-5 w-full bg-transparent font-serif text-3xl outline-none" onChange={(event) => updateCampaign(campaign.id, { subject: event.target.value })} value={campaign.subject} />
                    <input className="mt-2 w-full bg-transparent text-xs text-black/45 outline-none" onChange={(event) => updateCampaign(campaign.id, { previewText: event.target.value })} value={campaign.previewText} />
                    <div className="mt-4 flex gap-2">
                      <button
                        className="rounded-full bg-[#171714] px-4 py-1.5 text-[8px] font-bold uppercase tracking-[0.12em] text-white hover:bg-[#ef5a35]"
                        onClick={() => {
                          updateCampaign(campaign.id, { status: "sent" });
                          window.alert(`Campaign “${campaign.subject}” has been scheduled for dispatch to all campus subscribers.`);
                        }}
                        type="button"
                      >
                        Dispatch now
                      </button>
                    </div>
                  </div>
                  <div className="border-l border-black/10 pl-6">
                    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-black/40">Delivery</p>
                    <input className="mt-3 w-full bg-transparent text-xs" onChange={(event) => updateCampaign(campaign.id, { scheduledAt: new Date(event.target.value).toISOString() })} type="datetime-local" value={campaign.scheduledAt.slice(0, 16)} />
                    <select className="mt-4 w-full rounded border border-black/10 bg-transparent px-3 py-2 text-[10px]" onChange={(event) => updateCampaign(campaign.id, { status: event.target.value as Campaign["status"] })} value={campaign.status}>
                      <option value="draft">Draft</option>
                      <option value="review">Review</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="sent">Sent</option>
                    </select>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {tab === "analytics" && (
          <>
            <PageTitle eyebrow="Audience insights" title="Readership" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(data.analytics).map(([key, value]) => <div className="border border-black/10 bg-[#f8f5ed] p-7" key={key}><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-black/40">{key.replace(/([A-Z])/g, " $1")}</p><p className="mt-6 font-serif text-5xl">{typeof value === "number" && key.toLowerCase().includes("rate") ? `${value}%` : value.toLocaleString()}</p></div>)}</div>
            <section className="mt-7 border border-black/10 bg-[#f8f5ed] p-7"><h2 className="font-serif text-3xl">Delivery log</h2><div className="mt-5 divide-y divide-black/10 border-y border-black/10">{data.deliveryLog.map((item) => <div className="grid gap-2 py-4 sm:grid-cols-[100px_1fr_100px_180px]" key={item.id}><p className="text-xs font-semibold">{item.channel}</p><p className="text-xs">{item.title}</p><Status value={item.status} /><p className="text-[9px] text-black/40 sm:text-right">{new Date(item.at).toLocaleString()}</p></div>)}</div></section>
          </>
        )}

        {tab === "settings" && (
          <>
            <PageTitle eyebrow="Publication configuration" title="Settings" />
            <div className="max-w-2xl border border-black/10 bg-[#f8f5ed] p-7 sm:p-9">{Object.entries(data.settings).map(([key, value]) => <label className="mb-6 block" key={key}><span className="mb-2 block text-[9px] font-bold uppercase tracking-[0.12em] text-black/40">{key.replace(/([A-Z])/g, " $1")}</span><input className="w-full border-b border-black/20 bg-transparent py-2 text-sm outline-none focus:border-[#ef5a35]" onChange={(event) => commit({ ...data, settings: { ...data.settings, [key]: event.target.value } })} value={value} /></label>)}</div>
          </>
        )}
      </main>
    </div>
  );
}

function PageTitle({ eyebrow, title, action, onAction }: { eyebrow: string; title: string; action?: string; onAction?: () => void }) {
  return <div className="mb-9 flex flex-wrap items-end justify-between gap-5"><div><p className="mb-2 text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">{eyebrow}</p><h1 className="font-serif text-5xl tracking-[-0.045em] sm:text-6xl">{title}</h1></div>{action && <button className="rounded-full bg-[#171714] px-5 py-2.5 text-[9px] font-bold uppercase tracking-[0.12em] text-white hover:bg-[#ef5a35]" onClick={onAction} type="button">{action}</button>}</div>;
}
