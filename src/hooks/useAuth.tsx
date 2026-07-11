import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

function friendlyGoogleError(message: string, status?: number | null) {
  const m = message.toLowerCase();
  if (
    status === 400 ||
    m.includes("provider") ||
    m.includes("oauth secret") ||
    m.includes("unsupported provider") ||
    m.includes("missing oauth")
  ) {
    return "Google sign-in isn't configured yet. In Supabase → Authentication → Providers → Google, add your Client ID and Client Secret, then add this site URL under Redirect URLs.";
  }
  return message;
}

type Profile = {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  trust_score: number;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  setAuthModalOpen: (v: boolean) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  displayName: string;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
        setUser(data.session?.user ?? null);
      })
      .finally(() => setLoading(false));

    // Surface OAuth errors when Supabase redirects back with ?error= / #error=
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const oauthError =
        params.get("error_description") ||
        params.get("error") ||
        hash.get("error_description") ||
        hash.get("error");
      if (oauthError) {
        console.warn("[auth] OAuth error:", oauthError);
        window.sessionStorage.setItem("findr.oauth_error", oauthError);
        // Clean the URL so refresh doesn't re-show it
        window.history.replaceState({}, "", window.location.pathname);
        setAuthModalOpen(true);
      }
    }

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setProfile(null);
      return;
    }
    supabase
      .from("profiles")
      .select("id, display_name, email, avatar_url, trust_score")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setProfile(data as Profile);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
        data: { display_name: name || email.split("@")[0] },
      },
    });
    if (error) throw error;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : undefined;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: origin,
        skipBrowserRedirect: true,
        queryParams: {
          access_type: "online",
          prompt: "select_account",
        },
      },
    });
    if (error) {
      throw new Error(friendlyGoogleError(error.message, error.status));
    }
    if (!data?.url) {
      throw new Error("Google sign-in did not return a redirect URL. Try again.");
    }

    // Avoid navigating into Supabase's blank error page when Google isn't configured.
    try {
      const probe = await fetch(data.url, { method: "GET", redirect: "manual" });
      if (probe.status === 400 || probe.status === 401 || probe.status === 422) {
        const body = await probe.text();
        let msg = body;
        try {
          const parsed = JSON.parse(body) as { msg?: string; error_description?: string; message?: string };
          msg = parsed.msg || parsed.error_description || parsed.message || body;
        } catch {
          /* keep raw */
        }
        throw new Error(friendlyGoogleError(msg, probe.status));
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("Google")) throw err;
      if (err instanceof Error && /oauth|provider|secret|configured/i.test(err.message)) throw err;
      // Network/CORS on probe — still attempt the real redirect.
    }

    window.location.assign(data.url);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const displayName = useMemo(() => {
    return (
      profile?.display_name ||
      (user?.user_metadata?.display_name as string | undefined) ||
      (user?.user_metadata?.full_name as string | undefined) ||
      (user?.user_metadata?.name as string | undefined) ||
      user?.email?.split("@")[0] ||
      "Guest"
    );
  }, [profile, user]);

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      loading,
      isAuthModalOpen,
      setAuthModalOpen,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      displayName,
    }),
    [
      user,
      session,
      profile,
      loading,
      isAuthModalOpen,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      displayName,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
