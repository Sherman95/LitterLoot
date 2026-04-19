import { mkdirSync } from "fs";
import path from "path";
import Database from "better-sqlite3";
import postgres from "postgres";

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

export type WalletLinkAttempt = {
  attemptId: string;
  userSub: string;
  challenge: string;
  expiresAt: number;
  usedAt?: string;
  returnTo?: string;
};

const postgresUrl =
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL ??
  process.env.SUPABASE_DB_URL ??
  "";
const usePostgres = Boolean(postgresUrl);
const pg = usePostgres
  ? postgres(postgresUrl, {
      ssl: "require",
      max: 1,
      // Supabase pooler can reject prepared statements in transaction mode.
      prepare: false,
    })
  : null;

if (process.env.VERCEL === "1" && process.env.NODE_ENV === "production" && !usePostgres) {
  throw new Error(
    "No Postgres connection string found. Set POSTGRES_URL, DATABASE_URL, or SUPABASE_DB_URL in production."
  );
}

let sqliteDb: Database.Database | null = null;

if (!usePostgres) {
  const databaseDirectory = path.join(process.cwd(), "data");
  const databasePath = path.join(databaseDirectory, "litterloot.db");

  mkdirSync(databaseDirectory, { recursive: true });
  sqliteDb = new Database(databasePath);
  sqliteDb.exec(`
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

    CREATE TABLE IF NOT EXISTS wallet_link_attempts (
      attempt_id TEXT PRIMARY KEY,
      user_sub TEXT NOT NULL,
      challenge TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      used_at TEXT,
      return_to TEXT
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

  const columns = sqliteDb
    .prepare("PRAGMA table_info(verification_history)")
    .all() as Array<{ name: string }>;

  const hasLocationLat = columns.some((column) => column.name === "location_lat");
  const hasLocationLng = columns.some((column) => column.name === "location_lng");

  if (!hasLocationLat) {
    sqliteDb.exec("ALTER TABLE verification_history ADD COLUMN location_lat REAL");
  }

  if (!hasLocationLng) {
    sqliteDb.exec("ALTER TABLE verification_history ADD COLUMN location_lng REAL");
  }
}

const storageReady = usePostgres ? ensurePostgresSchema() : Promise.resolve();

async function ensureReady() {
  await storageReady;
}

async function ensurePostgresSchema() {
  const sql = getPostgresClient();

  await sql`
    CREATE TABLE IF NOT EXISTS wallet_links (
      user_sub TEXT PRIMARY KEY,
      wallet_address TEXT NOT NULL,
      verified_at TIMESTAMPTZ NOT NULL
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS wallet_challenges (
      user_sub TEXT PRIMARY KEY,
      challenge TEXT NOT NULL,
      expires_at BIGINT NOT NULL
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS wallet_link_attempts (
      attempt_id TEXT PRIMARY KEY,
      user_sub TEXT NOT NULL,
      challenge TEXT NOT NULL,
      expires_at BIGINT NOT NULL,
      used_at TIMESTAMPTZ,
      return_to TEXT
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS verification_history (
      id TEXT PRIMARY KEY,
      user_sub TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      verified BOOLEAN NOT NULL,
      reasoning TEXT NOT NULL,
      reward_sent BOOLEAN NOT NULL,
      signature TEXT,
      rewarded_wallet TEXT,
      location_lat DOUBLE PRECISION,
      location_lng DOUBLE PRECISION
    )`;

  await sql`
    CREATE TABLE IF NOT EXISTS achievement_claims (
      user_sub TEXT NOT NULL,
      achievement_id TEXT NOT NULL,
      claimed_at TIMESTAMPTZ NOT NULL,
      signature TEXT,
      bonus_sol DOUBLE PRECISION NOT NULL,
      PRIMARY KEY (user_sub, achievement_id)
    )`;
}

function getSqliteDb(): Database.Database {
  if (!sqliteDb) {
    throw new Error("SQLite database is not available in Postgres mode.");
  }

  return sqliteDb;
}

function getPostgresClient() {
  if (!pg) {
    throw new Error("Postgres client is not configured. Set POSTGRES_URL, DATABASE_URL, or SUPABASE_DB_URL.");
  }

  return pg;
}

function getPgErrorCode(error: unknown): string {
  return typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
}

export async function getWalletForUser(userSub: string): Promise<string | null> {
  await ensureReady();

  if (usePostgres) {
    const sql = getPostgresClient();
    const rows = (await sql`
      SELECT wallet_address
      FROM wallet_links
      WHERE user_sub = ${userSub}
      LIMIT 1
    `) as Array<{ wallet_address: string }>;
    return rows[0]?.wallet_address ?? null;
  }

  const row = getSqliteDb()
    .prepare("SELECT wallet_address FROM wallet_links WHERE user_sub = ?")
    .get(userSub) as { wallet_address: string } | undefined;

  return row?.wallet_address ?? null;
}

export async function setWalletForUser(userSub: string, walletAddress: string): Promise<void> {
  await ensureReady();

  if (usePostgres) {
    const sql = getPostgresClient();
    await sql`
      INSERT INTO wallet_links (user_sub, wallet_address, verified_at)
      VALUES (${userSub}, ${walletAddress}, ${new Date().toISOString()})
      ON CONFLICT(user_sub)
      DO UPDATE SET wallet_address = EXCLUDED.wallet_address, verified_at = EXCLUDED.verified_at
    `;
    return;
  }

  getSqliteDb()
    .prepare(
      `
        INSERT INTO wallet_links (user_sub, wallet_address, verified_at)
        VALUES (?, ?, ?)
        ON CONFLICT(user_sub)
        DO UPDATE SET wallet_address = excluded.wallet_address, verified_at = excluded.verified_at
      `
    )
    .run(userSub, walletAddress, new Date().toISOString());
}

export async function setWalletChallengeForUser(
  userSub: string,
  challenge: string,
  expiresAt: number
): Promise<void> {
  await ensureReady();

  if (usePostgres) {
    const sql = getPostgresClient();
    await sql`
      INSERT INTO wallet_challenges (user_sub, challenge, expires_at)
      VALUES (${userSub}, ${challenge}, ${expiresAt})
      ON CONFLICT(user_sub)
      DO UPDATE SET challenge = EXCLUDED.challenge, expires_at = EXCLUDED.expires_at
    `;
    return;
  }

  getSqliteDb()
    .prepare(
      `
        INSERT INTO wallet_challenges (user_sub, challenge, expires_at)
        VALUES (?, ?, ?)
        ON CONFLICT(user_sub)
        DO UPDATE SET challenge = excluded.challenge, expires_at = excluded.expires_at
      `
    )
    .run(userSub, challenge, expiresAt);
}

export async function getWalletChallengeForUser(userSub: string): Promise<WalletChallenge | null> {
  await ensureReady();

  if (usePostgres) {
    const sql = getPostgresClient();
    const rows = (await sql`
      SELECT challenge, expires_at
      FROM wallet_challenges
      WHERE user_sub = ${userSub}
      LIMIT 1
    `) as Array<{ challenge: string; expires_at: string | number }>;

    const row = rows[0];
    if (!row) return null;

    return {
      challenge: row.challenge,
      expiresAt: Number(row.expires_at),
    };
  }

  const row = getSqliteDb()
    .prepare("SELECT challenge, expires_at FROM wallet_challenges WHERE user_sub = ?")
    .get(userSub) as { challenge: string; expires_at: number } | undefined;

  if (!row) return null;
  return {
    challenge: row.challenge,
    expiresAt: row.expires_at,
  };
}

export async function clearWalletChallengeForUser(userSub: string): Promise<void> {
  await ensureReady();

  if (usePostgres) {
    const sql = getPostgresClient();
    await sql`DELETE FROM wallet_challenges WHERE user_sub = ${userSub}`;
    return;
  }

  getSqliteDb().prepare("DELETE FROM wallet_challenges WHERE user_sub = ?").run(userSub);
}

export async function createWalletLinkAttemptForUser(
  userSub: string,
  challenge: string,
  expiresAt: number,
  returnTo?: string
): Promise<WalletLinkAttempt> {
  await ensureReady();

  const attemptId = crypto.randomUUID();

  if (usePostgres) {
    const sql = getPostgresClient();
    await sql`
      INSERT INTO wallet_link_attempts (attempt_id, user_sub, challenge, expires_at, used_at, return_to)
      VALUES (${attemptId}, ${userSub}, ${challenge}, ${expiresAt}, NULL, ${returnTo ?? null})
    `;
  } else {
    getSqliteDb()
      .prepare(
        `
          INSERT INTO wallet_link_attempts (attempt_id, user_sub, challenge, expires_at, used_at, return_to)
          VALUES (?, ?, ?, ?, NULL, ?)
        `
      )
      .run(attemptId, userSub, challenge, expiresAt, returnTo ?? null);
  }

  return {
    attemptId,
    userSub,
    challenge,
    expiresAt,
    returnTo,
  };
}

export async function getWalletLinkAttemptById(attemptId: string): Promise<WalletLinkAttempt | null> {
  await ensureReady();

  if (usePostgres) {
    const sql = getPostgresClient();
    const rows = (await sql`
      SELECT attempt_id, user_sub, challenge, expires_at, used_at, return_to
      FROM wallet_link_attempts
      WHERE attempt_id = ${attemptId}
      LIMIT 1
    `) as Array<{
      attempt_id: string;
      user_sub: string;
      challenge: string;
      expires_at: string | number;
      used_at: string | null;
      return_to: string | null;
    }>;

    const row = rows[0];
    if (!row) return null;

    return {
      attemptId: row.attempt_id,
      userSub: row.user_sub,
      challenge: row.challenge,
      expiresAt: Number(row.expires_at),
      usedAt: row.used_at ?? undefined,
      returnTo: row.return_to ?? undefined,
    };
  }

  const row = getSqliteDb()
    .prepare(
      `
        SELECT attempt_id, user_sub, challenge, expires_at, used_at, return_to
        FROM wallet_link_attempts
        WHERE attempt_id = ?
        LIMIT 1
      `
    )
    .get(attemptId) as
    | {
        attempt_id: string;
        user_sub: string;
        challenge: string;
        expires_at: number;
        used_at: string | null;
        return_to: string | null;
      }
    | undefined;

  if (!row) return null;

  return {
    attemptId: row.attempt_id,
    userSub: row.user_sub,
    challenge: row.challenge,
    expiresAt: row.expires_at,
    usedAt: row.used_at ?? undefined,
    returnTo: row.return_to ?? undefined,
  };
}

export async function markWalletLinkAttemptUsed(attemptId: string): Promise<boolean> {
  await ensureReady();

  const usedAt = new Date().toISOString();

  if (usePostgres) {
    const sql = getPostgresClient();
    const rows = (await sql`
      UPDATE wallet_link_attempts
      SET used_at = ${usedAt}
      WHERE attempt_id = ${attemptId} AND used_at IS NULL
      RETURNING attempt_id
    `) as Array<{ attempt_id: string }>;

    return rows.length > 0;
  }

  const result = getSqliteDb()
    .prepare(
      `
        UPDATE wallet_link_attempts
        SET used_at = ?
        WHERE attempt_id = ? AND used_at IS NULL
      `
    )
    .run(usedAt, attemptId);

  return result.changes > 0;
}

export async function addVerificationHistory(
  userSub: string,
  entry: Omit<VerificationHistoryEntry, "id" | "createdAt"> & { id?: string; createdAt?: string }
): Promise<void> {
  await ensureReady();

  const id = entry.id ?? crypto.randomUUID();
  const createdAt = entry.createdAt ?? new Date().toISOString();

  if (usePostgres) {
    const sql = getPostgresClient();
    await sql`
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
      ) VALUES (
        ${id},
        ${userSub},
        ${createdAt},
        ${entry.verified},
        ${entry.reasoning},
        ${entry.rewardSent},
        ${entry.signature ?? null},
        ${entry.rewardedWallet ?? null},
        ${entry.locationLat ?? null},
        ${entry.locationLng ?? null}
      )
    `;
    return;
  }

  getSqliteDb()
    .prepare(
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
    )
    .run(
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
  await ensureReady();

  if (usePostgres) {
    const sql = getPostgresClient();
    const rows = (await sql`
      SELECT
        id,
        created_at,
        verified,
        reasoning,
        reward_sent,
        signature,
        rewarded_wallet,
        location_lat,
        location_lng
      FROM verification_history
      WHERE user_sub = ${userSub}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `) as Array<{
      id: string;
      created_at: string;
      verified: boolean;
      reasoning: string;
      reward_sent: boolean;
      signature: string | null;
      rewarded_wallet: string | null;
      location_lat: number | null;
      location_lng: number | null;
    }>;

    return rows.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      verified: Boolean(row.verified),
      reasoning: row.reasoning,
      rewardSent: Boolean(row.reward_sent),
      signature: row.signature ?? undefined,
      rewardedWallet: row.rewarded_wallet ?? undefined,
      locationLat: row.location_lat ?? undefined,
      locationLng: row.location_lng ?? undefined,
    }));
  }

  const rows = getSqliteDb()
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
  await ensureReady();

  if (usePostgres) {
    const sql = getPostgresClient();
    const rows = (await sql`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN verified = TRUE THEN 1 ELSE 0 END) AS verified,
        SUM(CASE WHEN reward_sent = TRUE THEN 1 ELSE 0 END) AS rewards_sent
      FROM verification_history
      WHERE user_sub = ${userSub}
    `) as Array<{ total: string | number; verified: string | number | null; rewards_sent: string | number | null }>;

    const row = rows[0];
    return {
      total: Number(row?.total ?? 0),
      verified: Number(row?.verified ?? 0),
      rewardsSent: Number(row?.rewards_sent ?? 0),
    };
  }

  const row = getSqliteDb()
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
  await ensureReady();

  if (usePostgres) {
    const sql = getPostgresClient();
    const rows = (await sql`
      SELECT achievement_id, claimed_at, signature, bonus_sol
      FROM achievement_claims
      WHERE user_sub = ${userSub}
      ORDER BY claimed_at DESC
    `) as Array<{
      achievement_id: string;
      claimed_at: string;
      signature: string | null;
      bonus_sol: number;
    }>;

    return rows.map((row) => ({
      achievementId: row.achievement_id,
      claimedAt: row.claimed_at,
      signature: row.signature ?? undefined,
      bonusSol: Number(row.bonus_sol),
    }));
  }

  const rows = getSqliteDb()
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
  await ensureReady();

  if (usePostgres) {
    const sql = getPostgresClient();
    await sql`
      INSERT INTO achievement_claims (user_sub, achievement_id, claimed_at, signature, bonus_sol)
      VALUES (${userSub}, ${achievementId}, ${new Date().toISOString()}, ${signature ?? null}, ${bonusSol})
    `;
    return;
  }

  getSqliteDb()
    .prepare(
      `
        INSERT INTO achievement_claims (user_sub, achievement_id, claimed_at, signature, bonus_sol)
        VALUES (?, ?, ?, ?, ?)
      `
    )
    .run(userSub, achievementId, new Date().toISOString(), signature ?? null, bonusSol);
}

export async function reserveAchievementClaimForUser(
  userSub: string,
  achievementId: string,
  bonusSol: number
): Promise<boolean> {
  await ensureReady();

  if (usePostgres) {
    const sql = getPostgresClient();
    try {
      await sql`
        INSERT INTO achievement_claims (user_sub, achievement_id, claimed_at, signature, bonus_sol)
        VALUES (${userSub}, ${achievementId}, ${new Date().toISOString()}, NULL, ${bonusSol})
      `;
      return true;
    } catch (error) {
      if (getPgErrorCode(error) === "23505") {
        return false;
      }
      throw error;
    }
  }

  try {
    getSqliteDb().prepare(
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
  await ensureReady();

  if (usePostgres) {
    const sql = getPostgresClient();
    await sql`
      UPDATE achievement_claims
      SET signature = ${signature}
      WHERE user_sub = ${userSub} AND achievement_id = ${achievementId}
    `;
    return;
  }

  getSqliteDb()
    .prepare(
      `
        UPDATE achievement_claims
        SET signature = ?
        WHERE user_sub = ? AND achievement_id = ?
      `
    )
    .run(signature, userSub, achievementId);
}

export async function removeAchievementClaimForUser(
  userSub: string,
  achievementId: string
): Promise<void> {
  await ensureReady();

  if (usePostgres) {
    const sql = getPostgresClient();
    await sql`DELETE FROM achievement_claims WHERE user_sub = ${userSub} AND achievement_id = ${achievementId}`;
    return;
  }

  getSqliteDb().prepare("DELETE FROM achievement_claims WHERE user_sub = ? AND achievement_id = ?").run(
    userSub,
    achievementId
  );
}
