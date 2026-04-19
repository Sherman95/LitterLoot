import { getSession } from "@auth0/nextjs-auth0";
import { NextRequest, NextResponse } from "next/server";
import { createWalletLinkAttemptForUser } from "@/utils/userWalletStore";

export const runtime = "nodejs";

function normalizeReturnTo(raw: string | null): string {
  if (!raw || !raw.startsWith("/")) return "/profile";
  if (raw.startsWith("//")) return "/profile";
  return raw;
}

function buildPhantomBrowseDeepLink(url: string): string {
  return `https://phantom.app/ul/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent(url)}`;
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  const userSub = session?.user?.sub;

  if (!userSub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const returnTo = normalizeReturnTo(request.nextUrl.searchParams.get("returnTo"));
  const nonce = crypto.randomUUID();
  const challenge = [
    "LitterLoot Mobile Wallet Link",
    `User: ${userSub}`,
    `Nonce: ${nonce}`,
    "Purpose: Verify wallet ownership for rewards.",
  ].join("\n");
  const expiresAt = Date.now() + 5 * 60 * 1000;

  const attempt = await createWalletLinkAttemptForUser(userSub, challenge, expiresAt, returnTo);
  const walletLinkUrl = `${request.nextUrl.origin}/wallet-link?attempt=${encodeURIComponent(attempt.attemptId)}`;

  return NextResponse.json({
    attemptId: attempt.attemptId,
    walletLinkUrl,
    deepLink: buildPhantomBrowseDeepLink(walletLinkUrl),
    expiresAt,
  });
}
