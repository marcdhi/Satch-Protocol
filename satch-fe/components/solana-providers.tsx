"use client"

import type { ReactNode } from "react"
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react"
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets"

const endpoint =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  "https://normals-solanad-6ba0.devnet.rpcpool.com/aeafc746-238d-4bea-af16-6b69e62a4eab"

export default function SolanaProviders({ children }: { children: ReactNode }) {
  const wallets = [new PhantomWalletAdapter()]
  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: "confirmed" }}>
      <WalletProvider wallets={wallets} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  )
}


