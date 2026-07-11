import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Award, Eye, HandHeart, LogIn, Radar, Rocket, ShieldCheck, Target } from "lucide-react";
import { GlassCard } from "../components/GlassCard";
import { TrustBadge } from "../components/TrustBadge";
import { useAuth } from "../hooks/useAuth";
import { useNetworkState } from "../lib/store";
import { categoryDef } from "../lib/categories";
import { timeAgo } from "../lib/format";

export const Route = createFileRoute("/profile")({
  component: Profile,
  head: () => ({ meta: [{ title: "Profile · FindrAI" }] }),
});

function Profile() {
  const { user, profile, displayName, setAuthModalOpen } = useAuth();
  const { reports, connections } = useNetworkState();

  const myReports = useMemo(
    () => (user ? reports.filter((r) => r.reporter.id === user.id) : []),
    [reports, user],
  );
  const recovered = myReports.filter((r) => r.status === "recovered").length;
  const helped = useMemo(() => myReports.filter((r) => r.kind === "found").length, [myReports]);
  const trust = profile?.trust_score ?? 50;

  const badges = useMemo(() => {
    const list: { icon: typeof Target; label: string }[] = [];
    if (myReports.length > 0) list.push({ icon: Target, label: "First Report" });
    if (helped > 0) list.push({ icon: HandHeart, label: `Good Samaritan × ${helped}` });
    if (recovered > 0) list.push({ icon: Rocket, label: `${recovered} Recovered` });
    if (user?.email_confirmed_at) list.push({ icon: ShieldCheck, label: "Verified ID" });
    if (trust >= 90) list.push({ icon: Award, label: "Beacon Tier" });
    return list;
  }, [myReports.length, helped, recovered, trust, user]);

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <GlassCard className="py-14 text-center">
          <LogIn className="mx-auto h-10 w-10 text-gold/70" strokeWidth={1.5} />
          <h1 className="mt-4 font-display text-2xl font-bold">Sign in to see your profile</h1>
          <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
            Your reports, recoveries, trust score, and badges live here.
          </p>
          <button
            onClick={() => setAuthModalOpen(true)}
            className="mt-6 rounded-lg gold-gradient px-6 py-3 text-sm font-semibold text-primary-foreground"
          >
            Sign in / Create account
          </button>
        </GlassCard>
      </div>
    );
  }

  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="grid items-start gap-6 md:grid-cols-[280px_1fr]">
        <GlassCard className="text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full gold-gradient text-3xl font-bold text-primary-foreground beacon-glow">
            {initial}
          </div>
          <div className="mt-4 truncate px-2 font-display text-xl font-semibold">{displayName}</div>
          <div className="truncate px-2 text-xs text-muted-foreground">{user.email}</div>
          <div className="mt-4 flex justify-center">
            <TrustBadge score={trust} />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="mono text-lg font-semibold text-gold">{myReports.length}</div>
              <div className="text-[10px] uppercase text-muted-foreground">Reports</div>
            </div>
            <div>
              <div className="mono text-lg font-semibold text-gold">{recovered}</div>
              <div className="text-[10px] uppercase text-muted-foreground">Recovered</div>
            </div>
            <div>
              <div className="mono text-lg font-semibold text-gold">{helped}</div>
              <div className="text-[10px] uppercase text-muted-foreground">Helped</div>
            </div>
          </div>
        </GlassCard>

        <div className="space-y-6">
          <GlassCard>
            <div className="mb-3 text-xs uppercase tracking-[0.2em] text-gold">Badges</div>
            {badges.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                File your first report to start earning badges and trust.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {badges.map((b) => (
                  <span
                    key={b.label}
                    className="glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs"
                  >
                    <b.icon className="h-3.5 w-3.5 text-gold" /> {b.label}
                  </span>
                ))}
              </div>
            )}
          </GlassCard>

          <GlassCard>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.2em] text-gold">Report history</div>
              <Link to="/report/new" className="text-xs text-verify hover:underline">
                + New report
              </Link>
            </div>
            {myReports.length === 0 ? (
              <div className="py-8 text-center">
                <Radar className="mx-auto h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
                <p className="mt-3 text-sm text-muted-foreground">
                  No reports yet. Lost or found something?
                </p>
              </div>
            ) : (
              <div className="divide-y divide-panel-border">
                {myReports.map((h) => {
                  const def = categoryDef(h.category);
                  return (
                    <Link
                      key={h.id}
                      to="/matches"
                      search={{ report: h.id }}
                      className="-mx-2 flex items-center justify-between rounded-lg px-2 py-3 transition hover:bg-white/[0.03]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-gold">
                          <def.icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{h.title}</div>
                          <div className="mono text-[11px] text-muted-foreground">
                            {h.kind} · {timeAgo(h.createdAt)}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`mono text-[11px] uppercase tracking-wider ${
                          h.status === "recovered"
                            ? "text-verify"
                            : h.status === "matched"
                              ? "text-gold"
                              : h.status === "escalated"
                                ? "text-destructive"
                                : "text-muted-foreground"
                        }`}
                      >
                        {h.status}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </GlassCard>

          <GlassCard>
            <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold">
              <Eye className="h-3.5 w-3.5" /> Active recovery channels
            </div>
            {connections.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Verified matches open a secure chat here.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {connections.map((c) => (
                  <Link
                    key={c.id}
                    to="/chat/$connectionId"
                    params={{ connectionId: c.id }}
                    className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition ${
                      c.recovered
                        ? "border-verify/40 bg-verify/10 text-verify"
                        : "border-gold/40 bg-accent text-gold hover:bg-gold/10"
                    }`}
                  >
                    {c.itemTitle} · {c.otherReporter.name}
                    {c.recovered && " ✓"}
                  </Link>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
