"use client";

import { useMemo, useState } from "react";

type Coordinates = {
  lat: number;
  lng: number;
};

export default function LiveZoneMap() {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const mapEmbedUrl = useMemo(() => {
    const lat = location?.lat ?? 40.4168;
    const lng = location?.lng ?? -3.7038;
    const zoomDelta = 0.03;
    const left = lng - zoomDelta;
    const right = lng + zoomDelta;
    const top = lat + zoomDelta;
    const bottom = lat - zoomDelta;

    return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${lat}%2C${lng}`;
  }, [location]);

  const locateMe = () => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation is not supported on this device.");
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        });
        setLoading(false);
      },
      () => {
        setError("Location permission denied. Enable it to activate the live map pin.");
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  return (
    <section id="zone-map" className="earth-card scroll-mt-24 overflow-hidden rounded-2xl">
      <div className="flex items-center justify-between border-b border-[var(--card-border)] px-4 py-2">
        <p className="earth-muted text-xs uppercase tracking-[0.14em]">Nearby Clean-up Zones (Live Mock Map)</p>
        <button
          type="button"
          onClick={locateMe}
          disabled={loading}
          className="earth-secondary rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] transition focus-visible:earth-focus disabled:opacity-60"
        >
          {loading ? "Locating..." : "Locate Me"}
        </button>
      </div>

      <div className="p-3">
        <div className="overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--surface-soft)]">
          <iframe
            title="Live cleanup map"
            src={mapEmbedUrl}
            className="h-56 w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        {location ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <p className="text-[var(--brand-water)]">Live pin: {location.lat}, {location.lng}</p>
            <a
              href={`https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lng}#map=16/${location.lat}/${location.lng}`}
              target="_blank"
              rel="noreferrer"
              className="earth-secondary rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]"
            >
              Open full map
            </a>
          </div>
        ) : (
          <p className="earth-muted mt-2 text-xs">Tap Locate Me to center the real map on your location.</p>
        )}
        {error && <p className="mt-1 text-xs text-rose-300">{error}</p>}
      </div>
    </section>
  );
}
