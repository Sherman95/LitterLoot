export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-4 py-6 sm:px-6 sm:py-10">
      <section className="earth-card relative overflow-hidden rounded-3xl p-5 sm:p-7 lg:p-9">
        <div className="pointer-events-none absolute -right-24 -top-24 h-60 w-60 rounded-full bg-[var(--brand-water-soft)] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-52 w-52 rounded-full bg-[var(--surface-soft)] blur-2xl" />

        <div className="relative grid gap-5 lg:grid-cols-[1.3fr_0.7fr] lg:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="earth-pill rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]">
                New impact era
              </span>
              <span className="earth-pill rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]">
                Real cleanups only
              </span>
            </div>

            <p className="earth-kicker mt-3 text-[11px] font-semibold uppercase tracking-[0.24em]">LitterLoot</p>
            <h1 className="mt-2 max-w-3xl text-3xl font-black leading-tight sm:text-5xl lg:text-6xl">
              Turn Cleanup Into
              <span className="block">Proof, Progress, and Payout.</span>
            </h1>

            <p className="earth-muted mt-3 max-w-2xl text-sm leading-relaxed sm:text-base">
              Snap a before and after, let AI verify visible impact, and get rewarded on Solana. No complicated setup.
              Just a fast loop that makes people want to clean one more spot.
            </p>

            <div className="mt-4 grid gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] sm:grid-cols-3 sm:text-xs">
              <span className="earth-pill rounded-full px-2.5 py-1 text-center">Under 1 minute flow</span>
              <span className="earth-pill rounded-full px-2.5 py-1 text-center">AI proof check</span>
              <span className="earth-pill rounded-full px-2.5 py-1 text-center">Devnet rewards</span>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
              <a
                href="/api/auth/login?returnTo=/dashboard"
                className="earth-primary inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-base font-bold transition focus-visible:earth-focus sm:w-auto sm:min-w-[240px]"
              >
                Start Your First Mission
              </a>
              <a
                href="/api/auth/login?returnTo=/achievements"
                className="earth-secondary inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold uppercase tracking-[0.08em] focus-visible:earth-focus sm:w-auto"
              >
                See Rewards & Achievements
              </a>
            </div>

            <p className="earth-muted mt-2 text-xs">
              Join now and see your first verified impact in minutes.
            </p>
          </div>

          <div className="earth-soft min-w-[220px] rounded-2xl p-4 text-xs sm:text-sm lg:justify-self-end">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em]">Built By</p>
            <p className="mt-1 text-base font-bold sm:text-lg">Ronald Azuero Maldonado</p>
            <p className="earth-muted mt-1">Hackathon MVP · Web3 + AI for environmental action</p>

            <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] uppercase tracking-[0.1em] sm:text-[11px]">
              <span className="earth-card rounded-lg px-2 py-1 text-center font-semibold">Auth0</span>
              <span className="earth-card rounded-lg px-2 py-1 text-center font-semibold">Gemini</span>
              <span className="earth-card rounded-lg px-2 py-1 text-center font-semibold">Solana</span>
              <span className="earth-card rounded-lg px-2 py-1 text-center font-semibold">Next.js</span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="earth-card rounded-lg px-2 py-2">
                <p className="text-base font-black">3</p>
                <p className="earth-muted text-[10px] uppercase tracking-[0.08em]">Simple steps</p>
              </div>
              <div className="earth-card rounded-lg px-2 py-2">
                <p className="text-base font-black">AI</p>
                <p className="earth-muted text-[10px] uppercase tracking-[0.08em]">Verified</p>
              </div>
              <div className="earth-card rounded-lg px-2 py-2">
                <p className="text-base font-black">SOL</p>
                <p className="earth-muted text-[10px] uppercase tracking-[0.08em]">Rewarded</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-3 sm:gap-4">
          <article className="earth-soft rounded-2xl p-3.5 sm:p-4">
            <p className="earth-kicker text-[11px] font-semibold uppercase tracking-[0.12em]">Step 1</p>
            <p className="mt-1 text-sm font-bold sm:text-base">Spot and capture</p>
            <p className="earth-muted mt-1 text-xs leading-relaxed sm:text-sm">
              Find litter, capture before and after photos, and lock your mission in seconds.
            </p>
          </article>

          <article className="earth-soft rounded-2xl p-3.5 sm:p-4">
            <p className="earth-kicker text-[11px] font-semibold uppercase tracking-[0.12em]">Step 2</p>
            <p className="mt-1 text-sm font-bold sm:text-base">Prove with AI</p>
            <p className="earth-muted mt-1 text-xs leading-relaxed sm:text-sm">
              Gemini validates if visible litter was truly removed, keeping rewards fair.
            </p>
          </article>

          <article className="earth-soft rounded-2xl p-3.5 sm:p-4">
            <p className="earth-kicker text-[11px] font-semibold uppercase tracking-[0.12em]">Step 3</p>
            <p className="mt-1 text-sm font-bold sm:text-base">Earn and level up</p>
            <p className="earth-muted mt-1 text-xs leading-relaxed sm:text-sm">
              Verified missions trigger payouts and build your public cleanup achievement trail.
            </p>
          </article>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 sm:gap-4">
          <article className="earth-soft rounded-2xl p-3.5 sm:p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">Why users stay</p>
            <p className="earth-muted mt-1 text-xs leading-relaxed sm:text-sm">
              Instant feedback, visible progress, and tangible rewards make cleanup feel addictive in the best way.
            </p>
          </article>
          <article className="earth-soft rounded-2xl p-3.5 sm:p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">Core Stack</p>
            <p className="earth-muted mt-1 text-xs leading-relaxed sm:text-sm">
              Next.js 14 · TypeScript · Tailwind · Auth0 · Gemini AI · Solana Devnet · SQLite
            </p>
          </article>
        </div>

        <p className="earth-muted mt-6 text-center text-[11px] sm:text-xs">
          Earth Day Edition MVP · Designed and developed by Ronald Azuero Maldonado
        </p>
      </section>
    </main>
  );
}
