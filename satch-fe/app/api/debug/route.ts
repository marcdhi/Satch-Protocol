import { NextResponse } from "next/server";
import { getConnection, PROGRAM_ID } from "@/lib/solana-server";
import { BorshCoder, Idl } from "@coral-xyz/anchor";
import idl from "@/lib/idl/satch.json" assert { type: "json" };
import { createHash } from "crypto";
import bs58 from "bs58";

function accountDiscriminator(name: string): Buffer {
  const hash = createHash("sha256").update(`account:${name}`).digest();
  return hash.subarray(0, 8);
}

export async function GET() {
  try {
    const connection = getConnection();
    const coder = new BorshCoder(idl as Idl);

    // 1) LicensePlateMapping accounts
    const plateDisc = accountDiscriminator("LicensePlateMapping");
    const plateAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [{ memcmp: { offset: 0, bytes: bs58.encode(plateDisc) } }],
    });
    const plates = plateAccounts.map((acc) => {
      try {
        const decoded: any = coder.accounts.decode("LicensePlateMapping", acc.account.data);
        return {
          pda: acc.pubkey.toBase58(),
          license_plate: decoded.license_plate,
          driver_pda: decoded.driver_pda.toBase58?.() || String(decoded.driver_pda),
        };
      } catch (e: any) {
        return {
          pda: acc.pubkey.toBase58(),
          decode_error: e?.message || String(e),
          data_len: acc.account.data.length,
          data_b64: acc.account.data.toString("base64"),
        };
      }
    });

    // 2) DriverProfile accounts
    const driverDisc = accountDiscriminator("DriverProfile");
    const driverAccounts = await connection.getProgramAccounts(PROGRAM_ID, {
      filters: [{ memcmp: { offset: 0, bytes: bs58.encode(driverDisc) } }],
    });
    const drivers = driverAccounts.map((acc) => {
      try {
        const decoded: any = coder.accounts.decode("DriverProfile", acc.account.data);
        return {
          pda: acc.pubkey.toBase58(),
          authority: decoded.authority.toBase58?.() || String(decoded.authority),
          platform: decoded.platform.toBase58?.() || String(decoded.platform),
          name: decoded.name,
          license_plate: decoded.license_plate,
          rating_sum: decoded.rating_sum?.toString?.() || String(decoded.rating_sum),
          review_count: decoded.review_count?.toString?.() || String(decoded.review_count),
        };
      } catch (e: any) {
        return {
          pda: acc.pubkey.toBase58(),
          decode_error: e?.message || String(e),
          data_len: acc.account.data.length,
          data_b64: acc.account.data.toString("base64"),
        };
      }
    });

    console.log("[DEBUG] LicensePlateMapping accounts (", plates.length, "):", plates);
    console.log("[DEBUG] DriverProfile accounts (", drivers.length, "):", drivers);

    return NextResponse.json({ plates, drivers }, { status: 200 });
  } catch (error: any) {
    console.error("[DEBUG] Error dumping accounts:", error);
    return NextResponse.json({ error: "Failed to dump accounts", details: error?.message }, { status: 500 });
  }
}


