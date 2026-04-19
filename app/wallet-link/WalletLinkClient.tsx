"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";

const WalletMultiButtonNoSSR = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

type AttemptResponse = {
  challenge: string;
  expiresAt: number;
  returnTo: string;
};

export default function WalletLinkClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const attempt = (searchParams.get("attempt") ?? "").trim();
  const { connected, publicKey, signMessage } = useWallet();

  const [challenge, setChallenge] = useState<string | null>(null);
  const [returnTo, setReturnTo] = useState("/profile");
  const [loadingAttempt, setLoadingAttempt] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const canSign = Boolean(connected && publicKey && signMessage && challenge && attempt && !isSubmitting);

  const expiresLabel = useMemo(() => {
    if (!challenge) return null;
    return "This secure link expires in 5 minutes.";
  }, [challenge]);

  useEffect(() => {
    const loadAttempt = async () => {
      if (!attempt) {
        setMessage("Missing link attempt. Start again from your profile page.");
        setLoadingAttempt(false);
        return;
      }

      try {
        const response = await fetch(`/api/wallet/mobile/attempt?attempt=${encodeURIComponent(attempt)}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as AttemptResponse & { error?: string };

        if (!response.ok || !data.challenge) {
          throw new Error(data.error ?? "Could not load wallet link attempt.");
        }

        setChallenge(data.challenge);
        setReturnTo(data.returnTo || "/profile");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not load wallet link attempt.");
      } finally {
        setLoadingAttempt(false);
      }
    };

    void loadAttempt();
  }, [attempt]);

  const completeLink = async () => {
    if (!canSign || !publicKey || !signMessage || !challenge) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const messageBytes = new TextEncoder().encode(challenge);
      const signatureBytes = await signMessage(messageBytes);
      const signature = bs58.encode(signatureBytes);

      const response = await fetch("/api/wallet/mobile/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attempt,
          walletAddress: publicKey.toBase58(),
          signature,
        }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string; returnTo?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "Could not link wallet.");
      }

      setMessage("Wallet linked successfully. Redirecting...");
      window.setTimeout(() => {
        router.replace(data.returnTo || returnTo || "/profile");
      }, 700);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not link wallet.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-xl flex-col gap-4 px-4 py-8">
      <section className="earth-card rounded-2xl p-5">
        <p className="earth-kicker text-xs uppercase tracking-[0.14em]">Mobile Wallet Link</p>
        <h1 className="mt-1 text-xl font-bold">Complete Wallet Linking</h1>
        <p className="earth-muted mt-2 text-sm">
          Connect your wallet in this same browser context, then sign once to finish secure linking.
        </p>

        {loadingAttempt && <p className="mt-3 text-sm">Loading secure link...</p>}

        {!loadingAttempt && (
          <>
            <div className="mt-3 flex justify-start">
              <WalletMultiButtonNoSSR className="!h-10 !rounded-xl !bg-[var(--brand-water)] !px-4 !text-sm !font-semibold !text-white hover:!brightness-110" />
            </div>

            <button
              type="button"
              onClick={() => void completeLink()}
              disabled={!canSign}
              className="earth-primary mt-3 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-[0.09em] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Signing..." : "Sign And Link Wallet"}
            </button>

            {expiresLabel && <p className="earth-muted mt-2 text-xs">{expiresLabel}</p>}
          </>
        )}

        {message && <p className="mt-3 text-sm text-[var(--brand-water)]">{message}</p>}
      </section>
    </main>
  );
}
