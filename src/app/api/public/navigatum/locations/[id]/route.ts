import { NextResponse } from "next/server";

import { getPublicNavigatumLocation } from "@/server/public-campus/navigatum";

type Context = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;

  try {
    const data = await getPublicNavigatumLocation(id);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load the NavigaTUM location.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
