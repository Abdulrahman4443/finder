import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Lock, Mail, UserRound, X } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { pushToast } from "./NotificationToast";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4-5.5 4-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.9 1.5l2.6-2.5C16.9 3.4 14.7 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12S6.8 21.5 12 21.5c6.9 0 9.5-4.8 9.5-8.3 0-.6-.1-1-.2-1.5H12z"
      />
    </svg>
  );
}

export function AuthModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn, signUp, signInWithGoogle } = useAuth();

  useEffect(() => {
    if (!isOpen) return;
    const stored = window.sessionStorage.getItem("findr.oauth_error");
    if (stored) {
      window.sessionStorage.removeItem("findr.oauth_error");
      setError(decodeURIComponent(stored.replace(/\+/g, " ")));
    }
  }, [isOpen]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
        pushToast({ title: "Welcome back", body: "You're signed in.", tone: "verify" });
      } else {
        await signUp(name, email, password);
        pushToast({
          title: "Account created",
          body: "Check your inbox if email confirmation is required.",
          tone: "verify",
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="relative w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0c0e13]/95 p-8 shadow-panel backdrop-blur-xl">
              <div
                aria-hidden
                className="pointer-events-none absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-gold/10 blur-3xl"
              />
              <button
                onClick={onClose}
                aria-label="Close"
                className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground transition hover:bg-white/5 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="text-[11px] uppercase tracking-[0.25em] text-gold">FindrAI</div>
              <h2 className="mt-1 font-display text-2xl font-bold">
                {mode === "signin" ? "Welcome back" : "Create your account"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode === "signin"
                  ? "Sign in to file reports and open secure recovery chats."
                  : "Join the recovery network. It takes 20 seconds."}
              </p>

              <button
                type="button"
                onClick={google}
                disabled={busy}
                className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.04] py-2.5 text-sm font-medium transition hover:bg-white/[0.08] disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon className="h-4 w-4" />}
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
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Full name"
                      autoComplete="name"
                      className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground/60"
                    />
                  </Field>
                )}
                <Field icon={Mail}>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    autoComplete="email"
                    className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground/60"
                  />
                </Field>
                <Field icon={Lock}>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password (min 6 characters)"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground/60"
                  />
                </Field>

                {error && (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {error}
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

              <div className="mt-5 text-center text-xs text-muted-foreground">
                {mode === "signin" ? "New to FindrAI? " : "Already have an account? "}
                <button
                  onClick={() => {
                    setMode(mode === "signin" ? "signup" : "signin");
                    setError(null);
                  }}
                  className="font-medium text-gold hover:underline"
                >
                  {mode === "signin" ? "Create an account" : "Sign in"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({ icon: Icon, children }: { icon: typeof Mail; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/30 px-4 transition focus-within:border-gold/50">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      {children}
    </div>
  );
}
