import { Suspense } from "react";
import WalletLinkClient from "./WalletLinkClient";

export default function WalletLinkPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col gap-4 px-4 py-8">
          <section className="earth-card rounded-2xl p-5">
            <p className="text-sm">Loading secure link...</p>
          </section>
        </main>
      }
    >
      <WalletLinkClient />
    </Suspense>
  );
}
