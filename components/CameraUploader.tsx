"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";

type VerifyResult = {
  verified: boolean;
  reasoning: string;
  rewardSent?: boolean;
  signature?: string;
  rewardedWallet?: string;
};

type VerifyError = {
  error?: string;
  code?: string;
  retryAfterSeconds?: number;
};

type WalletResponse = {
  walletAddress: string | null;
};

type CameraUploaderProps = {
  userKey: string;
};

export default function CameraUploader({ userKey }: CameraUploaderProps) {
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const [linkedWallet, setLinkedWallet] = useState<string | null>(null);
  const [walletMessage, setWalletMessage] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const canVerify = useMemo(() => Boolean(beforeImage && afterImage), [beforeImage, afterImage]);

  useEffect(() => {
    const loadLinkedWallet = async () => {
      try {
        const response = await fetch("/api/wallet", { cache: "no-store" });
        if (!response.ok) {
          setWalletMessage("Could not load linked wallet.");
          return;
        }

        const data = (await response.json()) as WalletResponse;
        setLinkedWallet(data.walletAddress);
      } catch {
        setWalletMessage("Could not load linked wallet.");
      }
    };

    loadLinkedWallet();
  }, [userKey]);

  useEffect(() => {
    if (cooldownLeft <= 0) return;

    const timer = window.setInterval(() => {
      setCooldownLeft((previous) => (previous > 0 ? previous - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldownLeft]);

  const onSelectFile = async (
    event: ChangeEvent<HTMLInputElement>,
    setter: (base64: string) => void
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await readFileAsDataURL(file);
      setter(base64);
      setResult(null);
      setUploadMessage(null);
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "Could not read selected image.");
    }
  };

  const verifyCleanup = async () => {
    if (!beforeImage || !afterImage) return;

    setLoading(true);
    setResult(null);

    try {
      const location = await captureScanLocation();

      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beforeImage,
          afterImage,
          locationLat: location?.lat,
          locationLng: location?.lng,
        }),
      });

      const data = (await response.json()) as VerifyResult & VerifyError;

      if (!response.ok) {
        if (data.code === "quota_exceeded") {
          setCooldownLeft(data.retryAfterSeconds ?? 60);
        }

        if (data.code === "wallet_missing") {
          setWalletMessage("No linked wallet. Open Profile and link your wallet first.");
        }

        throw new Error(data.error ?? "Verification request failed.");
      }

      setResult(data);

      if (data.verified) {
        window.dispatchEvent(new CustomEvent("mission:verified", { detail: { rewardSent: Boolean(data.rewardSent) } }));
      }
    } catch (error) {
      setResult({
        verified: false,
        reasoning: error instanceof Error ? error.message : "Unexpected verification error.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="verify" className="earth-card scroll-mt-24 rounded-2xl p-4 backdrop-blur">
      <h2 className="text-lg font-bold">Cleanup Proof</h2>
      <p className="earth-muted mt-1 text-sm">Upload two photos and verify your cleanup.</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <ImagePicker
          title="Before"
          image={beforeImage}
          onChange={(event) => onSelectFile(event, setBeforeImage)}
        />
        <ImagePicker title="After" image={afterImage} onChange={(event) => onSelectFile(event, setAfterImage)} />
      </div>

      <label className="earth-muted mt-4 block text-xs font-semibold uppercase tracking-[0.14em]">
        Linked Reward Wallet (Devnet)
      </label>
      <p className="earth-soft mt-1 break-all rounded-xl px-3 py-2 text-xs">
        {linkedWallet ?? "No wallet linked. Open Profile and connect your preferred wallet."}
      </p>
      {!linkedWallet && (
        <a
          href="/profile"
          className="earth-secondary mt-2 inline-flex rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em]"
        >
          Go to Profile
        </a>
      )}
      {walletMessage && <p className="mt-2 text-xs text-[var(--brand-water)]">{walletMessage}</p>}
      {uploadMessage && <p className="mt-2 text-xs text-rose-300">{uploadMessage}</p>}

      <button
        type="button"
        onClick={verifyCleanup}
        disabled={!canVerify || loading || cooldownLeft > 0 || !linkedWallet}
        className="earth-primary mt-4 w-full rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-[0.08em] transition disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Verifying..." : cooldownLeft > 0 ? `Cooldown ${cooldownLeft}s` : "Verify Cleanup"}
      </button>

      {result && (
        <div
          className={`mt-4 rounded-xl border p-3 text-sm ${
            result.verified
              ? "border-emerald-400/50 bg-emerald-500/10 text-emerald-100"
              : "border-rose-400/50 bg-rose-500/10 text-rose-100"
          }`}
        >
          <p className="font-semibold">{result.verified ? "Cleanup Verified" : "Verification Failed"}</p>
          <p className="mt-1 text-xs opacity-90">{result.reasoning}</p>
          {result.rewardSent && result.rewardedWallet && (
            <p className="mt-1 break-all text-xs">Reward wallet: {result.rewardedWallet}</p>
          )}
          {result.rewardSent && result.signature && (
            <div className="mt-2 rounded-lg border border-emerald-300/30 bg-slate-950/50 p-2">
              <p className="break-all text-xs">Reward Tx: {result.signature}</p>
              <a
                href={`https://solscan.io/tx/${result.signature}?cluster=devnet`}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex rounded-md bg-[var(--brand-water)] px-2 py-1 text-xs font-semibold text-white hover:brightness-110"
              >
                View on Solscan
              </a>
            </div>
          )}
        </div>
      )}

      <div className="earth-soft mt-4 rounded-xl p-3">
        <p className="text-sm font-semibold">History moved to separate page</p>
        <p className="earth-muted mt-1 text-xs">Open your full verification history in a dedicated section.</p>
        <a
          href="/history"
          className="earth-secondary mt-2 inline-flex rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em]"
        >
          Open History
        </a>
      </div>
    </section>
  );
}

function captureScanLocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
        });
      },
      () => resolve(null),
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 60000,
      }
    );
  });
}

type ImagePickerProps = {
  title: "Before" | "After";
  image: string | null;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

const ALLOWED_UPLOAD_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function ImagePicker({ title, image, onChange }: ImagePickerProps) {
  return (
    <label className="earth-soft block cursor-pointer rounded-xl p-2">
      <span className="earth-muted mb-2 block text-xs font-semibold uppercase tracking-[0.14em]">{title}</span>
      <div className="earth-card flex h-28 items-center justify-center overflow-hidden rounded-lg border border-dashed text-xs">
        {image ? (
          // Native img avoids iOS Safari URL-pattern issues with data URLs from camera uploads.
          <img src={image} alt={`${title} cleanup`} className="h-full w-full object-cover" />
        ) : (
          "Tap to add photo"
        )}
      </div>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        onChange={onChange}
      />
    </label>
  );
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.type)) {
      reject(
        new Error(
          "Unsupported image format. Please upload JPG, PNG, or WEBP. On iPhone, disable HEIF/HEIC or choose 'Most Compatible' in camera settings."
        )
      );
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Could not convert file to Base64."));
    };

    reader.onerror = () => reject(new Error("Could not read selected file."));
    reader.readAsDataURL(file);
  });
}
