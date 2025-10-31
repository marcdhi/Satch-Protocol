"use client"

import Link from "next/link"
import { usePrivy } from "@privy-io/react-auth"
import { useWallets } from "@privy-io/react-auth/solana"
import { useState, useRef, useEffect } from "react"
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js"
import { toast } from "sonner"

export default function Header() {
  const { ready, authenticated, login, logout } = usePrivy()
  const { wallets } = useWallets();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [balance, setBalance] = useState<number | null>(null);
  
  console.log("[HEADER] All wallets:", wallets);
  console.log("[HEADER] Wallets length:", wallets.length);
  
  const selectedWallet = wallets[0];
  console.log("[HEADER] Selected wallet:", selectedWallet);
  
  const walletAddress = selectedWallet?.address;
  console.log("[HEADER] Wallet address:", walletAddress);

  const fetchBalance = async (address: string) => {
    try {
      const connection = new Connection(
        "https://normals-solanad-6ba0.devnet.rpcpool.com/aeafc746-238d-4bea-af16-6b69e62a4eab",
        "confirmed"
      );
      const publicKey = new PublicKey(address);
      const balanceInLamports = await connection.getBalance(publicKey);
      const balanceInSol = balanceInLamports / LAMPORTS_PER_SOL;
      setBalance(balanceInSol);
    } catch (error) {
      console.error("Failed to fetch balance:", error);
      setBalance(null);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      fetchBalance(walletAddress);
    }
  }, [walletAddress]);

  // Format wallet address for display (show first 4 and last 4 characters)
  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleAirdrop = async () => {
    setIsDropdownOpen(false);
    if (!walletAddress) {
      toast.error("Wallet not connected");
      return;
    }

    const airdropPromise = async () => {
      const connection = new Connection(
        "https://normals-solanad-6ba0.devnet.rpcpool.com/aeafc746-238d-4bea-af16-6b69e62a4eab",
        "confirmed"
      );
      const publicKey = new PublicKey(walletAddress);
      const signature = await connection.requestAirdrop(
        publicKey,
        2 * LAMPORTS_PER_SOL
      );
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        blockhash,
        lastValidBlockHeight,
        signature,
      });
      return signature;
    };

    toast.promise(airdropPromise(), {
      loading: "Requesting 2 SOL airdrop...",
      success: (signature) => {
        if (walletAddress) {
          fetchBalance(walletAddress);
        }
        return `Airdrop successful! Tx: ${signature.slice(
          0,
          4
        )}...${signature.slice(-4)}`;
      },
      error: "Airdrop failed. Please try again.",
    });
  };

  const handleCopyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      toast.success("Address copied to clipboard!");
      setIsDropdownOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
  };

  return (
    <header className="w-full max-w-7xl mx-auto flex justify-between items-center p-4">
      <div>
        <Link href="/">
          <h1 className="font-press-start text-2xl font-bold tracking-wider cursor-pointer">SATCH</h1>
        </Link>
        <p className="text-xs font-mono tracking-widest text-gray-700">PERMANENT, PUBLIC ACCOUNTABILITY</p>
      </div>
      <div className="flex items-center gap-4">
        <Link href="/company">
          <button className="bg-white text-black px-4 py-2 font-mono font-bold text-sm tracking-widest border-2 border-black hover:bg-gray-100 transition-colors">
            COMPANY PORTAL
          </button>
        </Link>
        {ready &&
          (authenticated ? (
            <div className="relative" ref={dropdownRef}>
              {walletAddress && (
                <>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="bg-gray-100 text-black px-4 py-2 font-mono text-sm border-2 border-black hover:bg-gray-200 transition-colors"
                  >
                    {formatAddress(walletAddress)} ▼
                  </button>
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border-2 border-black shadow-lg z-50">
                      {balance !== null && (
                        <div className="px-4 py-2 font-mono text-sm text-gray-700 border-b-2 border-black">
                          BALANCE: {balance.toFixed(2)} SOL
                        </div>
                      )}
                      <button
                        onClick={handleCopyAddress}
                        className="w-full text-left px-4 py-2 font-mono text-sm hover:bg-gray-100 transition-colors border-b-2 border-black"
                      >
                        COPY ADDRESS
                      </button>
                      <button
                        onClick={handleAirdrop}
                        className="w-full text-left px-4 py-2 font-mono text-sm hover:bg-gray-100 transition-colors border-b-2 border-black"
                      >
                        REQUEST AIRDROP
                      </button>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 font-mono text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        LOGOUT
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <button
              onClick={login}
              className="bg-yellow-300 text-black px-4 py-2 font-mono font-bold text-sm tracking-widest border-2 border-black hover:bg-yellow-400 transition-colors"
            >
              CONNECT WALLET
            </button>
          ))}
      </div>
    </header>
  )
}
