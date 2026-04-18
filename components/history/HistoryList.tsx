"use client";

type HistoryEntry = {
  id: string;
  createdAt: string;
  verified: boolean;
  reasoning: string;
  rewardSent: boolean;
  signature?: string;
  rewardedWallet?: string;
  locationLat?: number;
  locationLng?: number;
};

type HistoryResponse = {
  history: HistoryEntry[];
};

import { useEffect, useState } from "react";

export default function HistoryList() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/history?limit=30", { cache: "no-store" });
        const data = (await response.json()) as HistoryResponse & { error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "Could not load history.");
        }

        setHistory(data.history ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load history.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return <section className="earth-card rounded-2xl p-4 text-sm">Loading history...</section>;
  }

  if (error) {
    return (
      <section className="earth-card rounded-2xl p-4 text-sm text-rose-400">
        Failed to load history: {error}
      </section>
    );
  }

  return (
    <section className="earth-card rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Verification History</h2>
        <span className="earth-pill rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.09em]">
          {history.length} records
        </span>
      </div>

      {history.length === 0 ? (
        <p className="earth-muted mt-2 text-sm">No verification records yet.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {history.map((item) => (
            <li key={item.id} className="earth-soft rounded-xl p-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{new Date(item.createdAt).toLocaleString()}</p>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${
                    item.verified
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                      : "bg-rose-500/15 text-rose-600 dark:text-rose-300"
                  }`}
                >
                  {item.verified ? "Verified" : "Failed"}
                </span>
              </div>

              <p className="earth-muted mt-2">{item.reasoning}</p>

              {item.rewardedWallet && (
                <p className="earth-muted mt-2 break-all">
                  Reward wallet: <span className="font-semibold">{item.rewardedWallet}</span>
                </p>
              )}

              {typeof item.locationLat === "number" && typeof item.locationLng === "number" && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="earth-muted break-all">
                    Scan location: <span className="font-semibold">{item.locationLat}, {item.locationLng}</span>
                  </p>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${item.locationLat}&mlon=${item.locationLng}#map=16/${item.locationLat}/${item.locationLng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="earth-secondary rounded-lg px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]"
                  >
                    Open map
                  </a>
                </div>
              )}

              {item.signature && (
                <a
                  href={`https://solscan.io/tx/${item.signature}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex break-all text-[var(--brand-water)] hover:brightness-110"
                >
                  Tx: {item.signature}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
