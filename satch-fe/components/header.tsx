"use client"

import Link from "next/link"
import { usePrivy } from "@privy-io/react-auth"
import { useWallets } from "@privy-io/react-auth/solana"

export default function Header() {
  const { ready, authenticated, login, logout } = usePrivy()
  const { wallets } = useWallets();
  
  console.log("[HEADER] All wallets:", wallets);
  console.log("[HEADER] Wallets length:", wallets.length);
  
  const selectedWallet = wallets[0];
  console.log("[HEADER] Selected wallet:", selectedWallet);
  
  const walletAddress = selectedWallet?.address;
  console.log("[HEADER] Wallet address:", walletAddress);

  // Format wallet address for display (show first 4 and last 4 characters)
  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

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
            <div className="flex items-center gap-2">
              {walletAddress && (
                <div className="bg-gray-100 text-black px-4 py-2 font-mono text-sm border-2 border-black">
                  {formatAddress(walletAddress)}
                </div>
              )}
              <button
                onClick={logout}
                className="bg-red-500 text-white px-4 py-2 font-mono font-bold text-sm tracking-widest border-2 border-black hover:bg-red-600 transition-colors"
              >
                LOGOUT
              </button>
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
