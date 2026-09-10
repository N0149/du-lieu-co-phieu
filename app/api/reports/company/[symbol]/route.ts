import { NextResponse } from "next/server";
import { fetchAndCacheCompanyReports } from "@/lib/company-reports-service";

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

    const reports = await fetchAndCacheCompanyReports(ticker);

    return NextResponse.json(
      {
        symbol: ticker,
        total: reports.length,
        reports,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    console.error(`[api/reports/company] Error querying reports for symbol:`, error);
    return NextResponse.json(
      { error: "Internal Server Error", detail: String(error) },
      { status: 500 }
    );
  }
}
