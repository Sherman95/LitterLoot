import { getSession } from "@auth0/nextjs-auth0";
import { NextResponse } from "next/server";
import { setWalletChallengeForUser } from "@/utils/userWalletStore";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  const userSub = session?.user?.sub;

  if (!userSub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const nonce = crypto.randomUUID();
  const challenge = [
    "LitterLoot Wallet Link",
    `User: ${userSub}`,
    `Nonce: ${nonce}`,
    "Purpose: Verify wallet ownership for rewards.",
  ].join("\n");

  const expiresAt = Date.now() + 5 * 60 * 1000;
  await setWalletChallengeForUser(userSub, challenge, expiresAt);

  return NextResponse.json({
    challenge,
    expiresAt,
  });
}
