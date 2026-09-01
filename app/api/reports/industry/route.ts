import { NextResponse } from "next/server";
import industryReportsSnapshot from "../../../../data/industry-reports.json";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sector = searchParams.get("sector")?.trim();
    const search = searchParams.get("search")?.trim().toLowerCase();
    const source = searchParams.get("source")?.trim().toUpperCase();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)));

    let filtered = industryReportsSnapshot.reports || [];

    if (sector && sector !== "all" && sector !== "Tất cả ngành") {
      filtered = filtered.filter(
        (r) => r.sectorName.toLowerCase() === sector.toLowerCase()
      );
    }

    if (source && source !== "ALL") {
      filtered = filtered.filter(
        (r) => r.source.toUpperCase() === source
      );
    }

    if (search) {
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(search) ||
          r.description.toLowerCase().includes(search) ||
          r.sectorName.toLowerCase().includes(search)
      );
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const startIndex = (page - 1) * pageSize;
    const paginatedReports = filtered.slice(startIndex, startIndex + pageSize);

    return NextResponse.json({
      updatedAt: industryReportsSnapshot.updatedAt,
      total,
      page,
      pageSize,
      totalPages,
      availableSectors: industryReportsSnapshot.availableSectors || [],
      reports: paginatedReports,
    });
  } catch (error) {
    console.error("[api/reports/industry] Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", detail: String(error) },
      { status: 500 }
    );
  }
}