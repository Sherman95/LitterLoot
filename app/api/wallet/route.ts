import { getSession } from "@auth0/nextjs-auth0";
import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";
import {
  clearWalletChallengeForUser,
  getWalletChallengeForUser,
  getWalletForUser,
  setWalletForUser,
} from "@/utils/userWalletStore";

export const runtime = "nodejs";

function normalizeWalletInput(value: string): string {
  return value
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, "");
}

export async function GET() {
  const session = await getSession();
  const userSub = session?.user?.sub;

  if (!userSub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const walletAddress = await getWalletForUser(userSub);
  return NextResponse.json({ walletAddress });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  const userSub = session?.user?.sub;

  if (!userSub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as {
    walletAddress?: string;
    signature?: string;
    challenge?: string;
  };
  const rawWallet = payload.walletAddress ?? "";
  const walletAddress = normalizeWalletInput(rawWallet);
  const signature = (payload.signature ?? "").trim();
  const challenge = (payload.challenge ?? "").trim();

  if (!walletAddress) {
    return NextResponse.json({ error: "walletAddress is required" }, { status: 400 });
  }

  if (walletAddress.startsWith("[") || walletAddress.includes(",")) {
    return NextResponse.json(
      {
        error:
          "You pasted a secret key array. Please paste your public wallet address (Base58), e.g. EWkHtc...",
      },
      { status: 400 }
    );
  }

  let walletPublicKey: PublicKey;
  try {
    walletPublicKey = new PublicKey(walletAddress);
  } catch {
    return NextResponse.json({ error: "Invalid Solana wallet address" }, { status: 400 });
  }

  if (!signature || !challenge) {
    return NextResponse.json(
      { error: "Wallet signature and challenge are required." },
      { status: 400 }
    );
  }

  const savedChallenge = await getWalletChallengeForUser(userSub);
  if (!savedChallenge) {
    return NextResponse.json(
      { error: "Challenge not found. Request a new challenge and sign again." },
      { status: 400 }
    );
  }

  if (Date.now() > savedChallenge.expiresAt) {
    await clearWalletChallengeForUser(userSub);
    return NextResponse.json(
      { error: "Challenge expired. Request a new challenge and sign again." },
      { status: 400 }
    );
  }

  if (savedChallenge.challenge !== challenge) {
    return NextResponse.json({ error: "Challenge mismatch." }, { status: 400 });
  }

  try {
    const messageBytes = new TextEncoder().encode(challenge);
    const signatureBytes = bs58.decode(signature);
    const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, walletPublicKey.toBytes());

    if (!isValid) {
      return NextResponse.json({ error: "Invalid wallet signature." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid signature format." }, { status: 400 });
  }

  await clearWalletChallengeForUser(userSub);

  await setWalletForUser(userSub, walletAddress);
  return NextResponse.json({ ok: true, walletAddress });
}
