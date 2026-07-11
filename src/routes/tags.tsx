import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, QrCode, ScanLine, Sparkles } from "lucide-react";
import { GlassCard } from "../components/GlassCard";
import { QrTagCode, downloadTagQr } from "../components/QrTagCode";
import { pushToast } from "../components/NotificationToast";
import { makeId, mintTag, pushNotification, recordTagScan, useNetworkState } from "../lib/store";
import { useAuth } from "../hooks/useAuth";
import { timeAgo } from "../lib/format";
import { CategoryPicker } from "../components/CategoryPicker";
import type { Category } from "../lib/types";

type TagsSearch = { scan?: string };

export const Route = createFileRoute("/tags")({
  component: Tags,
  validateSearch: (search: Record<string, unknown>): TagsSearch => ({
    scan: typeof search.scan === "string" ? search.scan : undefined,
  }),
  head: () => ({ meta: [{ title: "QR Smart Tags · FindrAI" }] }),
});

function mintTagId(): string {
  const raw = makeId("t").replace(/^t_/, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return `TAG-${raw.slice(0, 6).padEnd(6, "0")}`;
}

function Tags() {
  const { scan } = Route.useSearch();
  const nav = useNavigate();
  const { tags } = useNetworkState();
  const { user } = useAuth();
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);
  const handledScan = useRef<string | null>(null);

  useEffect(() => {
    if (!scan || handledScan.current === scan) return;
    handledScan.current = scan;
    const tag = tags.find((t) => t.id === scan);
    if (tag) {
      recordTagScan(tag.id, "Scanned via QR link");
      pushNotification({
        title: `Your tag "${tag.label}" was just scanned`,
        body: "Someone found your item. Approximate scan area recorded.",
      });
      pushToast({
        title: "Owner notified",
        body: `The owner of "${tag.label}" has been pinged — no phone numbers exposed.`,
        tone: "verify",
      });
    } else {
      pushToast({ title: "Unknown tag", body: "This tag isn't registered.", tone: "alert" });
    }
    nav({ to: "/tags", search: { scan: undefined }, replace: true });
  }, [scan, tags, nav]);

  const ownerKey = useMemo(() => {
    if (user?.id) return user.id;
    if (typeof window === "undefined") return "guest";
    let id = window.localStorage.getItem("findr.guest_id");
    if (!id) {
      id = `guest_${Date.now().toString(36)}`;
      window.localStorage.setItem("findr.guest_id", id);
    }
    return id;
  }, [user]);

  const myTags = useMemo(() => tags.filter((t) => t.ownerId === ownerKey), [tags, ownerKey]);

  const mint = () => {
    if (!label.trim()) {
      pushToast({ title: "Add a label", body: "Name the item this tag will stick to.", tone: "alert" });
      return;
    }
    if (!category) {
      pushToast({ title: "Pick a category", body: "Choose what this tag protects.", tone: "alert" });
      return;
    }
    setBusy(true);
    try {
      const id = mintTagId();
      mintTag({
        id,
        label: label.trim(),
        category,
        ownerId: ownerKey,
        createdAt: new Date().toISOString(),
        scans: [],
        active: true,
      });
      setLabel("");
      setCategory(null);
      pushToast({
        title: "Tag minted",
        body: `${id} is ready to download and print.`,
        tone: "verify",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-gold">
          <QrCode className="h-4 w-4" /> QR smart tags
        </div>
        <h1 className="mt-1 font-display text-3xl font-bold">
          Stick them on the things that matter
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Anyone who scans one reaches you anonymously through FindrAI — you see roughly when and
          where, they never see your number.
        </p>
      </div>

      <GlassCard className="mb-6">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div className="space-y-3">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label your tag (e.g. Miso's collar, Work backpack)"
              className="w-full rounded-lg border border-input bg-white/[0.03] px-4 py-2.5 text-sm outline-none transition focus:border-gold/60"
              onKeyDown={(e) => e.key === "Enter" && mint()}
            />
            <CategoryPicker value={category} onChange={setCategory} exclude={["person"]} />
          </div>
          <button
            type="button"
            onClick={mint}
            disabled={busy || !label.trim() || !category}
            className="inline-flex h-fit items-center gap-2 rounded-lg bg-gold px-5 py-2.5 text-sm font-semibold text-primary-foreground transition active:scale-[0.98] disabled:opacity-40"
          >
            <Sparkles className="h-4 w-4" /> {busy ? "Minting…" : "Mint tag"}
          </button>
        </div>
      </GlassCard>

      {myTags.length === 0 ? (
        <GlassCard className="py-14 text-center">
          <QrCode className="mx-auto h-10 w-10 text-gold/60" strokeWidth={1.25} />
          <div className="mt-4 font-display text-xl font-semibold">No tags yet</div>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Enter a label, pick a category, then Mint. Download the QR and stick it on a wallet,
            laptop, bag, or pet collar.
          </p>
        </GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {myTags.map((t) => (
            <GlassCard key={t.id}>
              <div className="mb-3 flex justify-center rounded-xl bg-white/[0.03] py-4">
                <QrTagCode tagId={t.id} size={160} />
              </div>
              <div className="mono text-xs text-gold">{t.id}</div>
              <div className="mt-0.5 font-semibold">{t.label}</div>
              <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                <span>
                  {t.scans.length} scan{t.scans.length === 1 ? "" : "s"}
                </span>
                <span className="mono">
                  {t.scans[0] ? `last ${timeAgo(t.scans[0].at)}` : "never scanned"}
                </span>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => downloadTagQr(t.id, t.label)}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-panel-border py-2 text-xs transition hover:border-gold/40 hover:text-gold"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </button>
                <button
                  type="button"
                  onClick={() => nav({ to: "/tags", search: { scan: t.id } })}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-panel-border py-2 text-xs transition hover:border-verify/40 hover:text-verify"
                >
                  <ScanLine className="h-3.5 w-3.5" /> Simulate scan
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
