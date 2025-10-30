"use client";

import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { AnchorProvider, BN, Program, Idl } from "@coral-xyz/anchor";
import type { Wallet } from "@coral-xyz/anchor";
import idl from "@/lib/idl/satch.json" assert { type: "json" };

// RPC endpoint: prefer provided "normals" RPC, fallback to devnet
const RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  "https://normals-solanad-6ba0.devnet.rpcpool.com/aeafc746-238d-4bea-af16-6b69e62a4eab";

export const PROGRAM_ID = new PublicKey(
  (idl as any).address || "4D3Lfi2YVgFiqRaiN8SyBxJkob5cnbxHUo86xUtgqNoH"
);

// Minimal, read-only wallet to satisfy AnchorProvider in the browser.
// For read ops this is fine; for writes the real wallet adapter must be used.
const readOnlyWallet = {
  publicKey: null,
  signTransaction: async (tx: any) => tx,
  signAllTransactions: async (txs: any[]) => txs,
} as any;

export function getConnection(): Connection {
  return new Connection(RPC_ENDPOINT, { commitment: "confirmed" });
}

export function getProvider(): AnchorProvider {
  const connection = getConnection();
  return new AnchorProvider(connection, readOnlyWallet, {
    preflightCommitment: "confirmed",
  });
}

export function getProgram<T = any>(): Program<T> {
  const provider = getProvider();
  return new Program(idl as Idl, PROGRAM_ID, provider) as unknown as Program<T>;
}
export function getProgramWithWallet<T = any>(wallet: Wallet): Program<T> {
  const connection = getConnection();
  const provider = new AnchorProvider(connection, wallet, { preflightCommitment: "confirmed" });
  return new Program(idl as Idl, PROGRAM_ID, provider) as unknown as Program<T>;
}

// PDA helpers
export function findDriverPda(driverAuthority: PublicKey | string): PublicKey {
  const driverAuthorityKey =
    typeof driverAuthority === "string" ? new PublicKey(driverAuthority) : driverAuthority;
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("driver"), driverAuthorityKey.toBuffer()],
    PROGRAM_ID
  );
  return pda;
}

export function findReviewPda(driverPda: PublicKey, index: number | BN): PublicKey {
  const indexBn = BN.isBN(index) ? index : new BN(index);
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("review"), driverPda.toBuffer(), indexBn.toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID
  );
  return pda;
}


