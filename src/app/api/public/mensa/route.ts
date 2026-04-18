import { NextRequest, NextResponse } from "next/server";

import { getPublicMensaMenu } from "@/server/public-campus/mensa";

export async function GET(request: NextRequest) {
  const canteenId = request.nextUrl.searchParams.get("canteenId") ?? undefined;
  const referenceDate = request.nextUrl.searchParams.get("referenceDate");

  try {
    const data = await getPublicMensaMenu({
      canteenId,
      referenceDate: referenceDate ? new Date(referenceDate) : undefined,
    });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load the mensa menu.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
