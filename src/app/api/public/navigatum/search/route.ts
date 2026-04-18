import { NextRequest, NextResponse } from "next/server";

import { searchPublicNavigatum } from "@/server/public-campus/navigatum";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 6);

  try {
    const data = await searchPublicNavigatum({ query, limit });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to search NavigaTUM.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
