export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-5 py-8 sm:px-6 sm:py-10">
      <section className="earth-card rounded-3xl p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="earth-kicker text-xs font-semibold uppercase tracking-[0.22em]">LitterLoot</p>
            <h1 className="mt-2 text-3xl font-black leading-tight sm:text-5xl">Point. Clean. Earn.</h1>
            <p className="earth-muted mt-3 max-w-2xl text-sm leading-relaxed sm:text-base">
              LitterLoot turns real-world cleanups into verified impact and on-chain rewards. Capture before and after
              photos, let AI validate the cleanup, and receive SOL rewards to your linked wallet.
            </p>
          </div>

          <div className="earth-soft min-w-[220px] rounded-2xl p-3 text-xs sm:text-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em]">Built By</p>
            <p className="mt-1 text-base font-bold sm:text-lg">Ronald Azuero Maldonado</p>
            <p className="earth-muted mt-1">Hackathon MVP · Web3 + AI for environmental action</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <article className="earth-soft rounded-2xl p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">Step 1</p>
            <p className="mt-1 text-sm font-bold">Scan & capture</p>
            <p className="earth-muted mt-1 text-xs">Take before and after photos from your cleanup location.</p>
          </article>
          <article className="earth-soft rounded-2xl p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">Step 2</p>
            <p className="mt-1 text-sm font-bold">AI verification</p>
            <p className="earth-muted mt-1 text-xs">Gemini checks if visible litter was actually removed.</p>
          </article>
          <article className="earth-soft rounded-2xl p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">Step 3</p>
            <p className="mt-1 text-sm font-bold">Reward & history</p>
            <p className="earth-muted mt-1 text-xs">Valid missions trigger SOL payouts and are saved in history.</p>
          </article>
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <a
            href="/api/auth/login?returnTo=/dashboard"
            className="earth-primary inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-base font-bold transition sm:w-auto sm:min-w-[220px]"
          >
            Login With Auth0
          </a>
          <a
            href="/api/auth/login?returnTo=/achievements"
            className="earth-secondary inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold uppercase tracking-[0.08em] sm:w-auto"
          >
            View Achievements
          </a>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <article className="earth-card rounded-2xl p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">Core Stack</p>
            <p className="earth-muted mt-1 text-xs sm:text-sm">
              Next.js 14 · TypeScript · Tailwind · Auth0 · Gemini AI · Solana Devnet · SQLite
            </p>
          </article>
          <article className="earth-card rounded-2xl p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">Why It Matters</p>
            <p className="earth-muted mt-1 text-xs sm:text-sm">
              A simple mobile-first flow that rewards measurable cleanup actions and encourages repeat impact.
            </p>
          </article>
        </div>

        <p className="earth-muted mt-5 text-center text-xs">
          Earth Day Edition MVP · Designed and developed by Ronald Azuero Maldonado
        </p>
      </section>
    </main>
  );
}
