// File: tests/satch.ts

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Satch } from "../target/types/satch"; // This is your program's type file
import { assert } from "chai";

describe("satch", () => {
  // --- Configure the client to use the devnet ---
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // This loads your program's interface
  const program = anchor.workspace.Satch as Program<Satch>;
  
  // This is the wallet that will be "signing" the test transactions
  const testWallet = provider.wallet as anchor.Wallet;

  // --- We set up some "fake" accounts for testing ---
  
  // This will be our "Driver"
  const driver = anchor.web3.Keypair.generate();

  // --- We define the PDA addresses we will use ---
  
  // PDA for the Platform
  const [platformPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("platform"), testWallet.publicKey.toBuffer()],
    program.programId
  );

  // PDA for the Driver
  const [driverPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("driver"), driver.publicKey.toBuffer()],
    program.programId
  );

  it("Registers a new platform!", async () => {
    console.log("Registering platform at:", platformPDA.toBase58());

    // Call the `registerPlatform` function on your deployed program
    try {
      const tx = await program.methods
        .registerPlatform("Rapido") // The name of the platform
        .accounts({
          platformAccount: platformPDA,
          authority: testWallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      console.log("Platform registration transaction signature", tx);

      // Now, let's fetch the account from the blockchain to prove it worked
      const account = await program.account.platform.fetch(platformPDA);

      // Check if the data was stored correctly
      assert.equal(account.name, "Rapido");
      assert.ok(account.authority.equals(testWallet.publicKey));
      console.log("✅ Platform 'Rapido' successfully registered!");
    } catch (e) {
      console.error("Failed to register platform:", e);
      assert.fail("Platform registration failed");
    }
  });

  it("Registers a new driver!", async () => {
    console.log("Registering driver at:", driverPDA.toBase58());
    console.log("Driver's wallet:", driver.publicKey.toBase58());

    const licensePlate = "KA-01-1234";
    
    // Calculate license plate mapping PDA
    const [platePDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("plate"), Buffer.from(licensePlate)],
      program.programId
    );

    try {
      // Call the `registerDriver` function
      const tx = await program.methods
        .registerDriver("Raju", licensePlate) // The driver's name and license plate
        .accounts({
          driverAccount: driverPDA,
          licensePlateMapping: platePDA,
          driverAuthority: driver.publicKey, // The driver's public key
          platformAccount: platformPDA,
          authority: testWallet.publicKey, // The platform's authority (you)
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      
      console.log("Driver registration transaction signature", tx);

      // Fetch the driver's account to check
      const account = await program.account.driverProfile.fetch(driverPDA);

      // Check if the data is correct
      assert.equal(account.name, "Raju");
      assert.equal(account.licensePlate, licensePlate);
      assert.ok(account.platform.equals(platformPDA));
      
      // Verify the license plate mapping
      const mapping = await program.account.licensePlateMapping.fetch(platePDA);
      assert.equal(mapping.licensePlate, licensePlate);
      assert.ok(mapping.driverPda.equals(driverPDA));
      
      console.log("✅ Driver 'Raju' successfully registered with license plate!");
    } catch (e) {
      console.error("Failed to register driver:", e);
      assert.fail("Driver registration failed");
    }
  });

  it("Leaves a review for the driver!", async () => {
    const rating = 1; // A 1-star rating
    const messageHash = "FAKE_ARWEAVE_HASH_12345"; // Test hash

    // We need to find the PDA for the *new* review account.
    // This depends on the *current* review_count of the driver.
    
    // 1. Fetch the driver account to get the *current* review_count
    let driverAccount = await program.account.driverProfile.fetch(driverPDA);
    let reviewCount = driverAccount.reviewCount.toNumber(); // e.g., 0
    
    console.log(`Current review count is: ${reviewCount}`);

    // 2. Calculate the PDA for the *new* review
    const [reviewPDA] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("review"),
        driverPDA.toBuffer(),
        new anchor.BN(reviewCount).toBuffer("le", 8), // Use the current count as seed
      ],
      program.programId
    );

    console.log("Submitting review at:", reviewPDA.toBase58());

    try {
      // 3. Call the leaveReview function
      const tx = await program.methods
        .leaveReview(rating, messageHash)
        .accounts({
          reviewAccount: reviewPDA,
          driverAccount: driverPDA,
          reviewer: testWallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      console.log("Review submission transaction signature", tx);

      // 4. Verify the data was stored correctly
      
      // Check the review account itself
      const review = await program.account.review.fetch(reviewPDA);
      assert.equal(review.rating, rating);
      assert.equal(review.messageHash, messageHash);
      assert.ok(review.reviewer.equals(testWallet.publicKey));
      console.log("✅ Review account created and data is correct!");

      // Check the driver's profile to see if it was updated
      driverAccount = await program.account.driverProfile.fetch(driverPDA);
      assert.equal(driverAccount.reviewCount.toNumber(), reviewCount + 1);
      assert.equal(driverAccount.ratingSum.toNumber(), rating);
      console.log("✅ Driver's profile successfully updated!");

    } catch (e) {
      console.error("Failed to leave review:", e);
      assert.fail("Review submission failed");
    }
  });
});