import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Lock, Mail, UserRound } from "lucide-react";
import { GlassCard } from "@/components/GlassCard";
import { pushToast } from "@/components/NotificationToast";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { title: "Sign in · FindrAI" },
      {
        name: "description",
        content:
          "Sign in or create your FindrAI account to file reports and open secure recovery chats.",
      },
    ],
  }),
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading, signIn, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        await signUp(displayName, email, password);
        pushToast({
          title: "Account created",
          body: "Check your email if email confirmation is required.",
          tone: "verify",
        });
      } else {
        await signIn(email, password);
        pushToast({ title: "Welcome back", body: "You're signed in.", tone: "verify" });
      }
      navigate({ to: "/dashboard" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setErr(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Google sign-in failed");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="mb-6 text-center">
        <div className="text-xs uppercase tracking-[0.25em] text-gold">FindrAI</div>
        <h1 className="mt-1 font-display text-3xl font-bold">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signin"
            ? "Sign in to continue your recoveries."
            : "Join the network. It takes 20 seconds."}
        </p>
      </div>

      <GlassCard glow>
        <button
          type="button"
          onClick={google}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.04] py-2.5 text-sm font-medium transition hover:bg-white/[0.08] disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="#EA4335"
                d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4-5.5 4-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.9 1.5l2.6-2.5C16.9 3.4 14.7 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12S6.8 21.5 12 21.5c6.9 0 9.5-4.8 9.5-8.3 0-.6-.1-1-.2-1.5H12z"
              />
            </svg>
          )}
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <div className="h-px flex-1 bg-white/10" />
          or email
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === "signup" && (
            <Field icon={UserRound}>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground/60"
                placeholder="Display name"
                autoComplete="name"
              />
            </Field>
          )}
          <Field icon={Mail}>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground/60"
              placeholder="you@example.com"
            />
          </Field>
          <Field icon={Lock}>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground/60"
              placeholder="Password (min 6 characters)"
            />
          </Field>

          {err && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold px-4 py-3 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-muted-foreground">
          {mode === "signin" ? (
            <>
              New here?{" "}
              <button className="text-gold hover:underline" onClick={() => setMode("signup")}>
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button className="text-gold hover:underline" onClick={() => setMode("signin")}>
                Sign in
              </button>
            </>
          )}
        </div>
      </GlassCard>

      <div className="mt-6 text-center">
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}

function Field({ icon: Icon, children }: { icon: typeof Mail; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-input bg-black/20 px-4 transition focus-within:border-gold/60">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      {children}
    </div>
  );
}
