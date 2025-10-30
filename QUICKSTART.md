# Quick Start Guide - Driver Registration Flow

This guide helps you get started with the updated driver registration flow after the recent changes.

## What Changed?

The driver registration flow has been refactored to store license plate mappings on-chain instead of using a hardcoded API mapping. This fixes the "size undefined" error and enables a more robust, decentralized system.

### Key Updates:

1. **Smart Contract** (`satch/programs/satch/src/lib.rs`)
   - Added `license_plate` field to `DriverProfile`
   - Added `LicensePlateMapping` account type
   - Updated `register_driver` instruction to accept license plate

2. **Frontend** (`satch-fe/`)
   - New Company Portal (`/company`) for registering companies and managing drivers
   - Updated driver lookup API to query on-chain data
   - Added helper functions for PDA derivation

3. **Testing** (`satch/tests/satch.ts`)
   - Updated tests to include license plate parameter

## Quick Start

### Prerequisites

- Node.js 18+ and npm/pnpm
- Rust and Solana CLI tools (for contract deployment)
- A Solana wallet with devnet SOL

### 1. Deploy Smart Contract (if needed)

```bash
cd satch
anchor build
anchor deploy --provider.cluster devnet
```

Update the program ID in:
- `satch/programs/satch/src/lib.rs` (line 3)
- `satch/Anchor.toml` (lines 11-12)
- `satch-fe/lib/idl/satch.json` (line 2)

### 2. Start Frontend

```bash
cd satch-fe
npm install --legacy-peer-deps
npm run dev
```

Visit `http://localhost:3000`

### 3. Register Your Company

1. Navigate to `/company` or click "COMPANY PORTAL" on the home page
2. Connect your Solana wallet
3. Fill in your company name
4. Click "REGISTER COMPANY"

### 4. Add a Driver

1. After company registration, fill in the driver form:
   - **Driver Name**: e.g., "Raju Kumar"
   - **License Plate**: e.g., "KA-01-1234"
   - **Driver Wallet**: Solana public key of the driver
2. Click "ADD DRIVER"

### 5. Search for Driver

1. Go back to the home page (`/`)
2. Enter the license plate (e.g., "KA-01-1234")
3. Click "SEARCH"
4. View the driver's profile and reviews

## Architecture

```
User searches by license plate
    ↓
API /api/driver/[id]
    ↓
Query LicensePlateMapping PDA (on-chain)
    ↓
Get driver_pda from mapping
    ↓
Query DriverProfile PDA (on-chain)
    ↓
Return driver info to frontend
```

## PDA Seeds

- **Platform**: `["platform", authority_pubkey]`
- **Driver**: `["driver", driver_authority_pubkey]`
- **License Plate**: `["plate", license_plate_string]`
- **Review**: `["review", driver_pda, review_count]`

## Troubleshooting

### "Driver not found" error
- Ensure the license plate was registered correctly
- Check that the driver's account was created on-chain
- Verify you're using the correct RPC endpoint

### "Failed to fetch" in company portal
- Ensure your wallet is connected
- Check that you have devnet SOL for transaction fees
- Verify the program is deployed to the correct network

### Build errors
- Run `npm install --legacy-peer-deps` to handle peer dependency conflicts
- Ensure you're using Node.js 18+

## Next Steps

See [DRIVER_REGISTRATION.md](./DRIVER_REGISTRATION.md) for:
- Detailed architecture documentation
- Privy integration guide for easier driver onboarding
- Security considerations
- Future enhancement ideas

## Support

For issues or questions, please open an issue on the GitHub repository.
