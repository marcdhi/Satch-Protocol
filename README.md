<div align="center">
  <img src="https://github.com/user-attachments/assets/2c61d190-a31a-4204-8e67-b9b97b10013d" alt="Satch Logo" width="150">
</div>

# Satch: Permanent, Public Accountability

Satch is a decentralized, on-chain reputation system designed for service workers, built on the Solana blockchain. It provides a transparent and immutable platform for customers to leave reviews for service providers, starting with ride-sharing drivers. This project leverages the power of Web3 to create a trust layer for the real world.


## The Core Idea

In the modern service economy, reputation is everything. However, existing reputation systems are centralized, controlled by corporations, and often opaque. A driver's hard-earned 5-star rating on one platform doesn't carry over to another, and the rules governing that reputation can change at any time.

Satch solves this by putting reputation on-chain. It creates a permanent, public, and uncensorable record of service quality that is owned by the ecosystem, not a single company.

## How It Works: A B2B Approach

Satch is designed with a Business-to-Business (B2B) model in mind, creating a trusted ecosystem for ride-sharing companies and their drivers.

1.  **Company Registration:** A ride-sharing company (a "Platform") registers itself on the Satch program using its corporate Solana wallet.
2.  **Driver Onboarding:** The company uses its secure portal to register its drivers. For each driver, the company can generate a new, unique Solana wallet on the fly, and is responsible for securely transferring the credentials to the driver.
3.  **Public Driver Profiles:** Every registered driver gets a public, on-chain profile tied to their license plate.
4.  **Permanent Reviews:** Customers can look up a driver by their license plate and leave a review. This review—including a rating and a text message—is stored permanently on the Solana blockchain in an account tied to the driver's profile.

---

## Technical Architecture

Satch is built with a modern Web3 technology stack, separating on-chain logic from the user-facing application.

### On-Chain Program (The "Backend")

*   **Framework:** [Anchor](https://www.anchor-lang.com/)
*   **Language:** Rust
*   **Location:** `/satch` directory

The heart of the application is a Solana program written in Rust using the Anchor framework. It defines the core data structures and business logic:

*   **Accounts:**
    *   `Platform`: Stores information about a registered ride-sharing company.
    *   `DriverProfile`: The central on-chain profile for a driver, containing their name, license plate, and aggregate rating data.
    *   `Review`: An individual review account, containing the rating and the full review text.
    *   `LicensePlateMapping`: An account that maps a license plate string to a driver's PDA, allowing for easy lookups.
*   **Instructions:**
    *   `register_platform`: Allows a new company to join the network.
    *   `register_driver`: Allows a registered company to onboard a new driver.
    *   `leave_review`: Allows any user to leave a review for a driver.

### Frontend Application (The "UI")

*   **Framework:** [Next.js](https://nextjs.org/) (with App Router)
*   **Language:** TypeScript
*   **Location:** `/satch-fe` directory
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **Wallet Integration:** [Privy](https://www.privy.io/) for seamless email and social logins with embedded Solana wallets.

The frontend is a modern web application that provides a user-friendly interface for interacting with the on-chain program.

---

## Key Features

*   **Company Portal:** A secure dashboard for registered companies to manage their fleet.
    *   View company information and driver count.
    *   Register new drivers.
    *   Generate new Solana wallets for drivers on the fly.
    *   View a list of all registered drivers with their details and average ratings.
*   **Public Driver Pages:** Every driver has a unique page accessible via their license plate.
    *   Displays the driver's name and key statistics (average rating, total reviews).
    *   Shows a complete, chronological ledger of all reviews left by customers.
*   **Decentralized Reviews:** A simple and intuitive modal allows users to connect their wallet and submit a permanent review for a driver.
*   **Modern UX:** The application features a clean, retro-inspired UI with modern UX touches like toast notifications instead of disruptive alerts.

### Project Screenshots
*A collection of screenshots showcasing the application's user interface.*

| Company Portal                               | Driver Page                                |
| -------------------------------------------- | ------------------------------------------ |
| ![Company Portal](https://github.com/user-attachments/assets/60401aa3-89ad-4380-83c2-4921c34888ef) | ![Driver Page](https://github.com/user-attachments/assets/0ca8e5bf-91a8-4c2e-80d3-51ac3ec2406b) |

| Leave Review Modal                             | Home Page                             |
| ---------------------------------------------- | ------------------------------------------------ |
| ![Review Modal](https://github.com/user-attachments/assets/3807e5d4-fefd-4357-878c-e6a7a4c99a45)     | ![Home Page](https://github.com/user-attachments/assets/1c6498b6-f827-49ca-8902-fda01b824b81)     |

---

## Getting Started

Follow these instructions to set up and run the project locally for development and testing.

### Prerequisites

*   Node.js (v18 or later)
*   Yarn and PNPM (`npm install -g yarn pnpm`)
*   Rust and Cargo
*   Solana Tool Suite
*   Anchor Framework (`avm install latest`, `avm use latest`)

### 1. Setup the On-Chain Program

First, build and deploy the Solana program.

```bash
# Navigate to the program directory
cd satch

# Install Rust dependencies
anchor build

# Run local validator (in a separate terminal)
solana-test-validator

# Deploy the program to the local validator
anchor deploy
```

### 2. Setup the Frontend

Next, set up the Next.js frontend application.

```bash
# Navigate to the frontend directory
cd satch-fe

# Install dependencies
pnpm install

# Create a .env.local file in the satch-fe directory
# Copy the contents from .env.example and add your Privy App ID
cp .env.example .env.local

# Run the development server
pnpm dev
```

Your application should now be running at `http://localhost:3000`.

---

## Future Ideas

This project provides a strong foundation that can be expanded in many directions:

*   **Driver Self-Registration:** Pivot to a more open, decentralized model where independent drivers can register themselves. This would require new on-chain mechanisms for identity and trust.
*   **Dispute Resolution:** Implement a system for companies or drivers to challenge and resolve unfair or malicious reviews.
*   **Expanded Reputation:** Broaden the scope beyond ride-sharing to include other service professions like food delivery, freelance work, etc.
*   **DAO Governance:** Transition the platform to be governed by a Decentralized Autonomous Organization (DAO), where token holders can vote on the future of the protocol.
