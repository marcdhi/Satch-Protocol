# 🚘 Driver Registration Flow & Privy Integration

*(Updated for latest Privy React SDK + Solana RPC Config)*

---

## Overview

This document outlines the **driver registration flow** for the Satch protocol and details how to integrate **Privy** for seamless, secure onboarding using **social login + embedded Solana wallets**, now including **custom Solana network configuration**.

---

## Current Implementation

### Smart Contract Overview

The Satch protocol supports **on-chain license plate mapping**:

* **DriverProfile** – extended with `license_plate`
* **LicensePlateMapping** – maps license plates to driver PDAs
* **PDA Hierarchy**:

  * Platform PDA: `["platform", authority_pubkey]`
  * Driver PDA: `["driver", driver_authority_pubkey]`
  * License Plate PDA: `["plate", license_plate_string]`

---

## Frontend Overview

### Company Portal (`/company`)

* Companies register platform accounts
* Add drivers with name, license plate, wallet address
* View driver stats, verification status

### Driver Lookup (`/api/driver/[id]`)

* Fetches from on-chain LicensePlateMapping PDA
* Displays verified driver info

### Home Page

* Added link to Company Portal
* License plate search unchanged

---

## Privy Integration

[Privy](https://www.privy.io/) provides **wallet + auth in one SDK** — allowing drivers to log in via Google, Twitter, or email and auto-generate Solana wallets in the background.

### 🔥 Benefits

* **1-click onboarding** (no wallet setup)
* **Social login UX**
* **Embedded wallets** for new users
* **Recovery options** (no lost keys)
* **Web + mobile ready**

---

## Implementation Plan

### 1. Install SDK

```bash
pnpm install @privy-io/react-auth
```

---

### 2. Wrap App with `PrivyProvider`

In `app/providers.tsx`:

```tsx
'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { createSolanaRpc, createSolanaRpcSubscriptions } from '@privy-io/react-auth/solana';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      clientId={process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID!}
      config={{
        loginMethods: ['google', 'twitter', 'email'],
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
        appearance: {
          theme: 'light',
          accentColor: '#FDE047',
        },
        // ✅ Configure Solana RPCs for embedded wallets
        solana: {
          rpcs: {
            'solana:mainnet': {
              rpc: createSolanaRpc('https://api.mainnet-beta.solana.com'),
              rpcSubscriptions: createSolanaRpcSubscriptions('wss://api.mainnet-beta.solana.com'),
            },
            'solana:devnet': {
              rpc: createSolanaRpc('https://normals-solanad-6ba0.devnet.rpcpool.com/aeafc746-238d-4bea-af16-6b69e62a4eab'),
              rpcSubscriptions: createSolanaRpcSubscriptions('wss://normals-solanad-6ba0.devnet.rpcpool.com/aeafc746-238d-4bea-af16-6b69e62a4eab'),
            },
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
```

🧠 **Notes:**

* You no longer need a `PrivySolanaProvider`.
* `config.solana.rpcs` is **only required** for embedded wallets.
* If using external wallets (Phantom, Solflare, etc.), this config isn’t needed.

---

### 3. Wait for Privy Initialization

Before accessing state or wallets, ensure Privy is ready:

```tsx
import { usePrivy } from '@privy-io/react-auth';

export default function AppInit() {
  const { ready } = usePrivy();

  if (!ready) return <div>Loading...</div>;
  return <div>Privy is ready!</div>;
}
```

---

### 4. Update Company Portal Auth Flow

Replace `useWallet()` with Privy hooks:

```tsx
import { usePrivy, useWallets } from '@privy-io/react-auth';

export default function CompanyPortal() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();

  if (!ready) return <div>Loading Privy...</div>;
  if (!authenticated) return <button onClick={login}>Login with Privy</button>;

  const solanaWallet = wallets.find(w => w.walletClientType === 'privy');

  return (
    <div>
      Logged in as: {solanaWallet?.address}
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

---

### 5. Add Driver Self-Registration

`/app/register-driver/page.tsx`:

```tsx
'use client';

import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Connection, Transaction } from '@solana/web3.js';

export default function RegisterDriverPage() {
  const { login, authenticated } = usePrivy();
  const { wallets } = useWallets();

  if (!authenticated) return <button onClick={login}>Sign in to Register</button>;

  const wallet = wallets.find(w => w.walletClientType === 'privy');

  async function registerDriver() {
    const connection = new Connection('https://normals-solanad-6ba0.devnet.rpcpool.com/aeafc746-238d-4bea-af16-6b69e62a4eab');
    const tx = new Transaction();
    // ...build your transaction logic

    console.log(await wallet?.sendTransaction!(tx, connection));
  }

  return (
    <form onSubmit={registerDriver}>
      <input placeholder="Driver Name" />
      <input placeholder="License Plate" />
      <button type="submit">Register</button>
    </form>
  );
}
```

---

### 6. Environment Variables

Add in `.env.local`:

```
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
NEXT_PUBLIC_PRIVY_CLIENT_ID=your_privy_client_id
```

---

## Solana Configuration Summary

| Cluster | Type              | RPC                                                                                    | WebSocket                           |
| ------- | ----------------- | -------------------------------------------------------------------------------------- | ----------------------------------- |
| Mainnet | Default           | `https://api.mainnet-beta.solana.com`                                                  | `wss://api.mainnet-beta.solana.com` |
| Devnet  | Custom (Your RPC) | `https://normals-solanad-6ba0.devnet.rpcpool.com/aeafc746-238d-4bea-af16-6b69e62a4eab` | same URL prefixed with `wss://`     |

---

## Architecture Modes

| Mode                             | Description                           | Pros                   | Cons                  |
| -------------------------------- | ------------------------------------- | ---------------------- | --------------------- |
| **A. Company-managed**           | Companies add driver records manually | Controlled, verifiable | Slower onboarding     |
| **B. Self-registration (Privy)** | Drivers onboard directly via Privy    | Fast UX                | Needs moderation      |
| **C. Hybrid (✅ Recommended)**    | Both supported                        | Flexible, scalable     | Slightly more complex |

---

## Security Considerations

1. **Sybil Resistance** – Company or admin verification
2. **Wallet Ownership** – Drivers educated about key management
3. **License Verification** – Optional photo or ID proof

---

## Testing Locally

1. **Deploy Program**

   ```bash
   cd satch
   anchor build && anchor deploy
   ```
2. **Update Program ID** in `lib.rs`, `Anchor.toml`, and IDL
3. **Run Frontend**

   ```bash
   cd satch-fe
   npm i && npm run dev
   ```
4. **Test Flow**

   * `/company`: Company onboarding
   * `/register-driver`: Privy self-registration
   * Home search: Verify driver license plate

---

## Custom SVM (Optional)

Privy supports **custom Solana Virtual Machine (SVM)** networks.
You can send transactions directly to any SVM chain:

```tsx
import { Connection, Transaction } from '@solana/web3.js';

// Your custom SVM RPC
const connection = new Connection('https://normals-solanad-6ba0.devnet.rpcpool.com/aeafc746-238d-4bea-af16-6b69e62a4eab');
const tx = new Transaction();

// Send transaction via Privy wallet
console.log(await wallet.sendTransaction!(tx, connection));
```

---

## Future Enhancements

* Driver dashboard & analytics
* NFT badges & reputation
* Cross-company driver support
* Moderation dashboard
* Off-chain KYC integration

---

## References

* [Privy React SDK Docs](https://docs.privy.io/guide/react/setup)
* [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
* [Anchor Framework](https://www.anchor-lang.com/)
* [Solana SVM Overview](https://squads.so/blog/solana-svm-sealevel-virtual-machine)

---

