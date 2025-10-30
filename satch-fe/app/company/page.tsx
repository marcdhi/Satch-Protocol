"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { findPlatformPda, findDriverPda, findLicensePlatePda, getConnection, PROGRAM_ID } from "@/lib/solana";
import { BorshCoder, Idl } from "@coral-xyz/anchor";
import idl from "@/lib/idl/satch.json" assert { type: "json" };
import { useRouter } from "next/navigation";

export default function CompanyPage() {
  const wallet = useWallet();
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
      if (!wallet.publicKey) {
        setLoading(false);
        return;
      }

      try {
        const connection = getConnection();
        const coder = new BorshCoder(idl as Idl);
        const platformPda = findPlatformPda(wallet.publicKey);
        
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

    loadPlatform();
  }, [wallet.publicKey]);

  const handleRegisterCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet.publicKey || !wallet.signTransaction) {
      alert("Please connect your wallet");
      return;
    }

    try {
      setIsRegistering(true);
      const connection = getConnection();
      const coder = new BorshCoder(idl as Idl);
      const platformPda = findPlatformPda(wallet.publicKey);

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: platformPda, isSigner: false, isWritable: true },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: coder.instruction.encode("register_platform", { name: companyName }),
      });

      const tx = new Transaction().add(ix);
      tx.feePayer = wallet.publicKey;
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;

      let txSig: string;
      if (wallet.sendTransaction) {
        txSig = await wallet.sendTransaction(tx, connection);
      } else if (wallet.signTransaction) {
        const signed = await wallet.signTransaction(tx);
        txSig = await connection.sendRawTransaction(signed.serialize());
      } else {
        throw new Error("Wallet cannot sign or send transactions");
      }

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
    if (!wallet.publicKey || !wallet.signTransaction) {
      alert("Please connect your wallet");
      return;
    }

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
      const platformPda = findPlatformPda(wallet.publicKey);

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: driverPda, isSigner: false, isWritable: true },
          { pubkey: platePda, isSigner: false, isWritable: true },
          { pubkey: driverAuthority, isSigner: false, isWritable: false },
          { pubkey: platformPda, isSigner: false, isWritable: true },
          { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: coder.instruction.encode("register_driver", { 
          name: driverName, 
          license_plate: licensePlate 
        }),
      });

      const tx = new Transaction().add(ix);
      tx.feePayer = wallet.publicKey;
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;

      let txSig: string;
      if (wallet.sendTransaction) {
        txSig = await wallet.sendTransaction(tx, connection);
      } else if (wallet.signTransaction) {
        const signed = await wallet.signTransaction(tx);
        txSig = await connection.sendRawTransaction(signed.serialize());
      } else {
        throw new Error("Wallet cannot sign or send transactions");
      }

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

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="font-mono text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white text-black">
      {/* Header */}
      <div className="border-b-2 border-black">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="font-press-start text-2xl md:text-3xl font-bold">COMPANY PORTAL</h1>
            <button
              onClick={() => router.push("/")}
              className="border-2 border-black px-4 py-2 font-mono text-xs hover:bg-gray-100"
            >
              BACK TO HOME
            </button>
          </div>
          
          {wallet.connected ? (
            <div className="flex items-center justify-between">
              <div className="font-mono text-xs">
                Connected: <span className="font-bold">{wallet.publicKey?.toBase58()}</span>
              </div>
              <button
                onClick={() => wallet.disconnect()}
                className="border-2 border-black px-4 py-2 font-mono text-xs hover:bg-gray-100"
              >
                DISCONNECT
              </button>
            </div>
          ) : (
            <button
              onClick={() => wallet.connect()}
              className="w-full bg-yellow-300 text-black px-6 py-3 font-mono font-bold text-sm tracking-widest border-2 border-black hover:bg-yellow-400"
            >
              CONNECT WALLET
            </button>
          )}
        </div>
      </div>

      {wallet.connected && (
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

      {!wallet.connected && (
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <p className="font-mono text-sm text-gray-600">
            Please connect your wallet to register your company and manage drivers.
          </p>
        </div>
      )}
    </main>
  );
}
