"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type PhaseId = "zone" | "proof" | "reward";

type Phase = {
  id: PhaseId;
  title: string;
  short: string;
  detail: string;
  auto: string;
  eta: string;
  ctaLabel: string;
  icon: (props: { className?: string }) => JSX.Element;
};

const phases: Phase[] = [
  {
    id: "zone",
    title: "Pick your cleanup zone",
    short: "Locate and lock the mission area.",
    detail: "One tap sets your mission point on the live map so your cleanup has clear context.",
    auto: "Geo-position is captured and shown in real time.",
    eta: "~10 sec",
    ctaLabel: "Open map",
    icon: ZoneIcon,
  },
  {
    id: "proof",
    title: "Drop your before/after proof",
    short: "Two photos, zero complexity.",
    detail: "Upload quick snapshots and the platform compares visible impact with AI validation.",
    auto: "We prep and send both images for verification.",
    eta: "~25 sec",
    ctaLabel: "Upload now",
    icon: CameraIcon,
  },
  {
    id: "reward",
    title: "Verify and track reward",
    short: "From proof to payout feedback.",
    detail: "When verification passes, transfer status and mission result are logged in your history.",
    auto: "Reward routing and record sync happen automatically.",
    eta: "~15 sec",
    ctaLabel: "See history",
    icon: RewardIcon,
  },
];

type MissionStats = {
  total: number;
  verified: number;
  rewardsSent: number;
};

type HistoryStatsResponse = {
  stats?: MissionStats;
};

export default function MissionFlowExperience() {
  const [active, setActive] = useState<PhaseId>("zone");
  const [stats, setStats] = useState<MissionStats>({ total: 0, verified: 0, rewardsSent: 0 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [celebrateTick, setCelebrateTick] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const router = useRouter();

  const activePhase = useMemo(() => phases.find((phase) => phase.id === active) ?? phases[0], [active]);
  const activeIndex = phases.findIndex((phase) => phase.id === active);
  const progress = ((activeIndex + 1) / phases.length) * 100;
  const missionGoal = 12;
  const missionProgress = Math.min(100, (stats.verified / missionGoal) * 100);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch("/api/history?limit=1&includeStats=true", { cache: "no-store" });
        if (!response.ok) return;

        const data = (await response.json()) as HistoryStatsResponse;
        if (data.stats) {
          setStats(data.stats);
        }
      } finally {
        setIsLoaded(true);
      }
    };

    loadStats();
  }, []);

  useEffect(() => {
    const onMissionVerified = () => {
      setStats((previous) => ({
        ...previous,
        total: previous.total + 1,
        verified: previous.verified + 1,
      }));
      setCelebrateTick((previous) => previous + 1);
      setShowCelebration(true);
    };

    window.addEventListener("mission:verified", onMissionVerified);
    return () => window.removeEventListener("mission:verified", onMissionVerified);
  }, []);

  useEffect(() => {
    if (!showCelebration) return;

    const timer = window.setTimeout(() => {
      setShowCelebration(false);
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [showCelebration]);

  const handleAction = (id: PhaseId) => {
    if (id === "zone") {
      document.getElementById("zone-map")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    if (id === "proof") {
      document.getElementById("verify")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    router.push("/history");
  };

  return (
    <section className="earth-card rounded-2xl p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="earth-kicker text-xs font-semibold uppercase tracking-[0.16em]">Frictionless Mission Flow</p>
          <h2 className="mt-1 text-xl font-bold">Clean. Snap. Earn.</h2>
          <p className="earth-muted mt-1 text-sm">Choose any phase to jump instantly. Everything is designed to feel fast and obvious.</p>
        </div>
        <span className="earth-pill rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.09em]">
          Estimated total: &lt; 1 minute
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <MetricCard
          label="Missions Completed"
          value={isLoaded ? String(stats.verified) : "..."}
          hint="Every successful image verification adds 1 mission"
          pulseKey={celebrateTick}
        />
        <MetricCard
          label="Total Attempts"
          value={isLoaded ? String(stats.total) : "..."}
          hint="Includes approved and failed submissions"
        />
        <MetricCard
          label="Rewards Sent"
          value={isLoaded ? String(stats.rewardsSent) : "..."}
          hint="Successful payouts on verified cleanups"
        />
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--surface-soft)]">
        <div className="h-full rounded-full bg-[var(--brand-earth)] transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      <div className="mt-2 flex items-center justify-between">
        <p className="earth-muted text-xs">Mission cycle progress</p>
        <p className="text-xs font-semibold text-[var(--brand-water)]">{Math.round(missionProgress)}%</p>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--surface-soft)]">
        <motion.div
          className="h-full rounded-full bg-[var(--brand-water)]"
          animate={{ width: `${missionProgress}%` }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {phases.map((phase, index) => {
          const isActive = phase.id === active;
          const Icon = phase.icon;

          return (
            <button
              key={phase.id}
              type="button"
              onClick={() => setActive(phase.id)}
              className={`text-left rounded-xl border px-3 py-3 transition focus-visible:earth-focus ${
                isActive
                  ? "border-[var(--brand-earth)] bg-[var(--brand-water-soft)] text-[var(--text-strong)]"
                  : "border-[var(--card-border)] bg-[var(--surface-soft)] hover:border-[var(--brand-water)]"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="earth-pill inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold">
                  {index + 1}
                </span>
                <Icon className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-[0.1em]">{phase.id}</p>
              </div>
              <p className="mt-2 text-sm font-semibold">{phase.title}</p>
              <p className="earth-muted mt-1 text-xs">{phase.short}</p>
            </button>
          );
        })}
      </div>

      <div className="earth-soft mt-4 rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">{activePhase.title}</p>
          <span className="earth-pill rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]">
            ETA {activePhase.eta}
          </span>
        </div>
        <p className="earth-muted mt-2 text-sm">{activePhase.detail}</p>
        <p className="mt-2 text-xs font-medium text-[var(--brand-water)]">Auto: {activePhase.auto}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleAction(activePhase.id)}
            className="earth-primary rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-[0.09em] focus-visible:earth-focus"
          >
            {activePhase.ctaLabel}
          </button>
          <button
            type="button"
            onClick={() => setActive(phases[(activeIndex + 1) % phases.length].id)}
            className="earth-secondary rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-[0.09em] focus-visible:earth-focus"
          >
            Next phase
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showCelebration && (
          <motion.div
            key={celebrateTick}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="mt-3 rounded-xl border border-emerald-400/40 bg-emerald-500/12 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-200"
          >
            Mission completed. Counter updated in real time.
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
  pulseKey?: number;
};

function MetricCard({ label, value, hint, pulseKey }: MetricCardProps) {
  return (
    <motion.article
      className="earth-soft rounded-xl p-3"
      animate={pulseKey ? { scale: [1, 1.04, 1] } : undefined}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <p className="earth-muted text-[10px] font-semibold uppercase tracking-[0.1em]">{label}</p>
      <p className="mt-1 text-xl font-bold leading-none">{value}</p>
      <p className="earth-muted mt-1 text-[11px]">{hint}</p>
    </motion.article>
  );
}

function ZoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 21s6-5.5 6-10a6 6 0 1 0-12 0c0 4.5 6 10 6 10Z" />
      <circle cx="12" cy="11" r="2.5" />
    </svg>
  );
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 8h3l1.2-2h7.6L17 8h3v10H4Z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}

function RewardIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8" />
      <path d="M9.5 12h5" />
      <path d="M12 9.5V15" />
    </svg>
  );
}