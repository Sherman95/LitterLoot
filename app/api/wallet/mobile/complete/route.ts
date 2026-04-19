import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";
import {
  getWalletLinkAttemptById,
  markWalletLinkAttemptUsed,
  setWalletForUser,
} from "@/utils/userWalletStore";

export const runtime = "nodejs";

function normalizeWalletInput(value: string): string {
  return value
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, "");
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as {
    attempt?: string;
    walletAddress?: string;
    signature?: string;
  };

  const attemptId = (payload.attempt ?? "").trim();
  const walletAddress = normalizeWalletInput(payload.walletAddress ?? "");
  const signature = (payload.signature ?? "").trim();

  if (!attemptId || !walletAddress || !signature) {
    return NextResponse.json(
      { error: "attempt, walletAddress and signature are required." },
      { status: 400 }
    );
  }

  const attempt = await getWalletLinkAttemptById(attemptId);
  if (!attempt) {
    return NextResponse.json({ error: "Wallet link attempt not found." }, { status: 404 });
  }

  if (attempt.usedAt) {
    return NextResponse.json({ error: "Wallet link attempt already used." }, { status: 409 });
  }

  if (Date.now() > attempt.expiresAt) {
    return NextResponse.json({ error: "Wallet link attempt expired." }, { status: 410 });
  }

  let walletPublicKey: PublicKey;
  try {
    walletPublicKey = new PublicKey(walletAddress);
  } catch {
    return NextResponse.json({ error: "Invalid Solana wallet address." }, { status: 400 });
  }

  try {
    const messageBytes = new TextEncoder().encode(attempt.challenge);
    const signatureBytes = bs58.decode(signature);
    const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, walletPublicKey.toBytes());

    if (!isValid) {
      return NextResponse.json({ error: "Invalid wallet signature." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid signature format." }, { status: 400 });
  }

  const consumed = await markWalletLinkAttemptUsed(attemptId);
  if (!consumed) {
    return NextResponse.json({ error: "Wallet link attempt is no longer valid." }, { status: 409 });
  }

  await setWalletForUser(attempt.userSub, walletAddress);

  return NextResponse.json({
    ok: true,
    walletAddress,
    returnTo: attempt.returnTo ?? "/profile",
  });
}
