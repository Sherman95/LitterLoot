"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import bs58 from "bs58";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";

const WalletMultiButtonNoSSR = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

type WalletResponse = {
  walletAddress: string | null;
};

type ChallengeResponse = {
  challenge: string;
};

export default function WalletPreferences() {
  const { publicKey, connected, wallets, signMessage } = useWallet();
  const [isMounted, setIsMounted] = useState(false);
  const [isIosDevice, setIsIosDevice] = useState(false);
  const [isPhantomInAppBrowser, setIsPhantomInAppBrowser] = useState(false);
  const [phantomDeepLink, setPhantomDeepLink] = useState<string | null>(null);
  const [linkedWallet, setLinkedWallet] = useState<string | null>(null);
  const [walletLoaded, setWalletLoaded] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  const phantomState = useMemo(
    () => wallets.find((wallet) => wallet.adapter.name === "Phantom")?.readyState,
    [wallets]
  );
  const solflareState = useMemo(
    () => wallets.find((wallet) => wallet.adapter.name === "Solflare")?.readyState,
    [wallets]
  );

  useEffect(() => {
    setIsMounted(true);

    if (typeof window !== "undefined" && typeof navigator !== "undefined") {
      const isIos = detectIosDevice(navigator.userAgent);
      const isPhantomInApp = detectPhantomInAppBrowser(navigator.userAgent);

      setIsIosDevice(isIos);
      setIsPhantomInAppBrowser(isPhantomInApp);

      if (isIos && !isPhantomInApp) {
        setPhantomDeepLink(buildPhantomBrowseDeepLink(window.location.href));
      }
    }
  }, []);

  useEffect(() => {
    const loadLinkedWallet = async () => {
      try {
        const response = await fetch("/api/wallet", { cache: "no-store" });
        if (!response.ok) {
          setMessage("Could not load linked wallet.");
          return;
        }

        const data = (await response.json()) as WalletResponse;
        setLinkedWallet(data.walletAddress);
      } catch {
        setMessage("Could not load linked wallet.");
      } finally {
        setWalletLoaded(true);
      }
    };

    loadLinkedWallet();
  }, []);

  useEffect(() => {
    if (!walletLoaded || !connected || !publicKey || isLinking) return;
    if (publicKey.toBase58() === linkedWallet) return;
    if (linkedWallet) {
      setMessage("A wallet is already linked to your account. Connect it only if you want to replace it.");
      return;
    }

    if (!signMessage) {
      setMessage("This wallet does not support message signing.");
      return;
    }

    let cancelled = false;

    const linkWallet = async () => {
      if (cancelled) return;
      setIsLinking(true);
      const walletAddress = publicKey.toBase58();

      try {
        const challengeResponse = await fetch("/api/wallet/challenge", { cache: "no-store" });
        const challengeData = (await challengeResponse.json()) as ChallengeResponse & { error?: string };

        if (!challengeResponse.ok || !challengeData.challenge) {
          throw new Error(challengeData.error ?? "Could not request wallet challenge.");
        }

        const messageBytes = new TextEncoder().encode(challengeData.challenge);
        const signatureBytes = await signMessage(messageBytes);
        const signature = bs58.encode(signatureBytes);

        const response = await fetch("/api/wallet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress,
            challenge: challengeData.challenge,
            signature,
          }),
        });

        const data = (await response.json()) as { error?: string; walletAddress?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "Could not link connected wallet.");
        }

        if (!cancelled) {
          setLinkedWallet(data.walletAddress ?? walletAddress);
          setMessage("Wallet connected and linked to your account.");
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "Could not link connected wallet.");
        }
      } finally {
        if (!cancelled) {
          setIsLinking(false);
        }
      }
    };

    const timer = window.setTimeout(() => {
      void linkWallet();
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [connected, isLinking, linkedWallet, publicKey, signMessage, walletLoaded]);

  return (
    <section className="earth-card rounded-2xl p-4">
      <p className="earth-kicker text-xs uppercase tracking-[0.14em]">Preferred Wallets</p>
      <h2 className="mt-1 text-lg font-bold">Payout wallet</h2>
      <p className="earth-muted mt-1 text-sm">Supported now: Phantom and Solflare. Link once, then keep using the app.</p>

      <p className="earth-muted mt-3 text-xs">
        Detection: Phantom {isMounted ? formatWalletState(phantomState) : "Checking..."} · Solflare{" "}
        {isMounted ? formatWalletState(solflareState) : "Checking..."}
      </p>

      {isIosDevice && !isPhantomInAppBrowser && (
        <div className="mt-3 rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-xs text-amber-100">
          <p className="font-semibold text-amber-200">iOS Wallet Tip</p>
          <p className="mt-1 text-amber-100/90">
            If you log in with Google in one browser and connect Phantom in another app context, Auth0 can ask you to
            sign in again. Keep login and wallet connect in the same browser session.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {phantomDeepLink && (
              <a
                href={phantomDeepLink}
                className="rounded-lg border border-amber-300/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-100 hover:bg-amber-500/20"
              >
                Open This Page In Phantom
              </a>
            )}
            <button
              type="button"
              onClick={async () => {
                try {
                  if (typeof window !== "undefined" && navigator.clipboard?.writeText) {
                    await navigator.clipboard.writeText(window.location.href);
                    setMessage("Current URL copied. Open it in Safari and connect wallet from the same session.");
                    return;
                  }
                } catch {
                  // Fallback message when clipboard access is blocked.
                }

                setMessage("Could not copy automatically. Open this page in Safari and continue there.");
              }}
              className="rounded-lg border border-amber-300/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-100 hover:bg-amber-500/20"
            >
              Copy URL For Safari
            </button>
          </div>
        </div>
      )}

      {isPhantomInAppBrowser && (
        <div className="mt-3 rounded-xl border border-emerald-400/40 bg-emerald-500/10 p-3 text-xs text-emerald-100">
          <p className="font-semibold text-emerald-200">Phantom Browser Detected</p>
          <p className="mt-1 text-emerald-100/90">
            Great, you are already in Phantom. Complete login and wallet connect here to avoid session resets.
          </p>
        </div>
      )}

      <div className="mt-2 flex justify-start">
        <WalletMultiButtonNoSSR className="!h-10 !rounded-xl !bg-[var(--brand-water)] !px-4 !text-sm !font-semibold !text-white hover:!brightness-110" />
      </div>

      <label className="earth-muted mt-4 block text-xs font-semibold uppercase tracking-[0.14em]">
        Linked Wallet
      </label>
      <p className="earth-soft mt-1 break-all rounded-xl px-3 py-2 text-xs">
        {!walletLoaded ? "Loading linked wallet..." : linkedWallet ?? "No wallet linked yet."}
      </p>

      {walletLoaded && linkedWallet && (
        <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-300">
          Linked and ready. You do not need to reconnect on every visit.
        </p>
      )}

      {isLinking && <p className="mt-2 text-xs text-amber-300">Awaiting signature...</p>}
      {message && <p className="mt-2 text-xs text-[var(--brand-water)]">{message}</p>}
    </section>
  );
}

function detectIosDevice(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

function detectPhantomInAppBrowser(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return ua.includes("phantom");
}

function buildPhantomBrowseDeepLink(url: string): string {
  return `https://phantom.app/ul/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(url)}`;
}

function formatWalletState(state: WalletReadyState | undefined): string {
  if (!state) return "Unknown";

  switch (state) {
    case WalletReadyState.Installed:
      return "Installed";
    case WalletReadyState.Loadable:
      return "Loadable";
    case WalletReadyState.NotDetected:
      return "Not detected";
    case WalletReadyState.Unsupported:
      return "Unsupported";
    default:
      return "Unknown";
  }
}
