import "server-only";

import type { PublicTransitPayload } from "@/lib/public-campus-types";
import { fetchJson } from "./fetch-json";

const GARCHING_FORSCHUNGSZENTRUM = {
  name: "Garching, Forschungszentrum",
  place: "Garching (b München)",
  globalId: "de:09184:460",
  monitorUrl: "https://efa.mvv-muenchen.de/index.html?name_dm=de%3A09184%3A460",
} as const;

type MvgDepartureResponse = Array<{
  plannedDepartureTime: number;
  realtime: boolean;
  realtimeDepartureTime: number;
  transportType: string;
  label: string;
  destination: string;
  cancelled: boolean;
  platform?: number | string;
  platformChanged?: boolean;
  messages?: unknown[];
  infos?: unknown[];
  occupancy?: string;
}>;

export async function getGarchingForschungszentrumTransit(input?: {
  limit?: number;
}): Promise<PublicTransitPayload> {
  const limit = sanitizeLimit(input?.limit, 5, 12);
  const params = new URLSearchParams({
    globalId: GARCHING_FORSCHUNGSZENTRUM.globalId,
    limit: String(Math.max(limit * 2, 10)),
  });

  const departures = await fetchJson<MvgDepartureResponse>(
    `https://www.mvg.de/api/bgw-pt/v3/departures?${params.toString()}`,
    {
      revalidate: 20,
      headers: {
        referer: "https://www.mvg.de/meinhalt.html",
      },
    },
  );

  const nextSubwayDepartures = departures
    .filter((departure) => departure.transportType === "UBAHN" && departure.label === "U6")
    .slice(0, limit);

  return {
    source: "mvg-api",
    fetchedAt: new Date().toISOString(),
    station: GARCHING_FORSCHUNGSZENTRUM,
    line: {
      label: "U6",
      transportType: "UBAHN",
    },
    departures: nextSubwayDepartures.map((departure) => ({
      line: departure.label,
      transportType: departure.transportType,
      destination: departure.destination,
      plannedDepartureTime: new Date(departure.plannedDepartureTime).toISOString(),
      realtimeDepartureTime: new Date(departure.realtimeDepartureTime).toISOString(),
      realtime: departure.realtime,
      cancelled: departure.cancelled,
      platform:
        departure.platform === undefined || departure.platform === null
          ? null
          : String(departure.platform),
      platformChanged: departure.platformChanged ?? false,
      occupancy: departure.occupancy ?? null,
      messages: [...(departure.messages ?? []), ...(departure.infos ?? [])]
        .map(normalizeMessage)
        .filter(Boolean),
    })),
  };
}

function sanitizeLimit(value: number | undefined, fallback: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(Math.trunc(value), 1), max);
}

function normalizeMessage(message: unknown) {
  if (typeof message === "string") {
    return message;
  }

  if (
    message &&
    typeof message === "object" &&
    "message" in message &&
    typeof message.message === "string"
  ) {
    return message.message;
  }

  if (
    message &&
    typeof message === "object" &&
    "text" in message &&
    typeof message.text === "string"
  ) {
    return message.text;
  }

  return "";
}
