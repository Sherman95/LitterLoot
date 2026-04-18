"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type Achievement = {
  id: string;
  title: string;
  description: string;
  target: number;
  bonusSol: number;
  progress: number;
  unlocked: boolean;
  claimed: boolean;
  claimSignature?: string;
  claimedAt?: string;
};

type Stats = {
  total: number;
  verified: number;
  rewardsSent: number;
};

type AchievementsResponse = {
  stats: Stats;
  achievements: Achievement[];
  error?: string;
};

export default function AchievementsBoard() {
  const [stats, setStats] = useState<Stats>({ total: 0, verified: 0, rewardsSent: 0 });
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const unlockedCount = useMemo(() => achievements.filter((item) => item.unlocked).length, [achievements]);
  const claimedCount = useMemo(() => achievements.filter((item) => item.claimed).length, [achievements]);

  const loadAchievements = async () => {
    try {
      setError(null);
      const response = await fetch("/api/achievements", { cache: "no-store" });
      const data = (await response.json()) as AchievementsResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Could not load achievements.");
      }

      setStats(data.stats);
      setAchievements(data.achievements);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load achievements.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAchievements();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const claimAchievement = async (achievementId: string) => {
    setClaimingId(achievementId);
    setError(null);

    try {
      const response = await fetch("/api/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ achievementId }),
      });

      const data = (await response.json()) as { error?: string; bonusSol?: number; signature?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not claim achievement reward.");
      }

      setToast(`Achievement reward claimed: +${data.bonusSol ?? 0} SOL`);
      await loadAchievements();
    } catch (claimError) {
      setError(claimError instanceof Error ? claimError.message : "Could not claim achievement reward.");
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <section className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Verified Cleanups" value={loading ? "..." : String(stats.verified)} hint="Used to unlock milestones" />
        <MetricCard label="Unlocked" value={loading ? "..." : `${unlockedCount}/${achievements.length}`} hint="Milestones available to claim" />
        <MetricCard label="Claimed" value={loading ? "..." : `${claimedCount}/${achievements.length}`} hint="Bonus rewards already redeemed" />
      </section>

      {error && (
        <div className="earth-card rounded-xl border border-rose-400/45 bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-200">
          {error}
        </div>
      )}

      <section className="grid gap-3 lg:grid-cols-2">
        {achievements.map((achievement) => {
          const progressPercent = Math.round((achievement.progress / achievement.target) * 100);

          return (
            <article key={achievement.id} className="earth-card rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="earth-kicker text-[11px] font-semibold uppercase tracking-[0.13em]">Achievement</p>
                  <h3 className="mt-1 text-lg font-bold">{achievement.title}</h3>
                  <p className="earth-muted mt-1 text-sm">{achievement.description}</p>
                </div>
                <span className="earth-pill rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.09em]">
                  +{achievement.bonusSol} SOL
                </span>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--surface-soft)]">
                <motion.div
                  className="h-full rounded-full bg-[var(--brand-earth)]"
                  animate={{ width: `${Math.max(5, progressPercent)}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>
              <p className="earth-muted mt-1 text-xs">{achievement.progress}/{achievement.target} places verified</p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {achievement.claimed ? (
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700 dark:text-emerald-300">
                    Claimed
                  </span>
                ) : achievement.unlocked ? (
                  <button
                    type="button"
                    onClick={() => claimAchievement(achievement.id)}
                    disabled={claimingId === achievement.id}
                    className="earth-primary rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-[0.09em] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {claimingId === achievement.id ? "Claiming..." : "Claim bonus"}
                  </button>
                ) : (
                  <span className="earth-secondary rounded-xl px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.08em]">
                    Locked
                  </span>
                )}

                {achievement.claimSignature && (
                  <a
                    href={`https://solscan.io/tx/${achievement.claimSignature}?cluster=devnet`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-[var(--brand-water)] hover:brightness-110"
                  >
                    View claim tx
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </section>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="fixed bottom-28 right-4 z-50 rounded-xl border border-emerald-400/45 bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-200"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  hint: string;
};

function MetricCard({ label, value, hint }: MetricCardProps) {
  return (
    <article className="earth-card rounded-2xl p-4">
      <p className="earth-muted text-[10px] font-semibold uppercase tracking-[0.12em]">{label}</p>
      <p className="mt-1 text-2xl font-bold leading-none">{value}</p>
      <p className="earth-muted mt-1 text-xs">{hint}</p>
    </article>
  );
}