import { NextResponse } from "next/server";
import { getPeersComparisonData } from "@/lib/peers-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get("symbols") || "";
    const period = (searchParams.get("period") || "quarter").toLowerCase() as "quarter" | "annual";

    const symbols = symbolsParam
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean);

    if (symbols.length === 0) {
      return NextResponse.json({ error: "Missing 'symbols' query parameter" }, { status: 400 });
    }

    const data = await getPeersComparisonData(symbols, period);
    return NextResponse.json({
      period,
      count: data.length,
      peers: data,
    });
  } catch (error) {
    console.error("[api/peers] Error fetching peer data:", error);
    return NextResponse.json(
      { error: "Internal Server Error", detail: String(error) },
      { status: 500 }
    );
  }
}
