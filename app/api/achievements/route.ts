import { getSession } from "@auth0/nextjs-auth0";
import { NextRequest, NextResponse } from "next/server";
import { sendSolReward } from "@/utils/solanaReward";
import {
  getAchievementClaimsForUser,
  removeAchievementClaimForUser,
  reserveAchievementClaimForUser,
  setAchievementClaimSignatureForUser,
  getVerificationStatsForUser,
  getWalletForUser,
} from "@/utils/userWalletStore";

export const runtime = "nodejs";

type AchievementDefinition = {
  id: string;
  title: string;
  description: string;
  target: number;
  bonusSol: number;
};

const achievementDefinitions: AchievementDefinition[] = [
  {
    id: "clean-5",
    title: "Street Scout",
    description: "Verify 5 clean places.",
    target: 5,
    bonusSol: 0.01,
  },
  {
    id: "clean-20",
    title: "Neighborhood Ranger",
    description: "Verify 20 clean places.",
    target: 20,
    bonusSol: 0.03,
  },
  {
    id: "clean-50",
    title: "City Guardian",
    description: "Verify 50 clean places.",
    target: 50,
    bonusSol: 0.08,
  },
];

export async function GET() {
  const session = await getSession();
  const userSub = session?.user?.sub;

  if (!userSub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [stats, claims] = await Promise.all([
    getVerificationStatsForUser(userSub),
    getAchievementClaimsForUser(userSub),
  ]);

  const claimMap = new Map(claims.map((claim) => [claim.achievementId, claim]));
  const achievements = achievementDefinitions.map((achievement) => {
    const progress = Math.min(achievement.target, stats.verified);
    const unlocked = stats.verified >= achievement.target;
    const claim = claimMap.get(achievement.id);

    return {
      ...achievement,
      progress,
      unlocked,
      claimed: Boolean(claim),
      claimSignature: claim?.signature,
      claimedAt: claim?.claimedAt,
    };
  });

  return NextResponse.json({
    stats,
    achievements,
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  const userSub = session?.user?.sub;

  if (!userSub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { achievementId?: string };
  const achievementId = body.achievementId?.trim();

  if (!achievementId) {
    return NextResponse.json({ error: "achievementId is required." }, { status: 400 });
  }

  const achievement = achievementDefinitions.find((item) => item.id === achievementId);
  if (!achievement) {
    return NextResponse.json({ error: "Achievement not found." }, { status: 404 });
  }

  const [stats, walletAddress] = await Promise.all([
    getVerificationStatsForUser(userSub),
    getWalletForUser(userSub),
  ]);

  if (!walletAddress) {
    return NextResponse.json({ error: "Link a wallet in Profile before claiming rewards." }, { status: 400 });
  }

  if (stats.verified < achievement.target) {
    return NextResponse.json({ error: "Achievement is still locked." }, { status: 400 });
  }

  const reserved = await reserveAchievementClaimForUser(userSub, achievement.id, achievement.bonusSol);
  if (!reserved) {
    return NextResponse.json({ error: "Achievement already claimed." }, { status: 409 });
  }

  let signature: string;
  try {
    signature = await sendSolReward(walletAddress, achievement.bonusSol);
    await setAchievementClaimSignatureForUser(userSub, achievement.id, signature);
  } catch (error) {
    await removeAchievementClaimForUser(userSub, achievement.id);
    throw error;
  }

  return NextResponse.json({
    success: true,
    achievementId: achievement.id,
    bonusSol: achievement.bonusSol,
    signature,
  });
}