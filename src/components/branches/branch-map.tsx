"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { BRANCHES, type BranchInfo } from "@/config/external-links";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Navigation, Search, Loader2, X, Sheet } from "lucide-react";

// Leaflet is loaded from CDN at runtime — no npm import to avoid Turbopack bundling its CSS
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let L: any = null;

/** Load Leaflet JS + CSS from CDN (bypasses Turbopack CSS bundling) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadLeaflet(): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window as any;
  if (win.L) return win.L;

  await Promise.all([
    // CSS
    new Promise<void>((resolve) => {
      if (document.getElementById("leaflet-css")) { resolve(); return; }
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.onload = () => resolve();
      link.onerror = () => resolve();
      document.head.appendChild(link);
    }),
    // JS
    new Promise<void>((resolve, reject) => {
      if (win.L) { resolve(); return; }
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Leaflet CDN failed"));
      document.head.appendChild(script);
    }),
  ]);

  return win.L;
}

/** Haversine distance in km between two lat/lng points */
function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface MapProps {
  onSelect: (branch: BranchInfo) => void;
  selected: BranchInfo | null;
  searchPin: { lat: number; lng: number } | null;
  nearest: BranchInfo[];
}

function LeafletMap({ onSelect, selected, searchPin, nearest }: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const searchPinRef = useRef<any>(null);
  // Prevents two concurrent async inits (React StrictMode double-invoke)
  const initializingRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || initializingRef.current) return;
    initializingRef.current = true;
    let destroyed = false;

    async function init() {
      if (!containerRef.current) { initializingRef.current = false; return; }

      L = await loadLeaflet();

      // Cleanup may have run while awaiting CDN load — abort if so
      if (destroyed) { initializingRef.current = false; return; }

      // Remove stale _leaflet_id left by a previous remove()
      const container = containerRef.current as HTMLDivElement & { _leaflet_id?: number };
      if (container._leaflet_id !== undefined) delete container._leaflet_id;

      // Prevent Leaflet from auto-detecting icon path via CSS (fails with CDN-loaded CSS)
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(containerRef.current!, {
        center: [31.8, 34.9],
        zoom: 8,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      BRANCHES.forEach((branch) => {
        const marker = L!
          .marker([branch.lat, branch.lng])
          .addTo(map)
          .bindPopup(
            `<div dir="rtl" style="min-width:160px">
              <strong>${branch.name}</strong><br/>
              <span style="font-size:12px">${branch.address}</span><br/>
              <span style="font-size:12px">📞 ${branch.phone}</span>
            </div>`
          );
        marker.on("click", () => onSelect(branch));
        markersRef.current.push(marker);
      });

      mapRef.current = map;
      initializingRef.current = false;

      // Force Leaflet to recalculate container size after layout settles
      setTimeout(() => { map.invalidateSize(); }, 100);
    }

    init();

    return () => {
      destroyed = true;
      initializingRef.current = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = [];
        searchPinRef.current = null;
      }
      // Remove _leaflet_id so the container can be re-used on re-mount
      if (containerRef.current) {
        const c = containerRef.current as HTMLDivElement & { _leaflet_id?: number };
        delete c._leaflet_id;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pan to selected branch
  useEffect(() => {
    if (!mapRef.current || !selected || !L) return;
    mapRef.current.flyTo([selected.lat, selected.lng], 13, { duration: 1 });
  }, [selected]);

  // Update search pin and zoom to show nearest 3
  useEffect(() => {
    if (!mapRef.current || !L) return;

    // Remove previous search pin
    if (searchPinRef.current) {
      searchPinRef.current.remove();
      searchPinRef.current = null;
    }

    if (!searchPin) return;

    // Add search pin with distinct red icon
    const redIcon = L.divIcon({
      html: `<div style="background:#ef4444;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.5)"></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
      className: "",
    });

    searchPinRef.current = L.marker([searchPin.lat, searchPin.lng], { icon: redIcon })
      .addTo(mapRef.current)
      .bindPopup('<div dir="rtl">מיקום החיפוש</div>');

    if (nearest.length > 0) {
      const lats = [searchPin.lat, ...nearest.map((b) => b.lat)];
      const lngs = [searchPin.lng, ...nearest.map((b) => b.lng)];
      const bounds = L.latLngBounds(
        [Math.min(...lats) - 0.05, Math.min(...lngs) - 0.05],
        [Math.max(...lats) + 0.05, Math.max(...lngs) + 0.05]
      );
      mapRef.current.flyToBounds(bounds, { duration: 1, padding: [30, 30] });
    }
  }, [searchPin, nearest]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[480px] rounded-lg overflow-hidden border border-border"
    />
  );
}

export function BranchMap() {
  const [selected, setSelected] = useState<BranchInfo | null>(null);
  const [cityQuery, setCityQuery] = useState("");
  const [searchPin, setSearchPin] = useState<{ lat: number; lng: number } | null>(null);
  const [nearest, setNearest] = useState<BranchInfo[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [sheetUrls, setSheetUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/branches/sheets")
      .then((r) => r.json())
      .then((data) => setSheetUrls(data as Record<string, string>))
      .catch(() => {});
  }, []);

  const displayList = nearest.length > 0 ? nearest : BRANCHES;

  const searchCity = useCallback(async () => {
    const q = cityQuery.trim();
    if (!q) return;
    setSearchLoading(true);
    setSearchError(null);

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + " Israel")}&format=json&limit=1&accept-language=he`;
      const res = await fetch(url, { headers: { "Accept-Language": "he" } });
      const results = await res.json() as { lat: string; lon: string; display_name: string }[];

      if (!results.length) {
        setSearchError("לא נמצאה עיר. נסה שם אחר.");
        return;
      }

      const pin = { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
      setSearchPin(pin);

      const sorted = [...BRANCHES]
        .map((b) => ({ ...b, dist: haversine(pin.lat, pin.lng, b.lat, b.lng) }))
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 3);

      setNearest(sorted);
      setSelected(sorted[0]);
    } catch {
      setSearchError("שגיאת חיפוש. בדוק חיבור לאינטרנט.");
    } finally {
      setSearchLoading(false);
    }
  }, [cityQuery]);

  function clearSearch() {
    setCityQuery("");
    setSearchPin(null);
    setNearest([]);
    setSearchError(null);
    setSelected(null);
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="חפש עיר למציאת הסניף הקרוב..."
            value={cityQuery}
            onChange={(e) => setCityQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchCity()}
            className="pe-9"
            dir="rtl"
          />
        </div>
        <Button onClick={searchCity} disabled={searchLoading || !cityQuery.trim()} className="gap-2">
          {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          חפש
        </Button>
        {searchPin && (
          <Button variant="outline" size="icon" onClick={clearSearch} title="נקה חיפוש">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {searchError && (
        <p className="text-sm text-destructive">{searchError}</p>
      )}

      {nearest.length > 0 && (
        <p className="text-sm text-muted-foreground">
          3 הסניפים הקרובים ביותר ל-<span className="font-medium text-foreground">{cityQuery}</span>:
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Map */}
        <div className="lg:col-span-2">
          <LeafletMap
            onSelect={setSelected}
            selected={selected}
            searchPin={searchPin}
            nearest={nearest}
          />
        </div>

        {/* Branch list */}
        <div className="flex flex-col gap-3 overflow-y-auto max-h-[480px]">
          {displayList.map((branch, idx) => {
            const isActive = selected?.name === branch.name;
            const dist = searchPin
              ? haversine(searchPin.lat, searchPin.lng, branch.lat, branch.lng)
              : null;

            return (
              <button
                key={branch.name}
                type="button"
                onClick={() => setSelected(branch)}
                className={`text-start rounded-lg border px-4 py-3 transition-colors ${
                  isActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {nearest.length > 0 && (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                        {idx + 1}
                      </span>
                    )}
                    <MapPin className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    <p className="text-sm font-medium">{branch.name}</p>
                  </div>
                  {dist !== null && (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {dist.toFixed(1)} ק"מ
                    </Badge>
                  )}
                </div>

                {isActive && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Navigation className="h-3 w-3 shrink-0" />
                      {branch.address}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3 shrink-0" />
                      <a href={`tel:${branch.phone}`} className="hover:text-primary" dir="ltr">
                        {branch.phone}
                      </a>
                    </p>
                    {sheetUrls[branch.name] && (
                      <a
                        href={sheetUrls[branch.name]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Badge
                          variant="secondary"
                          className="text-xs cursor-pointer hover:bg-emerald-600 hover:text-white transition-colors flex items-center gap-1"
                        >
                          <Sheet className="h-3 w-3" />
                          פתח גיליון סניף
                        </Badge>
                      </a>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
