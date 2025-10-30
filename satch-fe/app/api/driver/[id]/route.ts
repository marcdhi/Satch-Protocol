import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { getProgram, findLicensePlatePda, findDriverPda } from "@/lib/solana-server";

// This API route now fetches driver information from the blockchain
// based on the license plate by querying the LicensePlateMapping PDA
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing driver id" }, { status: 400 });
  }

  try {
    // 1. Get the license plate mapping PDA
    const platePda = findLicensePlatePda(id);
    
    // 2. Fetch the mapping from on-chain
    const program = getProgram();
    const mapping = await (program.account as any).licensePlateMapping.fetch(platePda);
    
    if (!mapping) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    // 3. Get the driver PDA from the mapping
    const driverPda = mapping.driverPda as PublicKey;
    
    // 4. Fetch the driver profile to get the name
    const driverProfile = await (program.account as any).driverProfile.fetch(driverPda);
    
    // 5. Return the driver information
    return NextResponse.json(
      {
        driverPubkey: driverProfile.authority.toBase58(),
        driverName: driverProfile.name,
        licensePlate: driverProfile.licensePlate,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error fetching driver:", error);
    return NextResponse.json(
      { error: "Driver not found or blockchain error" },
      { status: 404 }
    );
  }
}


