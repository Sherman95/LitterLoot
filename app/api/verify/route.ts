import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSession } from "@auth0/nextjs-auth0";
import { NextRequest, NextResponse } from "next/server";
import { sendCleanupReward } from "@/utils/solanaReward";
import { addVerificationHistory, getWalletForUser } from "@/utils/userWalletStore";

export const runtime = "nodejs";

type VerifyPayload = {
  beforeImage?: string;
  afterImage?: string;
  locationLat?: number;
  locationLng?: number;
};

type GeminiResult = {
  verified: boolean;
  reasoning: string;
};

const VERIFY_WINDOW_MS = 15 * 60 * 1000;
const VERIFY_LIMIT = 5;
const VERIFY_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const GEMINI_TIMEOUT_MS = 20_000;
const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type VerifyRateLimitStore = Map<string, number[]>;

function getVerifyRateLimitStore(): VerifyRateLimitStore {
  const globalKey = "__litterlootVerifyRateLimitStore";
  const globalScope = globalThis as typeof globalThis & {
    [key: string]: VerifyRateLimitStore | undefined;
  };

  if (!globalScope[globalKey]) {
    globalScope[globalKey] = new Map<string, number[]>();
  }

  return globalScope[globalKey] as VerifyRateLimitStore;
}

function parseRetryAfterSeconds(message: string): number {
  const match = message.match(/retry\s+in\s+([\d.]+)s/i);
  if (!match) return 60;

  return Math.max(1, Math.ceil(Number(match[1])));
}

export async function POST(request: NextRequest) {
  let payload: VerifyPayload | undefined;
  let userSub: string | undefined;

  try {
    const session = await getSession();
    userSub = session?.user?.sub;

    if (!userSub) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitCheck = checkVerifyRateLimit(userSub);
    if (!rateLimitCheck.ok) {
      return NextResponse.json(
        {
          error: "Rate limit reached for verification. Please wait and try again.",
          code: "rate_limited",
          retryAfterSeconds: rateLimitCheck.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    payload = (await request.json()) as VerifyPayload;
    const { beforeImage, afterImage } = payload;
    const locationLat = normalizeCoordinate(payload.locationLat, "lat");
    const locationLng = normalizeCoordinate(payload.locationLng, "lng");

    if (!beforeImage || !afterImage) {
      return NextResponse.json({ error: "Both beforeImage and afterImage are required." }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing GOOGLE_GEMINI_API_KEY in environment." }, { status: 500 });
    }

    const before = parseDataUrl(beforeImage);
    const after = parseDataUrl(afterImage);

    const rewardWallet = (await getWalletForUser(userSub)) ?? process.env.DEFAULT_REWARD_WALLET?.trim() ?? undefined;

    if (!rewardWallet) {
      return NextResponse.json(
        {
          error: "No linked wallet found for this user. Please link your Solana wallet first.",
          code: "wallet_missing",
        },
        { status: 400 }
      );
    }

    const ai = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GOOGLE_GEMINI_MODEL ?? "gemini-2.5-flash";
    const model = ai.getGenerativeModel({ model: modelName });

    const strictPrompt = [
      "You are a strict cleanup auditor for a clean-to-earn app.",
      "Compare TWO images: first is BEFORE cleanup, second is AFTER cleanup.",
      "Return ONLY valid JSON with EXACT schema:",
      '{"verified": true|false, "reasoning": "short concise reason"}',
      "Rules:",
      "1) verified=true only if visible litter/trash is substantially removed in the AFTER image.",
      "2) If images are unrelated, low quality, manipulated, or inconclusive -> verified=false.",
      "3) Keep reasoning under 180 characters.",
      "4) No markdown, no backticks, no extra keys.",
    ].join("\n");

    const response = await withTimeout(
      model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              { text: strictPrompt },
              {
                inlineData: {
                  mimeType: before.mimeType,
                  data: before.base64,
                },
              },
              {
                inlineData: {
                  mimeType: after.mimeType,
                  data: after.base64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
        },
      }),
      GEMINI_TIMEOUT_MS,
      "Gemini verification timed out. Please retry."
    );

    const parsed = parseGeminiJson(response.response.text());
    let signature: string | undefined;
    let rewardSent = false;

    if (parsed.verified && rewardWallet) {
      signature = await sendCleanupReward(rewardWallet);
      rewardSent = true;
    }

    await addVerificationHistory(userSub, {
      verified: parsed.verified,
      reasoning: parsed.reasoning,
      rewardSent,
      signature,
      rewardedWallet: rewardWallet,
      locationLat,
      locationLng,
    });

    return NextResponse.json({
      verified: parsed.verified,
      reasoning: parsed.reasoning,
      rewardSent,
      signature,
      rewardedWallet: rewardWallet,
    });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "Unexpected verification failure.";
    const isQuotaError = /429|quota|rate limit|Too Many Requests/i.test(rawMessage);

    if (isQuotaError && process.env.DEMO_MODE === "true") {
      if (userSub) {
        await addVerificationHistory(userSub, {
          verified: false,
          reasoning: "Demo mode fallback: Gemini quota unavailable. No reward sent.",
          rewardSent: false,
          locationLat: normalizeCoordinate(payload?.locationLat, "lat"),
          locationLng: normalizeCoordinate(payload?.locationLng, "lng"),
        });
      }

      return NextResponse.json({
        verified: false,
        reasoning: "Demo mode fallback: Gemini quota unavailable. No reward sent.",
        rewardSent: false,
      });
    }

    if (isQuotaError) {
      return NextResponse.json(
        {
          error: "Gemini request limit reached. Please wait for cooldown and retry.",
          code: "quota_exceeded",
          retryAfterSeconds: parseRetryAfterSeconds(rawMessage),
        },
        { status: 429 }
      );
    }

    if (userSub) {
      await addVerificationHistory(userSub, {
        verified: false,
        reasoning: rawMessage,
        rewardSent: false,
        locationLat: normalizeCoordinate(payload?.locationLat, "lat"),
        locationLng: normalizeCoordinate(payload?.locationLng, "lng"),
      });
    }

    return NextResponse.json({ error: rawMessage }, { status: 500 });
  }
}

function normalizeCoordinate(value: number | undefined, axis: "lat" | "lng"): number | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return undefined;
  }

  const min = axis === "lat" ? -90 : -180;
  const max = axis === "lat" ? 90 : 180;

  if (value < min || value > max) {
    return undefined;
  }

  return Number(value.toFixed(6));
}

function parseDataUrl(value: string): { mimeType: string; base64: string } {
  const match = value.match(/^data:(.+?);base64,(.+)$/);
  if (!match) {
    throw new Error("Image must be a valid Base64 data URL.");
  }

  const mimeType = match[1].toLowerCase();
  if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
    throw new Error("Unsupported image type. Use JPG, PNG, or WEBP.");
  }

  const base64 = match[2];
  const imageBytes = Buffer.from(base64, "base64").byteLength;
  if (imageBytes <= 0 || imageBytes > VERIFY_MAX_IMAGE_BYTES) {
    throw new Error("Image size must be greater than 0 and up to 5MB.");
  }

  return { mimeType, base64 };
}

function parseGeminiJson(rawText: string): GeminiResult {
  if (!rawText || !rawText.trim()) {
    throw new Error("Gemini returned an empty response.");
  }

  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Gemini did not return JSON.");
  }

  const candidate = JSON.parse(jsonMatch[0]) as Partial<GeminiResult>;

  if (typeof candidate.verified !== "boolean" || typeof candidate.reasoning !== "string") {
    throw new Error("Gemini response schema mismatch.");
  }

  return {
    verified: candidate.verified,
    reasoning: candidate.reasoning,
  };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  try {
    return (await Promise.race([promise, timeoutPromise])) as T;
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

function checkVerifyRateLimit(userSub: string): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const now = Date.now();
  const cutoff = now - VERIFY_WINDOW_MS;
  const store = getVerifyRateLimitStore();
  const existing = store.get(userSub) ?? [];
  const withinWindow = existing.filter((timestamp) => timestamp > cutoff);

  if (withinWindow.length >= VERIFY_LIMIT) {
    const oldest = withinWindow[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + VERIFY_WINDOW_MS - now) / 1000));
    store.set(userSub, withinWindow);
    return { ok: false, retryAfterSeconds };
  }

  withinWindow.push(now);
  store.set(userSub, withinWindow);
  return { ok: true };
}
