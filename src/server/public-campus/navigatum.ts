import "server-only";

import type {
  PublicNavigatumLocationPayload,
  PublicNavigatumRoutePayload,
  PublicNavigatumSearchPayload,
} from "@/lib/public-campus-types";
import { fetchJson } from "./fetch-json";

type NavigatumSearchResponse = {
  sections?: Array<{
    facet: string;
    estimatedTotalHits?: number;
    entries?: Array<{
      id: string;
      type: string;
      name: string;
      subtext?: string | null;
    }>;
  }>;
};

type NavigatumLocationResponse = {
  id: string;
  type: string;
  type_common_name?: string | null;
  name: string;
  parent_names?: string[];
  redirect_url?: string | null;
  coords?: {
    lat: number;
    lon: number;
  } | null;
  props?: {
    computed?: Array<{
      name: string;
      text: string;
    }>;
  };
};

export async function searchPublicNavigatum(input: {
  query: string;
  limit?: number;
}): Promise<PublicNavigatumSearchPayload> {
  const query = input.query.trim();

  if (!query) {
    throw new Error("A search query is required.");
  }

  const params = new URLSearchParams({
    q: query,
    limit_all: String(sanitizeLimit(input.limit, 6, 12)),
    pre_highlight: "",
    post_highlight: "",
  });
  const data = await fetchJson<NavigatumSearchResponse>(
    `https://nav.tum.de/api/search?${params.toString()}`,
    { revalidate: 60 * 5 },
  );

  return {
    source: "navigatum",
    fetchedAt: new Date().toISOString(),
    query,
    sections: (data.sections ?? []).map((section) => ({
      facet: section.facet,
      estimatedTotalHits: section.estimatedTotalHits ?? 0,
      entries: (section.entries ?? []).map((entry) => ({
        id: entry.id,
        type: entry.type,
        name: entry.name,
        subtext: entry.subtext ?? null,
      })),
    })),
  };
}

export async function getPublicNavigatumLocation(
  id: string,
): Promise<PublicNavigatumLocationPayload> {
  if (!id.trim()) {
    throw new Error("A location id is required.");
  }

  const data = await fetchJson<NavigatumLocationResponse>(
    `https://nav.tum.de/api/locations/${encodeURIComponent(id)}`,
    { revalidate: 60 * 30 },
  );
  const computed = data.props?.computed ?? [];

  return {
    source: "navigatum",
    fetchedAt: new Date().toISOString(),
    id: data.id,
    type: data.type,
    typeCommonName: data.type_common_name ?? null,
    name: data.name,
    parents: data.parent_names ?? [],
    address: findComputedValue(computed, "Adresse", "Address"),
    roomCount: findComputedValue(computed, "Anzahl Räume", "Number of rooms"),
    redirectUrl: data.redirect_url
      ? new URL(data.redirect_url, "https://nav.tum.de").toString()
      : null,
    coordinates:
      data.coords && typeof data.coords.lat === "number" && typeof data.coords.lon === "number"
        ? {
            lat: data.coords.lat,
            lon: data.coords.lon,
          }
        : null,
  };
}

export async function getPublicNavigatumRoute(input: {
  from: string;
  to: string;
  routeCosting?: string;
  time?: string | null;
  arriveBy?: boolean;
  lang?: "de" | "en";
}): Promise<PublicNavigatumRoutePayload> {
  if (!input.from.trim() || !input.to.trim()) {
    throw new Error("Both from and to are required.");
  }

  const params = new URLSearchParams({
    from: input.from,
    to: input.to,
  });

  if (input.routeCosting) {
    params.set("route_costing", input.routeCosting);
  }

  if (input.time) {
    params.set("time", input.time);
  }

  if (input.arriveBy) {
    params.set("arrive_by", "true");
  }

  if (input.lang) {
    params.set("lang", input.lang);
  }

  const result = await fetchJson<unknown>(`https://nav.tum.de/api/maps/route?${params.toString()}`, {
    revalidate: 60,
  });

  return {
    source: "navigatum",
    fetchedAt: new Date().toISOString(),
    from: input.from,
    to: input.to,
    routeCosting: input.routeCosting ?? "auto",
    result,
  };
}

function findComputedValue(
  entries: Array<{ name: string; text: string }>,
  ...candidates: string[]
) {
  const match = entries.find((entry) => candidates.includes(entry.name));
  return match?.text ?? null;
}

function sanitizeLimit(value: number | undefined, fallback: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(Math.trunc(value), 1), max);
}
