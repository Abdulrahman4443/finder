export function TrustBadge({ score }: { score: number }) {
  const tier =
    score >= 90
      ? { name: "Beacon", cls: "text-gold border-gold/50 bg-accent" }
      : score >= 75
        ? { name: "Trusted", cls: "text-verify border-verify/40 bg-verify/10" }
        : score >= 50
          ? { name: "Verified", cls: "text-muted-foreground border-border bg-white/[0.03]" }
          : { name: "New", cls: "text-muted-foreground border-border bg-white/[0.03]" };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${tier.cls}`}
    >
      <span className="mono">{score}</span>· {tier.name}
    </span>
  );
}
