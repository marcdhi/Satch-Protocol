"use client";

import { useState, useEffect } from "react";
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth/solana';
import { useSignAndSendTransaction } from '@privy-io/react-auth/solana';
import { Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { findPlatformPda, findDriverPda, findLicensePlatePda, getConnection, PROGRAM_ID } from "@/lib/solana";
import { BorshCoder, Idl } from "@coral-xyz/anchor";
import idl from "@/lib/idl/satch.json" assert { type: "json" };
import { useRouter } from "next/navigation";
import Header from "@/components/header";
import bs58 from "bs58";
import { toast } from "sonner";

export default function CompanyPage() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  
  const selectedWallet = wallets[0];
  
  const router = useRouter();
  const [platform, setPlatform] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<any[]>([]);

  // Company registration state
  const [companyName, setCompanyName] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  // Driver registration state
  const [driverName, setDriverName] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [driverWallet, setDriverWallet] = useState("");
  const [isAddingDriver, setIsAddingDriver] = useState(false);
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);

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
          
          // Also fetch drivers for this platform
          const driverAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
            filters: [
              { dataSize: 8 + 32 + 32 + (4 + 32) + (4 + 32) + 8 + 8 }, // Size of DriverProfile
              { memcmp: { offset: 8 + 32, bytes: platformPda.toBase58() } } // Filter by platform pubkey
            ]
          });
          
          const decodedDrivers = driverAccounts.map(d => {
            try {
              return {
                publicKey: d.pubkey,
                ...coder.accounts.decode("DriverProfile", d.account.data)
              };
            } catch (e) {
              return null;
            }
          }).filter(Boolean);
          
          setDrivers(decodedDrivers);
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
      toast.error("Please connect your wallet");
      return;
    }
    const walletAddress = selectedWallet.address;

    try {
      setIsRegistering(true);
      const connection = getConnection();
      const coder = new BorshCoder(idl as Idl);
      const platformPda = findPlatformPda(new PublicKey(walletAddress));

      const instructionData = coder.instruction.encode("register_platform", { name: companyName });

      const walletPubkey = new PublicKey(walletAddress);

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: platformPda, isSigner: false, isWritable: true },
          { pubkey: walletPubkey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: instructionData,
      });

      const { blockhash } = await connection.getLatestBlockhash();
      const transaction = new Transaction({
        feePayer: walletPubkey,
        recentBlockhash: blockhash,
      }).add(ix);

      const { signature } = await signAndSendTransaction({
        transaction: transaction.serialize({ requireAllSignatures: false }),
        wallet: selectedWallet,
        chain: 'solana:devnet',
      });

      const txSig = bs58.encode(signature);

      toast.success("Company registered successfully!", {
        action: {
          label: "View Transaction",
          onClick: () => window.open(`https://solscan.io/tx/${txSig}?cluster=devnet`, "_blank"),
        },
      });
      
      // Reload page to show dashboard
      setTimeout(() => {
        window.location.reload();
      }, 1000);

      setCompanyName("");
    } catch (error: any) {
      console.error("Error registering company:", error);
      toast.error(error?.message || "Failed to register company");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleAddDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authenticated || !selectedWallet) {
      toast.error("Please connect your wallet");
      return;
    }
    const walletAddress = selectedWallet.address;

    if (!platform) {
      toast.error("Please register your company first");
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

      const instructionData = coder.instruction.encode("register_driver", { 
        name: driverName, 
        license_plate: licensePlate 
      });

      const walletPubkey = new PublicKey(walletAddress);

      const ix = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: driverPda, isSigner: false, isWritable: true },
          { pubkey: platePda, isSigner: false, isWritable: true },
          { pubkey: driverAuthority, isSigner: false, isWritable: false },
          { pubkey: platformPda, isSigner: false, isWritable: true },
          { pubkey: walletPubkey, isSigner: true, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: instructionData,
      });

      const { blockhash } = await connection.getLatestBlockhash();
      const transaction = new Transaction({
        feePayer: walletPubkey,
        recentBlockhash: blockhash,
      }).add(ix);

      const { signature } = await signAndSendTransaction({
        transaction: transaction.serialize({ requireAllSignatures: false }),
        wallet: selectedWallet,
        chain: 'solana:devnet',
      });

      const txSig = bs58.encode(signature);

      toast.success("Driver registered successfully!", {
        action: {
          label: "View Transaction",
          onClick: () => window.open(`https://solscan.io/tx/${txSig}?cluster=devnet`, "_blank"),
        },
      });
      
      // Reload page to show new driver in list
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
      // Clear form
      setDriverName("");
      setLicensePlate("");
      setDriverWallet("");
    } catch (error: any) {
      console.error("Error adding driver:", error);
      toast.error(error?.message || "Failed to add driver");
    } finally {
      setIsAddingDriver(false);
    }
  };

  const handleGenerateWallet = () => {
    const newDriver = Keypair.generate();
    setDriverWallet(newDriver.publicKey.toBase58());
    setGeneratedSecret(bs58.encode(newDriver.secretKey));
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
      {!authenticated ? (
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <p className="font-mono text-sm text-gray-600">
            Please connect your wallet to register your company and manage drivers.
          </p>
        </div>
      ) : !selectedWallet ? (
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <p className="font-mono text-sm text-gray-600">
            No Solana wallet found. Please create or connect a Solana wallet in your Privy account.
          </p>
        </div>
      ) : (
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

              {/* Driver List */}
              <div className="border-2 border-black p-6">
                <h2 className="font-mono text-sm font-bold tracking-widest mb-4">REGISTERED DRIVERS ({drivers.length})</h2>
                <div className="space-y-4">
                  {drivers.map((driver) => {
                    const toNum = (v: any): number => v?.toNumber ? v.toNumber() : typeof v === "bigint" ? Number(v) : Number(v ?? 0);
                    const avgRating = toNum(driver.reviewCount) > 0
                      ? (toNum(driver.ratingSum) / toNum(driver.reviewCount)).toFixed(2)
                      : "N/A";

                    return (
                      <div key={driver.publicKey.toBase58()} className="border-b-2 border-dashed border-black pb-4 last:border-b-0 last:pb-0">
                        <p className="font-mono text-xs">NAME: <span className="font-bold">{driver.name}</span></p>
                        <p className="font-mono text-xs">WALLET: <span className="font-bold">{driver.authority.toBase58()}</span></p>
                        <p className="font-mono text-xs">LICENSE: <span className="font-bold">{driver.licensePlate}</span></p>
                        <p className="font-mono text-xs">AVG RATING: <span className="font-bold">{avgRating}</span></p>
                      </div>
                    );
                  })}
                  {drivers.length === 0 && (
                    <p className="font-mono text-xs text-gray-600">No drivers registered yet.</p>
                  )}
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
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={driverWallet}
                        onChange={(e) => setDriverWallet(e.target.value)}
                        placeholder="Click Generate or paste address..."
                        className="w-full border-2 border-black px-4 py-2 font-mono text-sm focus:outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={handleGenerateWallet}
                        className="bg-gray-200 text-black px-4 py-2 font-mono font-bold text-sm tracking-widest border-2 border-black hover:bg-gray-300"
                      >
                        GENERATE
                      </button>
                    </div>
                    {generatedSecret && (
                      <div className="mt-4 p-4 bg-red-100 border-2 border-red-500">
                        <p className="font-mono text-xs text-red-700 font-bold mb-2">
                          ⚠️ IMPORTANT: Save this secret key and give it to the driver. It will not be shown again.
                        </p>
                        <input
                          type="text"
                          readOnly
                          value={generatedSecret}
                          className="w-full border-2 border-red-500 bg-white px-4 py-2 font-mono text-xs"
                        />
                         <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(generatedSecret);
                            toast.success("Secret key copied to clipboard!");
                          }}
                          className="w-full mt-2 bg-red-500 text-white px-4 py-2 font-mono font-bold text-xs tracking-widest border-2 border-black hover:bg-red-600"
                        >
                          COPY SECRET KEY
                        </button>
                      </div>
                    )}
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
    </main>
  );
}
