import "server-only";

import type { PublicTumRoom, PublicTumRoomsPayload } from "@/lib/public-campus-types";
import { fetchJson } from "./fetch-json";

const CAMPUS_NAMES: Record<number, string> = {
  1: "München Innenstadt",
  2: "Garching Forschungszentrum",
  3: "Freising Weihenstephan",
  4: "Straubing",
  5: "Heilbronn",
  10: "Garching Business-Campus Hochbrück",
  11: "München Olympiapark",
  12: "Starnberg",
};

type NatRoomHit = {
  room_id: number;
  room_code: string;
  room_short: string | null;
  description: string;
  nav_url: string | null;
  schedule_url: string | null;
  floor: string | null;
  seats: number | null;
  modified: string | null;
  purpose?: {
    purpose?: string;
  };
};

type NatRoomResponse = {
  total_count: number;
  hits: NatRoomHit[];
};

export async function getPublicTumRooms(input: {
  campusId?: number;
  limit?: number;
} = {}): Promise<PublicTumRoomsPayload> {
  const campusId = sanitizeCampusId(input.campusId);
  const limit = sanitizeLimit(input.limit, 4, 12);
  const url = new URL("https://api.srv.nat.tum.de/api/v1/rom");
  url.searchParams.set("campus_id", String(campusId));
  url.searchParams.set("teaching", "true");
  url.searchParams.set("corona_ready", "true");

  const data = await fetchJson<NatRoomResponse>(url.toString(), {
    revalidate: 60 * 30,
  });
  const rooms = [...data.hits]
    .sort((left, right) => (right.seats ?? 0) - (left.seats ?? 0))
    .slice(0, limit)
    .map(mapRoom);

  return {
    source: "tum-nat-api",
    fetchedAt: new Date().toISOString(),
    campusId,
    campusName: CAMPUS_NAMES[campusId] ?? `Campus ${campusId}`,
    totalCount: data.total_count,
    filters: {
      teaching: true,
      centrallyManaged: true,
    },
    rooms,
  };
}

function mapRoom(room: NatRoomHit): PublicTumRoom {
  return {
    roomId: room.room_id,
    code: room.room_code,
    shortName: room.room_short,
    description: room.description,
    purpose: room.purpose?.purpose ?? "Raum",
    seats: typeof room.seats === "number" ? room.seats : null,
    floor: room.floor,
    navUrl: room.nav_url,
    scheduleUrl: room.schedule_url,
    modified: room.modified,
  };
}

function sanitizeCampusId(value?: number) {
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : 2;
}

function sanitizeLimit(value: number | undefined, fallback: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(Math.trunc(value), 1), max);
}
