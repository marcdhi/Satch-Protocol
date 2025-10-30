"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@solana/kit';
import {toSolanaWalletConnectors} from "@privy-io/react-auth/solana";

export default function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID!;
  const clientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID!;

  return (
    <PrivyProvider
      appId={appId}
      clientId={clientId}
      config={{
        loginMethods: ["google", "twitter", "email"],
        embeddedWallets: {
          solana: {
            createOnLogin: "users-without-wallets",
          },
        },
        appearance: {
          theme: "dark",
          accentColor: "#FDE047",
        },
        solana: {
          rpcs: {
            'solana:devnet': {
              rpc: createSolanaRpc('https://api.devnet.solana.com'),
              rpcSubscriptions: createSolanaRpcSubscriptions('wss://api.devnet.solana.com'),
            },
          },
        },
        externalWallets: {
          solana: {connectors: toSolanaWalletConnectors()}
        }
      }}
    >
      {children}
    </PrivyProvider>
  );
}
