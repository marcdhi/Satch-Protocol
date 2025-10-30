# Driver Registration Flow & Privy Integration

## Overview

This document describes the updated driver registration flow and considerations for integrating Privy for easier driver onboarding.

## Current Implementation

### Smart Contract Changes

The Satch protocol now includes on-chain license plate mapping:

1. **DriverProfile** - Extended with `license_plate` field
2. **LicensePlateMapping** - New account type that maps license plates to driver PDAs
3. **PDA Structure**:
   - Platform PDA: `["platform", authority_pubkey]`
   - Driver PDA: `["driver", driver_authority_pubkey]`
   - License Plate PDA: `["plate", license_plate_string]`

### Frontend Implementation

1. **Company Portal** (`/company`)
   - Companies can register their platform account
   - Companies can add drivers with:
     - Driver name
     - License plate number
     - Driver's Solana wallet address
   - View company statistics (driver count, verification status)

2. **Driver Lookup** (Updated `/api/driver/[id]`)
   - No longer uses hardcoded mappings
   - Queries on-chain LicensePlateMapping PDA
   - Returns driver information directly from blockchain

3. **Home Page** 
   - Added link to Company Portal
   - Search functionality remains unchanged

## Privy Integration Considerations

[Privy](https://www.privy.io/) is a wallet and authentication solution that can simplify driver onboarding by allowing users to sign in with familiar methods (Google, email, etc.) while automatically creating a Solana wallet.

### Benefits

1. **Easier Onboarding**
   - Drivers don't need to understand crypto wallets
   - Can sign in with Google, Twitter, email, etc.
   - Privy handles wallet creation in the background

2. **Better UX**
   - Familiar social login experience
   - No need to download browser extensions
   - Works on mobile devices

3. **Recovery Options**
   - Social recovery mechanisms
   - No risk of losing seed phrases

### Implementation Plan

#### 1. Install Privy SDK

```bash
npm install @privy-io/react-auth @privy-io/react-auth-solana
```

#### 2. Update `solana-providers.tsx`

Replace or wrap the existing wallet adapter with Privy:

```tsx
import { PrivyProvider } from '@privy-io/react-auth';
import { PrivySolanaProvider } from '@privy-io/react-auth-solana';

export default function SolanaProviders({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        loginMethods: ['google', 'twitter', 'email'],
        appearance: {
          theme: 'light',
          accentColor: '#FDE047', // yellow-300 to match your design
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      <PrivySolanaProvider>
        {children}
      </PrivySolanaProvider>
    </PrivyProvider>
  );
}
```

#### 3. Update Company Portal

Replace `useWallet()` with `usePrivy()` and `useWallets()`:

```tsx
import { usePrivy, useWallets } from '@privy-io/react-auth';

export default function CompanyPage() {
  const { login, logout, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const solanaWallet = wallets.find(wallet => wallet.walletClientType === 'privy');
  
  // Use solanaWallet.address for public key
  // Use solanaWallet.signTransaction for signing
}
```

#### 4. Driver Self-Registration Page

Create a new page at `/register-driver` that allows drivers to:

1. Sign in with Privy (creates wallet automatically)
2. Enter their license plate and name
3. Self-register (if allowed) or request company approval

```tsx
// /app/register-driver/page.tsx
export default function RegisterDriverPage() {
  const { login, authenticated } = usePrivy();
  const { wallets } = useWallets();
  
  // Form to collect driver info
  // Call register_driver instruction with their auto-created wallet
}
```

#### 5. Environment Variables

Add to `.env.local`:

```
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
```

### Architecture Considerations

#### Option A: Company-Managed (Current)
- Companies add drivers
- Companies provide driver wallet addresses
- Drivers sign in to claim their profile

**Pros**: Better control, verification
**Cons**: More friction, requires company onboarding

#### Option B: Self-Registration with Privy
- Drivers sign up directly with Privy
- Automatically creates wallet
- Companies verify/approve later

**Pros**: Easier onboarding, better UX
**Cons**: Requires moderation system

#### Option C: Hybrid (Recommended)
- Support both flows
- Companies can add drivers (B2B)
- Drivers can self-register (B2C)
- Add approval/verification system

### Migration Path

1. **Phase 1**: Keep current company-managed system
2. **Phase 2**: Add Privy for company logins
3. **Phase 3**: Add driver self-registration option
4. **Phase 4**: Add approval/verification workflow

### Security Considerations

1. **Sybil Resistance**: How to prevent fake driver registrations?
   - Require company verification
   - Add KYC requirements
   - Use on-chain reputation

2. **Wallet Control**: Drivers need to understand they control their reputation
   - Educational content
   - Warning dialogs
   - Recovery mechanisms

3. **License Plate Verification**: How to verify license plates are real?
   - Off-chain verification by companies
   - Government ID integration
   - Photo verification

## Testing Locally

### Prerequisites

1. Solana CLI tools installed
2. Local validator running or devnet access
3. Test SOL in wallets

### Test Flow

1. **Deploy Smart Contract**
   ```bash
   cd satch
   anchor build
   anchor deploy
   ```

2. **Update Program ID**
   Update the program ID in:
   - `satch/programs/satch/src/lib.rs`
   - `satch/Anchor.toml`
   - `satch-fe/lib/idl/satch.json`

3. **Start Frontend**
   ```bash
   cd satch-fe
   npm install --legacy-peer-deps
   npm run dev
   ```

4. **Test Company Registration**
   - Connect wallet at `/company`
   - Register company
   - Add driver with license plate

5. **Test Driver Lookup**
   - Go to home page
   - Search by license plate
   - Verify driver profile loads

## Future Enhancements

1. **Driver Dashboard**: Let drivers manage their own profiles
2. **Analytics**: Show driver performance over time
3. **Badges/NFTs**: Award drivers with achievement badges
4. **Dispute Resolution**: Allow drivers to respond to reviews
5. **Multi-Platform**: Allow drivers to work for multiple companies

## References

- [Privy Documentation](https://docs.privy.io/)
- [Privy Solana Guide](https://docs.privy.io/guide/react/wallets/solana)
- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
