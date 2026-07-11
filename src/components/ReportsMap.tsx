import { useEffect, useRef } from "react";
import type { Map as LMap, LayerGroup, Layer } from "leaflet";
import { useIsClient } from "./useIsClient";
import { addDarkTiles, beaconIcon, loadLeaflet } from "../lib/leaflet";
import { toHeatPoints } from "../lib/geo";
import { categoryDef } from "../lib/categories";
import type { Report } from "../lib/types";

export interface ReportsMapProps {
  reports: Report[];
  center: [number, number];
  zoom?: number;
  height?: number | string;
  showHeat?: boolean;
  showMarkers?: boolean;
  interactive?: boolean;
  className?: string;
  onSelect?: (report: Report) => void;
}

/** Live map of the recovery network: pulsing report beacons + density heat layer. */
export function ReportsMap({
  reports,
  center,
  zoom = 12,
  height = 420,
  showHeat = true,
  showMarkers = true,
  interactive = true,
  className,
  onSelect,
}: ReportsMapProps) {
  const isClient = useIsClient();
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const markerLayerRef = useRef<LayerGroup | null>(null);
  const heatLayerRef = useRef<Layer | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!isClient || !ref.current) return;
    let cancelled = false;
    (async () => {
      const L = await loadLeaflet();
      if (cancelled || !ref.current || mapRef.current) return;
      const map = L.map(ref.current, {
        center,
        zoom,
        zoomControl: interactive,
        attributionControl: true,
        dragging: interactive,
        scrollWheelZoom: interactive,
        doubleClickZoom: interactive,
        touchZoom: interactive,
      });
      addDarkTiles(L, map);
      mapRef.current = map;
      markerLayerRef.current = L.layerGroup().addTo(map);
      renderLayers();
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      heatLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient]);

  useEffect(() => {
    mapRef.current?.setView(center, zoom);
  }, [center, zoom]);

  async function renderLayers() {
    const L = await loadLeaflet();
    const map = mapRef.current;
    const markers = markerLayerRef.current;
    if (!map || !markers) return;

    markers.clearLayers();
    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (showHeat && reports.length > 0) {
      const heat = toHeatPoints(
        reports.map((r) => ({
          id: r.id,
          location: r.location,
          weight: r.status === "recovered" ? 0.45 : r.sensitive ? 1 : 0.7,
        })),
      );
      heatLayerRef.current = L.heatLayer(
        heat.map((p) => [p.lat, p.lng, p.weight] as [number, number, number]),
        {
          radius: 32,
          blur: 24,
          maxZoom: 15,
          gradient: {
            0.2: "#1d4ed8",
            0.45: "#0ea5e9",
            0.65: "#eab308",
            0.85: "#f59e0b",
            1: "#ef4444",
          },
        },
      ).addTo(map);
    }

    if (showMarkers) {
      for (const r of reports) {
        const color = r.sensitive ? "alert" : r.kind === "found" ? "verify" : "gold";
        const marker = L.marker(r.location, { icon: beaconIcon(L, color) });
        const def = categoryDef(r.category);
        marker.bindPopup(
          `<div style="font-family:Inter,sans-serif;min-width:180px;">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.15em;opacity:0.7;">
              ${r.kind === "lost" ? "Lost" : "Found"} · ${def.label}
            </div>
            <div style="font-weight:600;margin-top:2px;">${escapeHtml(r.title)}</div>
            <div style="font-size:12px;opacity:0.75;margin-top:4px;">${escapeHtml(
              r.description.slice(0, 90),
            )}${r.description.length > 90 ? "…" : ""}</div>
          </div>`,
        );
        if (onSelectRef.current) marker.on("click", () => onSelectRef.current?.(r));
        marker.addTo(markers);
      }
    }
  }

  useEffect(() => {
    if (!mapRef.current) return;
    renderLayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports, showHeat, showMarkers]);

  if (!isClient) {
    return (
      <div
        style={{ height }}
        className={`w-full animate-pulse rounded-2xl bg-white/[0.03] ${className ?? ""}`}
      />
    );
  }

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-panel-border ${className ?? ""}`}
    >
      <div ref={ref} style={{ height }} className="z-0 w-full" />
    </div>
  );
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
