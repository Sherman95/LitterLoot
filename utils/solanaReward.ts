import {
  clusterApiUrl,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";

const REWARD_SOL_AMOUNT = 0.01;

export async function sendCleanupReward(recipientWallet: string): Promise<string> {
  return sendSolReward(recipientWallet, REWARD_SOL_AMOUNT);
}

export async function sendSolReward(recipientWallet: string, amountInSol: number): Promise<string> {
  if (!Number.isFinite(amountInSol) || amountInSol <= 0) {
    throw new Error("Reward amount must be greater than 0 SOL.");
  }

  const secret = process.env.SOLANA_REWARD_SECRET_KEY;

  if (!secret) {
    throw new Error("Missing SOLANA_REWARD_SECRET_KEY in environment.");
  }

  const fromWallet = Keypair.fromSecretKey(parseRewardSecretKey(secret));
  const toWallet = new PublicKey(recipientWallet);
  const rpcUrl = process.env.SOLANA_RPC_URL ?? clusterApiUrl("devnet");
  const connection = new Connection(rpcUrl, "confirmed");

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: fromWallet.publicKey,
      toPubkey: toWallet,
      lamports: Math.round(amountInSol * LAMPORTS_PER_SOL),
    })
  );

  const signature = await sendAndConfirmTransaction(connection, transaction, [fromWallet]);
  return signature;
}

function parseRewardSecretKey(secret: string): Uint8Array {
  let parsed: unknown;

  try {
    parsed = JSON.parse(secret);
  } catch {
    throw new Error("SOLANA_REWARD_SECRET_KEY must be a valid JSON array of 64 numbers.");
  }

  if (!Array.isArray(parsed) || parsed.length !== 64) {
    throw new Error("SOLANA_REWARD_SECRET_KEY must contain exactly 64 entries.");
  }

  const isValid = parsed.every(
    (value) => typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 255
  );

  if (!isValid) {
    throw new Error("SOLANA_REWARD_SECRET_KEY includes invalid values; expected integers between 0 and 255.");
  }

  return Uint8Array.from(parsed);
}
