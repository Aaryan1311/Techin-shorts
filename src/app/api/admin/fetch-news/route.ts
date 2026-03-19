import { NextRequest, NextResponse } from "next/server";
import { runFetchPipeline } from "@/lib/fetchPipeline";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { secret } = body;

  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runFetchPipeline();
    return NextResponse.json(result);
  } catch (err) {
    console.error("Fetch pipeline error:", err);
    return NextResponse.json(
      { error: "Pipeline failed", details: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
