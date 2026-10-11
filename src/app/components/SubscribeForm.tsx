import { useState, useEffect } from "react";

const SUBSCRIBERS_KEY = "iow-subscribers-list";

export function getSubscribers(): string[] {
  try {
    const list = localStorage.getItem(SUBSCRIBERS_KEY);
    return list ? JSON.parse(list) : ["campus.reader@university.edu", "student.life@university.edu"];
  } catch {
    return [];
  }
}

export function addSubscriber(email: string): boolean {
  const clean = email.trim().toLowerCase();
  if (!clean || !clean.includes("@")) return false;
  const list = getSubscribers();
  if (list.includes(clean)) return true;
  const next = [clean, ...list];
  localStorage.setItem(SUBSCRIBERS_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("iow-subscribers-updated", { detail: next }));
  return true;
}

export default function SubscribeForm({
  variant = "card",
  className = "",
}: {
  variant?: "card" | "banner" | "minimal";
  className?: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "invalid">("idle");
  const [count, setCount] = useState(() => getSubscribers().length);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const list = (e as CustomEvent).detail;
      if (Array.isArray(list)) setCount(list.length);
    };
    window.addEventListener("iow-subscribers-updated", handleUpdate);
    return () => window.removeEventListener("iow-subscribers-updated", handleUpdate);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      setStatus("invalid");
      return;
    }
    addSubscriber(email);
    setStatus("success");
    setEmail("");
  };

  if (variant === "minimal") {
    return (
      <form className={`flex max-w-md gap-2 ${className}`} onSubmit={handleSubmit}>
        <input
          aria-label="Email address"
          className="min-w-0 flex-1 rounded-full border border-black/20 bg-white px-4 py-2 text-xs outline-none focus:border-[#ef5a35]"
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your.email@university.edu"
          required
          type="email"
          value={email}
        />
        <button
          className="rounded-full bg-[#171714] px-5 py-2 text-[9px] font-bold uppercase tracking-[0.14em] text-white hover:bg-[#ef5a35]"
          type="submit"
        >
          {status === "success" ? "Subscribed!" : "Subscribe"}
        </button>
      </form>
    );
  }

  return (
    <div
      className={`border border-black/15 bg-[#f8f5ed] p-8 text-[#171714] ${className}`}
    >
      <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">
        The University Edition Dispatch
      </p>
      <h3 className="mt-3 font-serif text-3xl sm:text-4xl">
        Every issue delivered to your inbox.
      </h3>
      <p className="mt-3 max-w-lg text-xs leading-relaxed text-black/60">
        Student journalism, campus literature, photographs, event schedules, and voices from across the university. Read by {count.toLocaleString()} students, faculty, and alumni.
      </p>

      {status === "success" ? (
        <div className="mt-6 flex items-center gap-3 rounded-lg border border-[#315b4b]/20 bg-[#dce9e1] p-4 text-xs font-semibold text-[#315b4b]">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-[#315b4b] text-white">✓</span>
          <span>You’re subscribed! You will receive the next edition as soon as it goes to print.</span>
        </div>
      ) : (
        <form className="mt-6 flex flex-wrap gap-2" onSubmit={handleSubmit}>
          <input
            aria-label="Email address"
            className="min-w-0 flex-1 rounded-full border border-black/20 bg-white px-5 py-3 text-xs outline-none focus:border-[#ef5a35]"
            onChange={(e) => {
              setEmail(e.target.value);
              if (status === "invalid") setStatus("idle");
            }}
            placeholder="Enter your student or university email"
            required
            type="email"
            value={email}
          />
          <button
            className="rounded-full bg-[#171714] px-7 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white transition-colors hover:bg-[#ef5a35]"
            type="submit"
          >
            Subscribe free →
          </button>
        </form>
      )}

      {status === "invalid" && (
        <p className="mt-2 text-[10px] text-red-600">Please enter a valid email address.</p>
      )}
    </div>
  );
}
