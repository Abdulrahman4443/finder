import { useEffect, useRef, useState } from "react";
import type { Map as LMap, Marker, Circle } from "leaflet";
import { Loader2, LocateFixed, MapPin, Search } from "lucide-react";
import { useIsClient } from "./useIsClient";
import {
  addDarkTiles,
  beaconIcon,
  loadLeaflet,
  searchPlaces,
  type PlaceSuggestion,
} from "../lib/leaflet";
import { requestUserLocation } from "../lib/geo";

export function RadiusMapPicker({
  center,
  radius,
  onCenterChange,
  height = 320,
}: {
  center: [number, number];
  radius: number;
  onCenterChange?: (c: [number, number]) => void;
  height?: number;
}) {
  const isClient = useIsClient();
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const circleRef = useRef<Circle | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const moveTo = (c: [number, number], zoom = 14) => {
    mapRef.current?.flyTo(c, zoom);
    markerRef.current?.setLatLng(c);
    circleRef.current?.setLatLng(c);
    onCenterChange?.(c);
  };

  const pickSuggestion = (s: PlaceSuggestion) => {
    setSearch(s.label);
    setSuggestions([]);
    setOpen(false);
    moveTo([s.lat, s.lng], 15);
  };

  const runSearch = async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const results = await searchPlaces(query, 6);
      setSuggestions(results);
      setOpen(results.length > 0);
      setActive(0);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (search.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(search), 320);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const useMyLocation = async () => {
    setLoading(true);
    try {
      const loc = await requestUserLocation();
      if (loc) {
        setSearch("Current location");
        setSuggestions([]);
        setOpen(false);
        moveTo(loc, 15);
      }
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        if (suggestions[0]) pickSuggestion(suggestions[0]);
        else void runSearch(search).then(() => undefined);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pickSuggestion(suggestions[active] ?? suggestions[0]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  useEffect(() => {
    if (!isClient || !ref.current) return;
    let cancelled = false;
    (async () => {
      const L = await loadLeaflet();
      if (cancelled || !ref.current || mapRef.current) return;
      const map = L.map(ref.current, { center, zoom: 13, zoomControl: true });
      addDarkTiles(L, map);

      const marker = L.marker(center, { draggable: true, icon: beaconIcon(L, "gold", 22) }).addTo(
        map,
      );
      const circle = L.circle(center, {
        radius,
        color: "var(--gold)",
        fillColor: "var(--gold)",
        fillOpacity: 0.1,
        weight: 1.5,
      }).addTo(map);

      marker.on("drag", () => circle.setLatLng(marker.getLatLng()));
      marker.on("dragend", () => {
        const p = marker.getLatLng();
        onCenterChange?.([p.lat, p.lng]);
      });
      map.on("click", (e) => {
        marker.setLatLng(e.latlng);
        circle.setLatLng(e.latlng);
        onCenterChange?.([e.latlng.lat, e.latlng.lng]);
      });

      mapRef.current = map;
      markerRef.current = marker;
      circleRef.current = circle;
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      circleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient]);

  useEffect(() => {
    circleRef.current?.setRadius(radius);
  }, [radius]);

  if (!isClient) {
    return <div style={{ height }} className="w-full animate-pulse rounded-xl bg-white/[0.03]" />;
  }

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-panel-border">
      <div ref={ref} style={{ height }} className="z-0 w-full" />
      <div
        ref={wrapRef}
        className="pointer-events-none absolute left-1/2 top-3 z-[400] w-[92%] max-w-sm -translate-x-1/2"
      >
        {/* div, not form — parent report page already wraps in <form> */}
        <div className="pointer-events-auto relative">
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/75 p-1 shadow-lg backdrop-blur-md">
            <Search className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search area, street, landmark…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => suggestions.length > 0 && setOpen(true)}
              onKeyDown={onKeyDown}
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-white/45"
            />
            <button
              type="button"
              onClick={useMyLocation}
              title="Use my location"
              className="rounded-lg p-2 text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
            >
              <LocateFixed className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={loading || search.trim().length < 2}
              onClick={() => runSearch(search)}
              className="rounded-lg gold-gradient px-3 py-2 text-xs font-semibold text-primary-foreground transition active:scale-95 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Go"}
            </button>
          </div>

          {open && suggestions.length > 0 && (
            <ul className="absolute inset-x-0 top-[calc(100%+6px)] z-[410] overflow-hidden rounded-xl border border-white/10 bg-black/90 shadow-panel backdrop-blur-xl">
              {suggestions.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => pickSuggestion(s)}
                    onMouseEnter={() => setActive(i)}
                    className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition ${
                      i === active ? "bg-white/10" : "hover:bg-white/5"
                    }`}
                  >
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-foreground">{s.label}</span>
                      {s.secondary && (
                        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                          {s.secondary}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
