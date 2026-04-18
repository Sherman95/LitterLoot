import { getSession } from "@auth0/nextjs-auth0";
import { NextRequest, NextResponse } from "next/server";
import { getVerificationHistoryForUser, getVerificationStatsForUser } from "@/utils/userWalletStore";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getSession();
  const userSub = session?.user?.sub;

  if (!userSub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(50, Math.max(1, Number(limitParam ?? "10") || 10));
  const includeStats = request.nextUrl.searchParams.get("includeStats") === "true";
  const history = await getVerificationHistoryForUser(userSub, limit);
  const stats = includeStats ? await getVerificationStatsForUser(userSub) : undefined;

  return NextResponse.json({ history, stats });
}
