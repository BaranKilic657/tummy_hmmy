import { NextRequest, NextResponse } from "next/server";

import { getPublicTumRooms } from "@/server/public-campus/tum-nat";

export async function GET(request: NextRequest) {
  const campusId = Number(request.nextUrl.searchParams.get("campusId") ?? 2);
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 4);

  try {
    const data = await getPublicTumRooms({ campusId, limit });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load public TUM room data.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
