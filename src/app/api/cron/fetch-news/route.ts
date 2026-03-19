import { NextRequest, NextResponse } from "next/server";
import { runFetchPipeline } from "@/lib/fetchPipeline";

// GET endpoint for cron jobs (Vercel Cron, external cron services, etc.)
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");

  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runFetchPipeline();
    return NextResponse.json(result);
  } catch (err) {
    console.error("Cron fetch pipeline error:", err);
    return NextResponse.json(
      { error: "Pipeline failed", details: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
