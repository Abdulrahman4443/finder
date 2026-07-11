import { CATEGORIES } from "../lib/categories";
import type { Category } from "../lib/types";
import { cn } from "../lib/utils";

export function CategoryPicker({
  value,
  onChange,
  exclude = [],
}: {
  value: Category | null;
  onChange: (c: Category) => void;
  exclude?: Category[];
}) {
  return (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
      {CATEGORIES.filter((c) => !exclude.includes(c.id)).map((c) => {
        const active = value === c.id;
        const Icon = c.icon;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            className={cn(
              "group flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition",
              active
                ? "border-gold/70 bg-accent shadow-glow"
                : "border-panel-border bg-white/[0.02] hover:border-gold/40 hover:bg-white/[0.05]",
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5 transition",
                active ? "text-gold" : "text-muted-foreground group-hover:text-foreground",
              )}
              strokeWidth={1.75}
            />
            <span
              className={cn(
                "text-xs font-medium leading-tight",
                active ? "text-gold" : "text-muted-foreground",
              )}
            >
              {c.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
