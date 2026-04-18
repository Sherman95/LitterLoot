import { mkdirSync } from "fs";
import path from "path";
import Database from "better-sqlite3";

export type VerificationHistoryEntry = {
  id: string;
  createdAt: string;
  verified: boolean;
  reasoning: string;
  rewardSent: boolean;
  signature?: string;
  rewardedWallet?: string;
  locationLat?: number;
  locationLng?: number;
};

export type VerificationStats = {
  total: number;
  verified: number;
  rewardsSent: number;
};

export type AchievementClaim = {
  achievementId: string;
  claimedAt: string;
  signature?: string;
  bonusSol: number;
};

type WalletChallenge = {
  challenge: string;
  expiresAt: number;
};

const databaseDirectory = path.join(process.cwd(), "data");
const databasePath = path.join(databaseDirectory, "litterloot.db");

mkdirSync(databaseDirectory, { recursive: true });

const db = new Database(databasePath);

db.exec(`
  CREATE TABLE IF NOT EXISTS wallet_links (
    user_sub TEXT PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    verified_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS wallet_challenges (
    user_sub TEXT PRIMARY KEY,
    challenge TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS verification_history (
    id TEXT PRIMARY KEY,
    user_sub TEXT NOT NULL,
    created_at TEXT NOT NULL,
    verified INTEGER NOT NULL,
    reasoning TEXT NOT NULL,
    reward_sent INTEGER NOT NULL,
    signature TEXT,
    rewarded_wallet TEXT,
    location_lat REAL,
    location_lng REAL
  );

  CREATE TABLE IF NOT EXISTS achievement_claims (
    user_sub TEXT NOT NULL,
    achievement_id TEXT NOT NULL,
    claimed_at TEXT NOT NULL,
    signature TEXT,
    bonus_sol REAL NOT NULL,
    PRIMARY KEY (user_sub, achievement_id)
  );
`);

ensureVerificationHistoryLocationColumns();

function ensureVerificationHistoryLocationColumns() {
  const columns = db
    .prepare("PRAGMA table_info(verification_history)")
    .all() as Array<{ name: string }>;

  const hasLocationLat = columns.some((column) => column.name === "location_lat");
  const hasLocationLng = columns.some((column) => column.name === "location_lng");

  if (!hasLocationLat) {
    db.exec("ALTER TABLE verification_history ADD COLUMN location_lat REAL");
  }

  if (!hasLocationLng) {
    db.exec("ALTER TABLE verification_history ADD COLUMN location_lng REAL");
  }
}

export async function getWalletForUser(userSub: string): Promise<string | null> {
  const row = db
    .prepare("SELECT wallet_address FROM wallet_links WHERE user_sub = ?")
    .get(userSub) as { wallet_address: string } | undefined;

  return row?.wallet_address ?? null;
}

export async function setWalletForUser(userSub: string, walletAddress: string): Promise<void> {
  db.prepare(
    `
      INSERT INTO wallet_links (user_sub, wallet_address, verified_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_sub)
      DO UPDATE SET wallet_address = excluded.wallet_address, verified_at = excluded.verified_at
    `
  ).run(userSub, walletAddress, new Date().toISOString());
}

export async function setWalletChallengeForUser(
  userSub: string,
  challenge: string,
  expiresAt: number
): Promise<void> {
  db.prepare(
    `
      INSERT INTO wallet_challenges (user_sub, challenge, expires_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_sub)
      DO UPDATE SET challenge = excluded.challenge, expires_at = excluded.expires_at
    `
  ).run(userSub, challenge, expiresAt);
}

export async function getWalletChallengeForUser(userSub: string): Promise<WalletChallenge | null> {
  const row = db
    .prepare("SELECT challenge, expires_at FROM wallet_challenges WHERE user_sub = ?")
    .get(userSub) as { challenge: string; expires_at: number } | undefined;

  if (!row) return null;
  return {
    challenge: row.challenge,
    expiresAt: row.expires_at,
  };
}

export async function clearWalletChallengeForUser(userSub: string): Promise<void> {
  db.prepare("DELETE FROM wallet_challenges WHERE user_sub = ?").run(userSub);
}

export async function addVerificationHistory(
  userSub: string,
  entry: Omit<VerificationHistoryEntry, "id" | "createdAt"> & { id?: string; createdAt?: string }
): Promise<void> {
  const id = entry.id ?? crypto.randomUUID();
  const createdAt = entry.createdAt ?? new Date().toISOString();

  db.prepare(
    `
      INSERT INTO verification_history (
        id,
        user_sub,
        created_at,
        verified,
        reasoning,
        reward_sent,
        signature,
        rewarded_wallet,
        location_lat,
        location_lng
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(
    id,
    userSub,
    createdAt,
    entry.verified ? 1 : 0,
    entry.reasoning,
    entry.rewardSent ? 1 : 0,
    entry.signature ?? null,
    entry.rewardedWallet ?? null,
    entry.locationLat ?? null,
    entry.locationLng ?? null
  );
}

export async function getVerificationHistoryForUser(
  userSub: string,
  limit = 10
): Promise<VerificationHistoryEntry[]> {
  const rows = db
    .prepare(
      `
        SELECT id, created_at, verified, reasoning, reward_sent, signature, rewarded_wallet
        , location_lat, location_lng
        FROM verification_history
        WHERE user_sub = ?
        ORDER BY created_at DESC
        LIMIT ?
      `
    )
    .all(userSub, limit) as Array<{
    id: string;
    created_at: string;
    verified: number;
    reasoning: string;
    reward_sent: number;
    signature: string | null;
    rewarded_wallet: string | null;
    location_lat: number | null;
    location_lng: number | null;
  }>;

  return rows.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    verified: row.verified === 1,
    reasoning: row.reasoning,
    rewardSent: row.reward_sent === 1,
    signature: row.signature ?? undefined,
    rewardedWallet: row.rewarded_wallet ?? undefined,
    locationLat: row.location_lat ?? undefined,
    locationLng: row.location_lng ?? undefined,
  }));
}

export async function getVerificationStatsForUser(userSub: string): Promise<VerificationStats> {
  const row = db
    .prepare(
      `
        SELECT
          COUNT(*) AS total,
          SUM(CASE WHEN verified = 1 THEN 1 ELSE 0 END) AS verified,
          SUM(CASE WHEN reward_sent = 1 THEN 1 ELSE 0 END) AS rewards_sent
        FROM verification_history
        WHERE user_sub = ?
      `
    )
    .get(userSub) as
    | {
        total: number;
        verified: number | null;
        rewards_sent: number | null;
      }
    | undefined;

  return {
    total: row?.total ?? 0,
    verified: row?.verified ?? 0,
    rewardsSent: row?.rewards_sent ?? 0,
  };
}

export async function getAchievementClaimsForUser(userSub: string): Promise<AchievementClaim[]> {
  const rows = db
    .prepare(
      `
        SELECT achievement_id, claimed_at, signature, bonus_sol
        FROM achievement_claims
        WHERE user_sub = ?
        ORDER BY claimed_at DESC
      `
    )
    .all(userSub) as Array<{
    achievement_id: string;
    claimed_at: string;
    signature: string | null;
    bonus_sol: number;
  }>;

  return rows.map((row) => ({
    achievementId: row.achievement_id,
    claimedAt: row.claimed_at,
    signature: row.signature ?? undefined,
    bonusSol: row.bonus_sol,
  }));
}

export async function addAchievementClaimForUser(
  userSub: string,
  achievementId: string,
  bonusSol: number,
  signature?: string
): Promise<void> {
  db.prepare(
    `
      INSERT INTO achievement_claims (user_sub, achievement_id, claimed_at, signature, bonus_sol)
      VALUES (?, ?, ?, ?, ?)
    `
  ).run(userSub, achievementId, new Date().toISOString(), signature ?? null, bonusSol);
}

export async function reserveAchievementClaimForUser(
  userSub: string,
  achievementId: string,
  bonusSol: number
): Promise<boolean> {
  try {
    db.prepare(
      `
        INSERT INTO achievement_claims (user_sub, achievement_id, claimed_at, signature, bonus_sol)
        VALUES (?, ?, ?, NULL, ?)
      `
    ).run(userSub, achievementId, new Date().toISOString(), bonusSol);

    return true;
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
    if (code.startsWith("SQLITE_CONSTRAINT")) {
      return false;
    }

    throw error;
  }
}

export async function setAchievementClaimSignatureForUser(
  userSub: string,
  achievementId: string,
  signature: string
): Promise<void> {
  db.prepare(
    `
      UPDATE achievement_claims
      SET signature = ?
      WHERE user_sub = ? AND achievement_id = ?
    `
  ).run(signature, userSub, achievementId);
}

export async function removeAchievementClaimForUser(
  userSub: string,
  achievementId: string
): Promise<void> {
  db.prepare("DELETE FROM achievement_claims WHERE user_sub = ? AND achievement_id = ?").run(
    userSub,
    achievementId
  );
}
