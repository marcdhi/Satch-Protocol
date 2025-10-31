'use client';

import { useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { findDriverPda, findLicensePlatePda, findPlatformPda, getConnection, PROGRAM_ID } from '@/lib/solana';
import { BorshCoder, Idl } from '@coral-xyz/anchor';
import idl from '@/lib/idl/satch.json' assert { type: 'json' };
import Header from '@/components/header';

export default function RegisterDriverPage() {
  const { login, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const [name, setName] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const solanaWallets = wallets.filter(w => w.chainType === 'solana');
  const selectedWallet = solanaWallets.find(w => w.walletClientType === 'privy') || solanaWallets[0];

  async function registerDriver(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedWallet) return;
    setIsSubmitting(true);

    try {
      const connection = getConnection();
      const coder = new BorshCoder(idl as Idl);

      // This is a placeholder for the platform authority. 
      // In a real app, you'd fetch this from a user's profile or have them select it.
      // For this example, we'll use a hardcoded one, but this must be an actual platform authority
      const platformAuthority = new PublicKey("4D3Lfi2YVgFiqRaiN8SyBxJkob5cnbxHUo86xUtgqNoH"); // Replace with a real platform authority

      const driverAuthority = new PublicKey(selectedWallet.address);
      const driverPda = findDriverPda(driverAuthority);
      const platePda = findLicensePlatePda(licensePlate);
      const platformPda = findPlatformPda(platformAuthority);

      const ix = new TransactionInstruction({
          programId: PROGRAM_ID,
          keys: [
            { pubkey: driverPda, isSigner: false, isWritable: true },
            { pubkey: platePda, isSigner: false, isWritable: true },
            { pubkey: driverAuthority, isSigner: false, isWritable: false },
            { pubkey: platformPda, isSigner: false, isWritable: true },
            { pubkey: driverAuthority, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          data: coder.instruction.encode("register_driver", { 
            name: name, 
            license_plate: licensePlate 
          }),
      });

      const tx = new Transaction().add(ix);
      tx.feePayer = driverAuthority;
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      
      const signedTx = await selectedWallet.signTransaction(tx);
      const txSig = await connection.sendRawTransaction(signedTx.serialize());

      console.log('Transaction signature:', txSig);
      alert('Driver registered successfully! Transaction signature: ' + txSig);
    } catch (error) {
        console.error('Error registering driver:', error);
        alert('Error registering driver. See console for details.');
    } finally {
        setIsSubmitting(false);
    }
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Register as a Driver</h1>
        <button onClick={login} className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 px-4 rounded">
          Sign in to Register
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center">
      <Header />
      <div className="flex-grow flex flex-col items-center justify-center w-full max-w-xs">
        <h1 className="text-2xl font-bold mb-4">Register as a Driver</h1>
        <form onSubmit={registerDriver} className="flex flex-col gap-4 w-full">
          <input 
            placeholder="Driver Name" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            required 
            className="border-2 border-black p-2 rounded"
          />
          <input 
            placeholder="License Plate" 
            value={licensePlate}
            onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
            required
            className="border-2 border-black p-2 rounded"
          />
          <button 
            type="submit" 
            disabled={isSubmitting || !selectedWallet}
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 px-4 rounded disabled:bg-gray-400"
          >
            {isSubmitting ? 'Registering...' : 'Register'}
          </button>
        </form>
      </div>
    </div>
  );
}
