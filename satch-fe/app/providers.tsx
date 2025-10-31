"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import {
  createSolanaRpc,
  createSolanaRpcSubscriptions
} from "@solana/kit";
import { Toaster } from "sonner";

export default function Providers({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const clientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID;

  if (!appId || !clientId) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="font-mono text-sm text-red-500">
          Missing NEXT_PUBLIC_PRIVY_APP_ID or NEXT_PUBLIC_PRIVY_CLIENT_ID
          environment variable.
        </p>
      </div>
    );
  }

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
            'solana:mainnet': {
              rpc: createSolanaRpc('https://api.mainnet-beta.solana.com'),
              rpcSubscriptions: createSolanaRpcSubscriptions('wss://api.mainnet-beta.solana.com')
            },
            'solana:devnet': {
              rpc: createSolanaRpc('https://normals-solanad-6ba0.devnet.rpcpool.com/aeafc746-238d-4bea-af16-6b69e62a4eab'),
              rpcSubscriptions: createSolanaRpcSubscriptions('wss://normals-solanad-6ba0.devnet.rpcpool.com/aeafc746-238d-4bea-af16-6b69e62a4eab')
            }
          }
        }
      }}
    >
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'white',
            color: 'black',
            border: '2px solid black',
            fontFamily: 'monospace',
            fontSize: '14px',
            fontWeight: 'bold',
            letterSpacing: '0.05em',
          },
          className: 'font-mono',
        }}
      />
      {children}
    </PrivyProvider>
  );
}
