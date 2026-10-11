import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router";
import { supabase } from "./supabaseClient";
import BrandLogo from "./BrandLogo";

type View = "signin" | "signup" | "forgot" | "reset" | "confirmation";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [view, setView] = useState<View>(() => new URLSearchParams(location.search).get("mode") === "reset" ? "reset" : "signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setView("reset");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      if (view === "signin") {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        const destination = (location.state as { from?: string } | null)?.from ?? "/";
        navigate(destination, { replace: true });
      } else if (view === "signup") {
        if (password.length < 8) throw new Error("Use at least eight characters for your password.");
        if (password !== confirmPassword) throw new Error("Passwords do not match.");
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name.trim() },
            emailRedirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
          },
        });
        if (authError) throw authError;
        if (data.session) navigate("/", { replace: true });
        else setView("confirmation");
      } else if (view === "forgot") {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}auth?mode=reset`,
        });
        if (authError) throw authError;
        setMessage("Check your inbox for a secure password-reset link.");
      } else if (view === "reset") {
        if (password.length < 8) throw new Error("Use at least eight characters for your password.");
        if (password !== confirmPassword) throw new Error("Passwords do not match.");
        const { error: authError } = await supabase.auth.updateUser({ password });
        if (authError) throw authError;
        setMessage("Password updated. Taking you back to the workspace…");
        window.setTimeout(() => navigate("/", { replace: true }), 900);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authentication could not be completed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell auth-screen grid min-h-screen bg-[#f8f5ed] text-[#171714] lg:grid-cols-[0.9fr_1.1fr]">
      <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-[#171714] p-12 text-white lg:flex xl:p-16">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full border border-[#ef5a35]/30" />
        <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full bg-[#ef5a35]" />
        <BrandLogo className="relative h-24 w-48 object-left" priority />
        <div className="relative max-w-lg">
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[#ef5a35]">The university newsroom</p>
          <h1 className="mt-6 font-serif text-7xl leading-[0.85] tracking-[-0.055em]">Every campus has a story worth editing well.</h1>
          <p className="mt-8 max-w-md text-sm leading-relaxed text-white/45">Plan, write, review, design, and publish every edition in one considered editorial workspace.</p>
        </div>
        <p className="relative text-[9px] uppercase tracking-[0.16em] text-white/25">Student-led · Editorially accountable · Made together</p>
      </section>

      <main className="grid min-h-screen place-items-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <BrandLogo className="mb-10 h-20 w-40 object-left lg:hidden" priority />
          {view === "confirmation" ? (
            <div className="border border-black/10 bg-white p-8">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[#dce9e1] text-xl text-[#315b4b]">✓</span>
              <h2 className="mt-7 font-serif text-4xl tracking-[-0.04em]">Check your inbox.</h2>
              <p className="mt-4 text-sm leading-relaxed text-black/50">We sent a confirmation link to <strong className="text-black">{email}</strong>. Confirm your address, then return to sign in.</p>
              <button className="mt-8 rounded-full bg-[#171714] px-5 py-3 text-[9px] font-bold uppercase tracking-[0.12em] text-white" onClick={() => setView("signin")} type="button">Back to sign in</button>
            </div>
          ) : (
            <>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#ef5a35]">{view === "signup" ? "Create your account" : view === "forgot" ? "Account recovery" : view === "reset" ? "Choose a new password" : "Welcome back"}</p>
              <h2 className="mt-3 font-serif text-5xl tracking-[-0.045em]">{view === "signup" ? "Join the newsroom." : view === "forgot" ? "Find your way back." : view === "reset" ? "Reset your password." : "Continue editing."}</h2>
              <p className="mt-4 text-xs leading-relaxed text-black/45">{view === "signin" ? "Sign in with your university editorial account." : view === "signup" ? "Use your university email when your institution requires it." : view === "forgot" ? "We’ll email you a secure reset link." : "Your new password must contain at least eight characters."}</p>
              <form className="mt-9 space-y-5" onSubmit={submit}>
                {view === "signup" && <label className="block"><span className="auth-label">Full name</span><input autoComplete="name" className="auth-input" onChange={(event) => setName(event.target.value)} required value={name} /></label>}
                {view !== "reset" && <label className="block"><span className="auth-label">Email address</span><input autoComplete="email" className="auth-input" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>}
                {(view === "signin" || view === "signup" || view === "reset") && <label className="block"><span className="auth-label">{view === "reset" ? "New password" : "Password"}</span><input autoComplete={view === "signin" ? "current-password" : "new-password"} className="auth-input" minLength={8} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} /></label>}
                {(view === "signup" || view === "reset") && <label className="block"><span className="auth-label">Confirm password</span><input autoComplete="new-password" className="auth-input" minLength={8} onChange={(event) => setConfirmPassword(event.target.value)} required type="password" value={confirmPassword} /></label>}
                {error && <p className="border border-red-200 bg-red-50 p-3 text-xs leading-relaxed text-red-700">{error}</p>}
                {message && <p className="border border-[#3e6a59]/25 bg-[#dce9e1] p-3 text-xs leading-relaxed text-[#315b4b]">{message}</p>}
                <button className="w-full rounded-full bg-[#ef5a35] px-5 py-3.5 text-[10px] font-bold uppercase tracking-[0.13em] text-white transition hover:bg-[#171714] disabled:cursor-wait disabled:opacity-60" disabled={loading} type="submit">{loading ? "Please wait…" : view === "signin" ? "Sign in" : view === "signup" ? "Create account" : view === "forgot" ? "Send reset link" : "Update password"}</button>
              </form>
              <div className="mt-7 flex flex-wrap items-center justify-between gap-3 text-[10px]">
                {view === "signin" && <><button className="text-black/45 hover:text-[#ef5a35]" onClick={() => { setError(""); setView("forgot"); }} type="button">Forgot password?</button><button className="font-semibold hover:text-[#ef5a35]" onClick={() => { setError(""); setView("signup"); }} type="button">Create an account</button></>}
                {(view === "signup" || view === "forgot") && <button className="font-semibold hover:text-[#ef5a35]" onClick={() => { setError(""); setView("signin"); }} type="button">Already have an account? Sign in</button>}
              </div>
              <p className="mt-10 border-t border-black/10 pt-5 text-[9px] leading-relaxed text-black/35">By continuing, you agree to follow your university’s privacy, acceptable-use, and editorial policies. Do not store sensitive student records in newsletter content.</p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
