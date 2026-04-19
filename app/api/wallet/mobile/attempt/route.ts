import { NextRequest, NextResponse } from "next/server";
import { getWalletLinkAttemptById } from "@/utils/userWalletStore";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const attemptId = (request.nextUrl.searchParams.get("attempt") ?? "").trim();
  if (!attemptId) {
    return NextResponse.json({ error: "attempt is required" }, { status: 400 });
  }

  const attempt = await getWalletLinkAttemptById(attemptId);
  if (!attempt) {
    return NextResponse.json({ error: "Wallet link attempt not found." }, { status: 404 });
  }

  if (attempt.usedAt) {
    return NextResponse.json({ error: "Wallet link attempt already used." }, { status: 410 });
  }

  if (Date.now() > attempt.expiresAt) {
    return NextResponse.json({ error: "Wallet link attempt expired." }, { status: 410 });
  }

  return NextResponse.json({
    challenge: attempt.challenge,
    expiresAt: attempt.expiresAt,
    returnTo: attempt.returnTo ?? "/profile",
  });
}
