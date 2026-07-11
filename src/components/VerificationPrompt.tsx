import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Lock, ShieldQuestion, XCircle } from "lucide-react";
import { cn } from "../lib/utils";
import { fuzzyAnswerMatch } from "../lib/matching";
import type { PrivateField } from "../lib/types";

type Status = "idle" | "correct" | "wrong" | "locked";

export function VerificationPrompt({
  fields,
  initialAttempts = 0,
  maxAttempts = 3,
  onPass,
  onAttempt,
  onLock,
  autoValue,
}: {
  fields: PrivateField[];
  initialAttempts?: number;
  maxAttempts?: number;
  onPass?: () => void;
  onAttempt?: (passed: boolean) => void;
  onLock?: () => void;
  autoValue?: string;
}) {
  const [answers, setAnswers] = useState<string[]>(
    fields.map((_, i) => (i === 0 && autoValue ? autoValue : "")),
  );
  const [attempts, setAttempts] = useState(initialAttempts);
  const [status, setStatus] = useState<Status>(initialAttempts >= maxAttempts ? "locked" : "idle");

  const check = () => {
    if (status === "correct" || status === "locked") return;
    const allOk = fields.every((f, i) => fuzzyAnswerMatch(answers[i] ?? "", f.answer));
    if (allOk) {
      setStatus("correct");
      onAttempt?.(true);
      onPass?.();
      return;
    }
    const next = attempts + 1;
    setAttempts(next);
    onAttempt?.(false);
    if (next >= maxAttempts) {
      setStatus("locked");
      onLock?.();
    } else {
      setStatus("wrong");
    }
  };

  const disabled = status === "correct" || status === "locked";

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-gold">
          <ShieldQuestion className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Verification challenge
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Answers are checked with fuzzy semantic matching — close counts, guessing doesn't.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {fields.map((f, i) => (
          <div key={i}>
            <div className="mb-2 text-base font-medium">{f.question}</div>
            <input
              value={answers[i] ?? ""}
              onChange={(e) =>
                setAnswers((prev) => prev.map((a, j) => (j === i ? e.target.value : a)))
              }
              disabled={disabled}
              placeholder="Type your answer — nothing is filled in for you"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="w-full rounded-lg border border-input bg-black/20 px-4 py-3 text-sm outline-none transition focus:border-gold/60 disabled:opacity-60"
              onKeyDown={(e) => e.key === "Enter" && check()}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {Array.from({ length: maxAttempts }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 w-8 rounded-full transition",
                  i < attempts ? "bg-destructive" : "bg-white/10",
                )}
              />
            ))}
          </div>
          <span className="mono text-xs text-muted-foreground">
            {Math.max(0, maxAttempts - attempts)} attempt
            {maxAttempts - attempts === 1 ? "" : "s"} left
          </span>
        </div>
        <button
          onClick={check}
          disabled={disabled}
          className="rounded-lg gold-gradient px-5 py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-40"
        >
          Verify
        </button>
      </div>

      <AnimatePresence mode="wait">
        {status === "correct" && (
          <motion.div
            key="ok"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 rounded-lg border border-gold/40 bg-accent p-3 text-sm text-gold"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Verified — identity confirmed. Secure channel unlocked.
          </motion.div>
        )}
        {status === "wrong" && (
          <motion.div
            key="no"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm"
          >
            <XCircle className="h-4 w-4 shrink-0 text-destructive" />
            That doesn't match what the reporter recorded. Try again.
          </motion.div>
        )}
        {status === "locked" && (
          <motion.div
            key="lk"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-lg border border-destructive/60 bg-destructive/15 p-3 text-sm"
          >
            <Lock className="h-4 w-4 shrink-0 text-destructive" />
            Attempt limit reached. This claim escalated to human review and was logged.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
