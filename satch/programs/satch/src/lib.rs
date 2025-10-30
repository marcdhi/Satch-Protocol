use anchor_lang::prelude::*;

declare_id!("4D3Lfi2YVgFiqRaiN8SyBxJkob5cnbxHUo86xUtgqNoH");

#[program]
pub mod satch {
    use super::*;

    // Instruction 1: A platform (like Rapido) registers
    pub fn register_platform(ctx: Context<RegisterPlatform>, name: String) -> Result<()> {
        let platform = &mut ctx.accounts.platform_account;
        platform.authority = ctx.accounts.authority.key();
        platform.name = name;
        platform.verified = false; // You can verify them manually
        platform.driver_count = 0;
        msg!("Platform '{}' registered by {}", platform.name, platform.authority);
        Ok(())
    }

    // Instruction 2: A platform registers one of its drivers
    pub fn register_driver(ctx: Context<RegisterDriver>, name: String) -> Result<()> {
        // Update platform state
        let platform = &mut ctx.accounts.platform_account;
        platform.driver_count = platform.driver_count.checked_add(1).unwrap();

        // Update driver state
        let driver = &mut ctx.accounts.driver_account;
        driver.authority = ctx.accounts.driver_authority.key();
        driver.platform = platform.key();
        driver.name = name;
        driver.rating_sum = 0;
        driver.review_count = 0;
        
        msg!("Driver '{}' registered for platform {}", driver.name, platform.name);
        Ok(())
    }

    // Instruction 3: A user leaves a review for a driver
    // This is the core function
    pub fn leave_review(
        ctx: Context<LeaveReview>,
        rating: u8,
        message_hash: String,
    ) -> Result<()> {
        // 1. Validate the rating (1-5)
        require!(rating >= 1 && rating <= 5, SatchError::RatingOutOfRange);

        // 2. Update the driver's aggregate stats
        let driver = &mut ctx.accounts.driver_account;
        driver.rating_sum = driver.rating_sum.checked_add(rating as u64).unwrap();
        driver.review_count = driver.review_count.checked_add(1).unwrap();

        // 3. Create a new, separate account for this specific review
        // This is how you store "infinite" data. Each review is a new account.
        let review = &mut ctx.accounts.review_account;
        review.driver = driver.key();
        review.reviewer = ctx.accounts.reviewer.key();
        review.rating = rating;
        review.message_hash = message_hash; // This is the Arweave TX ID

        // 4. TODO: Burn the "Proof-of-Service" cNFT
        // For a hackathon, just having this instruction is the main part.
        // Burning the cNFT would happen here via a CPI (Cross-Program Invoke)
        // to the Metaplex Bubblegum program. This is complex, so for the hackathon
        // you can just focus on the review logic.
        
        msg!("Review left for driver {}", driver.key());
        Ok(())
    }
}

// === ACCOUNTS & STRUCTS ===
// This section defines what data is stored in each account.

// 1. The Platform Account (e.g., Rapido)
#[account]
pub struct Platform {
    pub authority: Pubkey, // The platform's wallet
    pub name: String,      // "Rapido"
    pub verified: bool,
    pub driver_count: u64,
}

// 2. The Driver's Profile (Permanent Record)
#[account]
pub struct DriverProfile {
    pub authority: Pubkey,   // The driver's wallet
    pub platform: Pubkey,    // Which platform they belong to
    pub name: String,
    pub rating_sum: u64,     // Sum of all ratings (e.g., 5 + 4 + 1)
    pub review_count: u64,   // Total number of reviews (e.g., 3)
}
// Average rating is calculated off-chain: rating_sum / review_count

// 3. The Individual Review Account
#[account]
pub struct Review {
    pub driver: Pubkey,       // The driver being reviewed
    pub reviewer: Pubkey,     // The user who left the review
    pub rating: u8,           // 1-5
    pub message_hash: String, // The Arweave TX ID of the complaint text
}

// === INSTRUCTION CONTEXTS ===
// This section defines what accounts are needed for each instruction.

#[derive(Accounts)]
pub struct RegisterPlatform<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 1 + 8, // 8(discriminator) + 32(auth) + 32(name) + 1(verified) + 8(count)
        seeds = [b"platform", authority.key().as_ref()],
        bump
    )]
    pub platform_account: Account<'info, Platform>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterDriver<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 32 + 8 + 8, // 8 + auth + platform + name + rating_sum + review_count
        seeds = [b"driver", driver_authority.key().as_ref()],
        bump
    )]
    pub driver_account: Account<'info, DriverProfile>,
    
    pub driver_authority: SystemAccount<'info>,

    #[account(
        mut,
        has_one = authority @ SatchError::InvalidPlatformAuthority
    )]
    pub platform_account: Account<'info, Platform>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(rating: u8, message_hash: String)]
pub struct LeaveReview<'info> {
    #[account(
        init,
        payer = reviewer,
        space = 8 + 32 + 32 + 1 + (4 + message_hash.len()), // 8 + driver + reviewer + rating + hash
        seeds = [b"review", driver_account.key().as_ref(), driver_account.review_count.to_le_bytes().as_ref()],
        bump
    )]
    pub review_account: Account<'info, Review>,

    #[account(mut)]
    pub driver_account: Account<'info, DriverProfile>,
    
    #[account(mut)]
    pub reviewer: Signer<'info>, // The user leaving the review (pays for it)
    
    pub system_program: Program<'info, System>,
}

// === ERRORS ===
#[error_code]
pub enum SatchError {
    #[msg("Rating must be between 1 and 5.")]
    RatingOutOfRange,
    #[msg("Invalid platform authority.")]
    InvalidPlatformAuthority,
}