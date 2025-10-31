"use client";

import type React from "react";
import { useState } from "react";
import { X } from "lucide-react";
import { useWallets, useSignAndSendTransaction } from "@privy-io/react-auth/solana";
import {
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { BN, BorshCoder, Idl } from "@coral-xyz/anchor";
import { getProgramWithWallet, findDriverPda, findReviewPda, getConnection, PROGRAM_ID } from "@/lib/solana";
import idl from "@/lib/idl/satch.json" assert { type: "json" };
import bs58 from "bs58";
import { toast } from "sonner";
// Remove @solana/kit imports as they are replaced by @solana/web3.js
/*
import {
  pipe,
  createTransactionMessage,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  compileTransaction,
  address,
  getTransactionEncoder,
  createSolanaRpc
} from "@solana/kit";
*/

interface LeaveReviewModalProps {
  onClose: () => void;
  driverName: string;
  driverPubkey?: string;
}

export default function LeaveReviewModal({ onClose, driverName, driverPubkey }: LeaveReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAirdropping, setIsAirdropping] = useState(false);
  const { wallets } = useWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();

  // Get the Solana wallet
  const selectedWallet = wallets[0];
  const walletAddress = selectedWallet?.address;

  const handleAirdrop = async () => {
    if (!walletAddress) {
      toast.error("Please connect your wallet first.");
      return;
    }
    try {
      setIsAirdropping(true);
      const connection = getConnection();
      const walletPubkey = new PublicKey(walletAddress);
      const signature = await connection.requestAirdrop(walletPubkey, 1 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(signature, "confirmed");
      toast.success("Airdrop of 1 DEVNET SOL successful!");
    } catch (err) {
      console.error("Airdrop failed", err);
      toast.error("Airdrop failed. The devnet faucet may be busy.");
    } finally {
      setIsAirdropping(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0 || !reviewText.trim()) {
      toast.error("Please select a rating and write a review");
      return;
    }
    if (!walletAddress) {
      toast.error("Connect your Solana wallet to submit a review");
      return;
    }
    if (!driverPubkey) {
      toast.error("Missing driver key; please navigate via the driver's page");
      return;
    }

    try {
      setIsSubmitting(true);

      console.log("[REVIEW] Start submit", { rating, reviewTextLen: reviewText.length, driverPubkey });

      // 1) Derive driver PDA
      const driverAuthority = new PublicKey(driverPubkey);
      const driverPda = findDriverPda(driverAuthority);
      console.log("[REVIEW] driverPda", driverPda.toBase58());

      // 2) Fetch driver account to get current review_count
      const connection = getConnection();
      const coder = new BorshCoder(idl as Idl);
      const driverInfo = await connection.getAccountInfo(driverPda);
      if (!driverInfo || !driverInfo.data || !driverInfo.owner.equals(PROGRAM_ID)) {
        throw new Error("Driver profile not found on-chain for review");
      }
      const driverAccount: any = coder.accounts.decode("DriverProfile", driverInfo.data);
      const currentCount: number = driverAccount.review_count?.toNumber?.() ?? Number(driverAccount.review_count ?? 0);
      console.log("[REVIEW] currentCount", currentCount);

      // 3) Derive new review PDA
      const reviewPda = findReviewPda(driverPda, new BN(currentCount));
      console.log("[REVIEW] reviewPda", reviewPda.toBase58());

      // 4) Build the instruction
      const instructionData = coder.instruction.encode("leave_review", {
        rating,
        message: reviewText,
      });

      const walletPubkey = new PublicKey(walletAddress);

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: reviewPda, isSigner: false, isWritable: true },
          { pubkey: driverPda, isSigner: false, isWritable: true },
          { pubkey: walletPubkey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: instructionData,
      });

      console.log("[REVIEW] building tx with @solana/web3.js...");

      const { blockhash } = await connection.getLatestBlockhash();
      const transaction = new Transaction({
        feePayer: walletPubkey,
        recentBlockhash: blockhash,
      }).add(ix);

      console.log("[REVIEW] signing and sending transaction...");

      const { signature } = await signAndSendTransaction({
        transaction: transaction.serialize({ requireAllSignatures: false }),
        wallet: selectedWallet,
        chain: 'solana:devnet',
      });

      const txSig = bs58.encode(signature);

      console.log("[REVIEW] tx success", txSig);
      toast.success("Review submitted successfully!", {
        action: {
          label: "View Transaction",
          onClick: () => window.open(`https://solscan.io/tx/${txSig}?cluster=devnet`, "_blank"),
        },
      });
      onClose();
      
      // Reload page to show new review
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (err: any) {
      console.error("[REVIEW] error", err);
      toast.error(err?.message || "Failed to submit review");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white border-4 border-black max-w-2xl w-full">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-black p-6">
          <h2 className="font-press-start text-xl md:text-2xl">SUBMIT REVIEW</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 transition-colors border border-black">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Warning */}
          <div className="bg-yellow-100 border-2 border-black p-4">
            <p className="font-mono text-xs text-black">
              ⚠️ THIS ACTION IS PERMANENT AND WILL BE RECORDED ON THE BLOCKCHAIN.
            </p>
          </div>

          {/* Rating Selector */}
          <div>
            <label className="font-mono text-sm font-bold tracking-widest block mb-4">SELECT RATING (1-5 STARS)</label>
            <div className="flex gap-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`text-3xl transition-all ${
                    star <= rating ? "text-yellow-400 scale-110" : "text-gray-300 hover:text-yellow-200"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
            {rating > 0 && <p className="font-mono text-xs text-gray-600 mt-2">RATING: {rating} / 5</p>}
          </div>

          {/* Review Text */}
          <div>
            <label className="font-mono text-sm font-bold tracking-widest block mb-2">YOUR REVIEW</label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Describe your experience with this driver..."
              className="w-full border-2 border-black p-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 min-h-32 resize-none"
            />
            <p className="font-mono text-xs text-gray-600 mt-2">
              {reviewText.length} / 500 characters
            </p>
          </div>

          {/* Airdrop */}
          <div className="border-t-2 border-dashed border-black pt-4">
            <p className="font-mono text-xs text-gray-600 mb-2 text-center">
              First time on Devnet? Get some free SOL to pay for transaction fees.
            </p>
            <button
              type="button"
              onClick={handleAirdrop}
              disabled={isAirdropping || !walletAddress}
              className="w-full bg-gray-200 text-black px-8 py-3 font-mono font-bold text-sm tracking-widest border-2 border-black hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isAirdropping ? "AIRDROPPING..." : "AIRDROP 1 DEVNET SOL"}
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || rating === 0 || !reviewText.trim()}
            className="w-full bg-yellow-300 text-black px-8 py-4 font-mono font-bold text-sm tracking-widest border-2 border-black hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "SUBMITTING..." : "SUBMIT & BURN PROOF-OF-SERVICE"}
          </button>
        </form>
      </div>
    </div>
  );
}
