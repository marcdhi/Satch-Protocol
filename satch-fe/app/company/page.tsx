"use client";

import { useState, useEffect } from "react";
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { findPlatformPda, findDriverPda, findLicensePlatePda, getConnection, PROGRAM_ID } from "@/lib/solana";
import { BorshCoder, Idl } from "@coral-xyz/anchor";
import idl from "@/lib/idl/satch.json" assert { type: "json" };
import { useRouter } from "next/navigation";
import Header from "@/components/header";

export default function CompanyPage() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const solanaWallets = wallets.filter(w => w.chainType === 'solana');
  const selectedWallet = solanaWallets.find(w => w.walletClientType === 'privy') || solanaWallets[0];
  
  const router = useRouter();
  const [platform, setPlatform] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Company registration state
  const [companyName, setCompanyName] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  // Driver registration state
  const [driverName, setDriverName] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [driverWallet, setDriverWallet] = useState("");
  const [isAddingDriver, setIsAddingDriver] = useState(false);

  useEffect(() => {
    async function loadPlatform() {
      if (!authenticated || !selectedWallet) {
        setLoading(false);
        return;
      }
      const walletAddress = selectedWallet.address;
      
      try {
        const connection = getConnection();
        const coder = new BorshCoder(idl as Idl);
        const platformPda = findPlatformPda(new PublicKey(walletAddress));
        
        const platformInfo = await connection.getAccountInfo(platformPda);
        if (!platformInfo || !platformInfo.data || !platformInfo.owner.equals(PROGRAM_ID)) {
          setPlatform(null);
        } else {
          const platformData: any = coder.accounts.decode("Platform", platformInfo.data);
          setPlatform(platformData);
        }
      } catch (e) {
        // Platform not registered yet
        setPlatform(null);
      } finally {
        setLoading(false);
      }
    }

    if (ready) {
      loadPlatform();
    }
  }, [ready, authenticated, selectedWallet]);

  const handleRegisterCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authenticated || !selectedWallet) {
      alert("Please connect your wallet");
      return;
    }
    const walletAddress = selectedWallet.address;

    try {
      setIsRegistering(true);
      const connection = getConnection();
      const coder = new BorshCoder(idl as Idl);
      const platformPda = findPlatformPda(new PublicKey(walletAddress));

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: platformPda, isSigner: false, isWritable: true },
          { pubkey: new PublicKey(walletAddress), isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: coder.instruction.encode("register_platform", { name: companyName }),
      });

      const tx = new Transaction().add(ix);
      tx.feePayer = new PublicKey(walletAddress);
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;

      const signedTx = await selectedWallet.signTransaction(tx)
      const txSig = await connection.sendRawTransaction(signedTx.serialize());


      alert(`Company registered successfully! Transaction: ${txSig}`);
      
      // Reload platform data
      const platformInfo = await connection.getAccountInfo(platformPda);
      if (platformInfo && platformInfo.data && platformInfo.owner.equals(PROGRAM_ID)) {
        const platformData: any = coder.accounts.decode("Platform", platformInfo.data);
        setPlatform(platformData);
      }
      setCompanyName("");
    } catch (error: any) {
      console.error("Error registering company:", error);
      alert(error?.message || "Failed to register company");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authenticated || !selectedWallet) {
      alert("Please connect your wallet");
      return;
    }
    const walletAddress = selectedWallet.address;

    if (!platform) {
      alert("Please register your company first");
      return;
    }

    try {
      setIsAddingDriver(true);
      const connection = getConnection();
      const coder = new BorshCoder(idl as Idl);

      const driverAuthority = new PublicKey(driverWallet);
      const driverPda = findDriverPda(driverAuthority);
      const platePda = findLicensePlatePda(licensePlate);
      const platformPda = findPlatformPda(new PublicKey(walletAddress));

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: driverPda, isSigner: false, isWritable: true },
          { pubkey: platePda, isSigner: false, isWritable: true },
          { pubkey: driverAuthority, isSigner: false, isWritable: false },
          { pubkey: platformPda, isSigner: false, isWritable: true },
          { pubkey: new PublicKey(walletAddress), isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: coder.instruction.encode("register_driver", { 
          name: driverName, 
          license_plate: licensePlate 
        }),
      });

      const tx = new Transaction().add(ix);
      tx.feePayer = new PublicKey(walletAddress);
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;

      const signedTx = await selectedWallet.signTransaction(tx);
      const txSig = await connection.sendRawTransaction(signedTx.serialize());

      alert(`Driver registered successfully! Transaction: ${txSig}\nLicense Plate: ${licensePlate}`);
      
      // Reload platform data
      const platformInfo = await connection.getAccountInfo(platformPda);
      if (platformInfo && platformInfo.data && platformInfo.owner.equals(PROGRAM_ID)) {
        const platformData: any = coder.accounts.decode("Platform", platformInfo.data);
        setPlatform(platformData);
      }
      
      // Clear form
      setDriverName("");
      setLicensePlate("");
      setDriverWallet("");
    } catch (error: any) {
      console.error("Error adding driver:", error);
      alert(error?.message || "Failed to add driver");
    } finally {
      setIsAddingDriver(false);
    }
  };

  if (!ready || loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="font-mono text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white text-black">
      <Header />
      {authenticated && selectedWallet && (
        <div className="max-w-4xl mx-auto px-4 py-8">
          {!platform ? (
            // Company Registration Form
            <div className="border-2 border-black p-6">
              <h2 className="font-mono text-sm font-bold tracking-widest mb-4">REGISTER YOUR COMPANY</h2>
              <form onSubmit={handleRegisterCompany} className="space-y-4">
                <div>
                  <label className="font-mono text-xs block mb-2">COMPANY NAME</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g., Rapido"
                    className="w-full border-2 border-black px-4 py-2 font-mono text-sm focus:outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="w-full bg-yellow-300 text-black px-6 py-3 font-mono font-bold text-sm tracking-widest border-2 border-black hover:bg-yellow-400 disabled:opacity-50"
                >
                  {isRegistering ? "REGISTERING..." : "REGISTER COMPANY"}
                </button>
              </form>
            </div>
          ) : (
            // Company Dashboard
            <div className="space-y-6">
              {/* Company Info */}
              <div className="border-2 border-black p-6">
                <h2 className="font-mono text-sm font-bold tracking-widest mb-4">COMPANY INFORMATION</h2>
                <div className="space-y-2">
                  <p className="font-mono text-xs">
                    NAME: <span className="font-bold">{platform.name}</span>
                  </p>
                  <p className="font-mono text-xs">
                    VERIFIED: <span className="font-bold">{platform.verified ? "YES" : "NO"}</span>
                  </p>
                  <p className="font-mono text-xs">
                    DRIVER COUNT: <span className="font-bold">{platform.driver_count?.toString() || "0"}</span>
                  </p>
                </div>
              </div>

              {/* Add Driver Form */}
              <div className="border-2 border-black p-6">
                <h2 className="font-mono text-sm font-bold tracking-widest mb-4">ADD NEW DRIVER</h2>
                <form onSubmit={handleAddDriver} className="space-y-4">
                  <div>
                    <label className="font-mono text-xs block mb-2">DRIVER NAME</label>
                    <input
                      type="text"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      placeholder="e.g., Raju Kumar"
                      className="w-full border-2 border-black px-4 py-2 font-mono text-sm focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-mono text-xs block mb-2">LICENSE PLATE</label>
                    <input
                      type="text"
                      value={licensePlate}
                      onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                      placeholder="e.g., KA-01-1234"
                      className="w-full border-2 border-black px-4 py-2 font-mono text-sm focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="font-mono text-xs block mb-2">DRIVER WALLET ADDRESS</label>
                    <input
                      type="text"
                      value={driverWallet}
                      onChange={(e) => setDriverWallet(e.target.value)}
                      placeholder="e.g., 5xJ6k2Vn3eJmKq..."
                      className="w-full border-2 border-black px-4 py-2 font-mono text-sm focus:outline-none"
                      required
                    />
                    <p className="font-mono text-xs text-gray-600 mt-1">
                      This will be the driver's Solana wallet address
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={isAddingDriver}
                    className="w-full bg-yellow-300 text-black px-6 py-3 font-mono font-bold text-sm tracking-widest border-2 border-black hover:bg-yellow-400 disabled:opacity-50"
                  >
                    {isAddingDriver ? "ADDING DRIVER..." : "ADD DRIVER"}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {!authenticated && (
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <p className="font-mono text-sm text-gray-600">
            Please connect your wallet to register your company and manage drivers.
          </p>
        </div>
      )}
    </main>
  );
}
