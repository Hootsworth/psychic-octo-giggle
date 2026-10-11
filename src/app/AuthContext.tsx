import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { Navigate, Outlet, useLocation } from "react-router";
import { supabase } from "./supabaseClient";
import BrandLogo from "./BrandLogo";

type AuthValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [loading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

function AuthLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#eeece6]">
      <div className="text-center">
        <BrandLogo className="mx-auto h-20 w-36" priority />
        <p className="mt-4 text-[9px] font-bold uppercase tracking-[0.18em] text-black/40">Opening editorial workspace</p>
      </div>
    </div>
  );
}

export function ProtectedLayout() {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <AuthLoading />;
  if (!session) return <Navigate replace state={{ from: location.pathname }} to="/auth" />;
  return <Outlet />;
}

export function PublicOnly({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading) return <AuthLoading />;
  if (session) return <Navigate replace to="/" />;
  return children;
}
