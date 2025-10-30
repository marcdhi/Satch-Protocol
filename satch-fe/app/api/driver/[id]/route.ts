import { NextResponse } from "next/server";

// Simple in-memory mapping from real-world IDs (e.g., license plates)
// to the on-chain driver authority public keys and display names.
// TODO: Replace with a real database and admin UI.
const DRIVER_DIRECTORY: Record<string, { driverPubkey: string; driverName: string }> = {
  // Example mapping using a placeholder public key from testing/demo
  // KA-01-1234 → Raju
  "KA-01-1234": {
    driverPubkey: "32aC89SmxFds1x5DjKNBjUtfUPKwEriNAQ4w13RGddtU",
    driverName: "Raju",
  },
  // Add more seed entries as needed for demos
  "DL-05-7788": {
    driverPubkey: "5xJ6k2Vn3eJmKqDoJzM2JYx5y7vF4m3v7F7s1kB7WQ2Z",
    driverName: "Suman",
  },
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing driver id" }, { status: 400 });
  }

  const record = DRIVER_DIRECTORY[id];
  if (!record) {
    return NextResponse.json({ error: "Driver not found" }, { status: 404 });
  }

  return NextResponse.json(record, { status: 200 });
}


