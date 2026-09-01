import { NextResponse } from "next/server";
import { fetchAndCacheFinancialStatements } from "@/lib/financial-statements-db";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;
    const ticker = symbol?.toUpperCase().trim();

    if (!ticker) {
      return NextResponse.json({ error: "Missing symbol parameter" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") || "quarter").toLowerCase() as "quarter" | "annual";

    if (period !== "quarter" && period !== "annual") {
      return NextResponse.json({ error: "Invalid period. Must be 'quarter' or 'annual'" }, { status: 400 });
    }

    // Offline-First: Checks local SQLite first, fallbacks to online fetch + auto cache
    const data = await fetchAndCacheFinancialStatements(ticker, period);

    if (!data) {
      return NextResponse.json({
        symbol: ticker,
        period,
        fiscalDates: [],
        cdkt: [],
        kqkd: [],
        lctt: [],
      });
    }

    return NextResponse.json({
      symbol: ticker,
      period,
      ...data,
    });
  } catch (error) {
    console.error(`[api/financials] Error fetching financial statements:`, error);
    return NextResponse.json(
      { error: "Internal Server Error", detail: String(error) },
      { status: 500 }
    );
  }
}
