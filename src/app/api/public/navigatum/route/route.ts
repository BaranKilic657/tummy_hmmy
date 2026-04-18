import { NextRequest, NextResponse } from "next/server";

import { getPublicNavigatumRoute } from "@/server/public-campus/navigatum";

export async function GET(request: NextRequest) {
  const from = request.nextUrl.searchParams.get("from") ?? "";
  const to = request.nextUrl.searchParams.get("to") ?? "";
  const routeCosting = request.nextUrl.searchParams.get("routeCosting") ?? undefined;
  const time = request.nextUrl.searchParams.get("time");
  const arriveBy = request.nextUrl.searchParams.get("arriveBy") === "true";
  const langParam = request.nextUrl.searchParams.get("lang");
  const lang = langParam === "de" || langParam === "en" ? langParam : undefined;

  try {
    const data = await getPublicNavigatumRoute({
      from,
      to,
      routeCosting,
      time,
      arriveBy,
      lang,
    });
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load the NavigaTUM route.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
