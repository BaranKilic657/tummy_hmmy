import { NextRequest, NextResponse } from "next/server";

import { getGarchingForschungszentrumTransit } from "@/server/public-campus/transit";

export async function GET(request: NextRequest) {
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 5);

  try {
    const data = await getGarchingForschungszentrumTransit({ limit });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load MVG departures.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
