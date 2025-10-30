import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { getConnection, PROGRAM_ID, findLicensePlatePda } from "@/lib/solana-server";
import { BorshCoder, Idl } from "@coral-xyz/anchor";
import idl from "@/lib/idl/satch.json" assert { type: "json" };

// This API route now fetches driver information from the blockchain
// based on the license plate by querying the LicensePlateMapping PDA
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing driver id" }, { status: 400 });
  }

  try {
    // 1. Normalize and derive PDA for the license plate mapping
    const normalizedId = id.trim().toUpperCase();
    const platePda = findLicensePlatePda(normalizedId);

    // 2. Fetch raw account data via RPC and decode with BorshCoder
    const connection = getConnection();
    const coder = new BorshCoder(idl as Idl);

    const plateInfo = await connection.getAccountInfo(platePda);
    if (!plateInfo || !plateInfo.data || !plateInfo.owner.equals(PROGRAM_ID)) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }
    const mapping: any = coder.accounts.decode("LicensePlateMapping", plateInfo.data);

    // 3. Read the driver profile via the driver PDA from mapping
    const driverPda = new PublicKey(mapping.driver_pda);
    const driverInfo = await connection.getAccountInfo(driverPda);
    if (!driverInfo || !driverInfo.data || !driverInfo.owner.equals(PROGRAM_ID)) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }
    const driverProfile: any = coder.accounts.decode("DriverProfile", driverInfo.data);

    // 4. Return essential fields
    return NextResponse.json(
      {
        driverPubkey: driverProfile.authority.toBase58?.() || String(driverProfile.authority),
        driverName: driverProfile.name,
        licensePlate: driverProfile.license_plate,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching driver:", error);
    return NextResponse.json(
      { error: "Driver not found or blockchain error", details: error?.message },
      { status: 404 }
    );
  }
}


