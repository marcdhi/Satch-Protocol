"use client";

import { useEffect, useMemo, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { getConnection, PROGRAM_ID, findDriverPda } from "@/lib/solana";
import { BorshCoder, Idl } from "@coral-xyz/anchor";
import idl from "@/lib/idl/satch.json" assert { type: "json" };
import LeaveReviewModal from "@/components/leave-review-modal";
import { useWallet } from "@solana/wallet-adapter-react";
import { useParams } from "next/navigation";

type DriverApiResponse = { driverPubkey: string; driverName: string };

export default function DriverPage() {
  const [apiData, setApiData] = useState<DriverApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [driverProfile, setDriverProfile] = useState<any | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const wallet = useWallet();

  const params = useParams<{ id: string }>();
  const plateId = params?.id;

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!plateId) return;
      try {
        setLoading(true);
        // 1) Lookup driver authority by plate id via middleware API
        const res = await fetch(`/api/driver/${encodeURIComponent(plateId)}`);
        if (!res.ok) throw new Error(`Driver not found (${res.status})`);
        const data = (await res.json()) as DriverApiResponse;
        if (cancelled) return;
        setApiData(data);

        // 2) Derive driver PDA
        const driverAuthority = new PublicKey(data.driverPubkey);
        const driverPda = findDriverPda(driverAuthority);

        // 3) Fetch on-chain driver profile via RPC + BorshCoder
        const connection = getConnection();
        const coder = new BorshCoder(idl as Idl);
        const driverInfo = await connection.getAccountInfo(driverPda);
        if (!driverInfo || !driverInfo.data || !driverInfo.owner.equals(PROGRAM_ID)) {
          throw new Error("Driver profile not found on-chain");
        }
        const profile: any = coder.accounts.decode("DriverProfile", driverInfo.data);
        if (cancelled) return;
        setDriverProfile(profile);

        // 4) Fetch reviews via memcmp filter on Review.driver (offset 8)
        const reviewAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
          filters: [{ memcmp: { offset: 8, bytes: driverPda.toBase58() } }],
        });
        const all = reviewAccounts.map((acc) => {
          try {
            const decoded: any = coder.accounts.decode("Review", acc.account.data);
            return { publicKey: acc.pubkey, account: decoded };
          } catch (e) {
            return { publicKey: acc.pubkey, decodeError: (e as any)?.message };
          }
        });
        if (cancelled) return;
        setReviews(
          all
            .filter((r: any) => r.account)
            .map((r: any) => ({ pubkey: r.publicKey, ...r.account, messageHash: r.account.message_hash }))
        );
      } catch (e: any) {
        if (!cancelled) setError(e.message || "Failed to load driver");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [plateId]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!apiData || !driverProfile) return <div className="p-6">No data</div>;

  const toNum = (v: any): number =>
    v?.toNumber ? v.toNumber() : typeof v === "bigint" ? Number(v) : Number(v ?? 0);

  const avg =
    toNum(driverProfile.review_count) > 0
      ? (toNum(driverProfile.rating_sum) / toNum(driverProfile.review_count)).toFixed(2)
      : "0.00";

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="border-b-2 border-black">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="font-press-start text-3xl md:text-4xl font-bold mb-2">
            {apiData.driverName}
          </h1>
          <p className="font-mono text-sm text-gray-700">
            DRIVER AUTHORITY: <span className="font-bold">{apiData.driverPubkey}</span>
          </p>
        </div>
      </div>

      <div className="border-b-2 border-black">
        <div className="max-w-4xl mx-auto px-4 py-8 grid grid-cols-3 gap-4">
          <div className="border-2 border-black p-6 text-center">
            <p className="font-mono text-xs text-gray-600 mb-2 tracking-widest">AVERAGE RATING</p>
            <p className="font-press-start text-2xl md:text-3xl mb-2">{avg}</p>
          </div>
          <div className="border-2 border-black p-6 text-center">
            <p className="font-mono text-xs text-gray-600 mb-2 tracking-widest">TOTAL REVIEWS</p>
            <p className="font-press-start text-2xl md:text-3xl">{toNum(driverProfile.review_count)}</p>
          </div>
          <div className="border-2 border-black p-6 text-center">
            <p className="font-mono text-xs text-gray-600 mb-2 tracking-widest">RATING SUM</p>
            <p className="font-press-start text-2xl md:text-3xl">{toNum(driverProfile.rating_sum)}</p>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-4 pb-8">
          <div className="flex items-center justify-between mb-4">
            {wallet.connected ? (
              <div className="font-mono text-xs">
                Connected: <span className="font-bold">{wallet.publicKey?.toBase58()}</span>
              </div>
            ) : (
              <div className="font-mono text-xs text-gray-600">Wallet not connected</div>
            )}
            <button
              onClick={() => (wallet.connected ? wallet.disconnect() : wallet.connect())}
              className="border-2 border-black px-4 py-2 font-mono text-xs hover:bg-gray-100"
            >
              {wallet.connected ? "DISCONNECT" : "CONNECT WALLET"}
            </button>
          </div>
          <button
            onClick={() => setShowReviewModal(true)}
            className="w-full bg-yellow-300 text-black px-8 py-4 font-mono font-bold text-sm tracking-widest border-2 border-black hover:bg-yellow-400 transition-colors"
          >
            LEAVE A REVIEW
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h2 className="font-mono text-sm font-bold tracking-widest mb-6 text-gray-700">
          REVIEW LEDGER ({reviews.length})
        </h2>
        <div className="space-y-4">
          {reviews.map((r: any, idx: number) => (
            <div key={r.pubkey.toBase58?.() || idx} className="border-2 border-black p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="text-yellow-500 text-lg">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</div>
              </div>
              <p className="text-black mb-4 leading-relaxed">
                Message Hash: {r.messageHash}
              </p>
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs text-gray-600">
                  BY: <span className="font-bold">{r.reviewer.toBase58?.() || String(r.reviewer)}</span>
                </p>
                <a
                  href={`https://arweave.net/${r.messageHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-black hover:opacity-70 transition-opacity border border-black px-3 py-1 font-mono text-xs"
                >
                  ARWEAVE
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showReviewModal && (
        <LeaveReviewModal
          onClose={() => setShowReviewModal(false)}
          driverName={apiData.driverName}
          driverPubkey={apiData.driverPubkey}
        />
      )}
    </main>
  );
}


