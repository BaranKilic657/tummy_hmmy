export type PublicMensaDish = {
  name: string;
  category: string;
  labels: string[];
  studentPrice: string | null;
  staffPrice: string | null;
  guestPrice: string | null;
};

export type PublicMensaPayload = {
  source: "eat-api" | "openmensa";
  fetchedAt: string;
  canteen: {
    id: string;
    name: string;
    address: string;
    openHours: Record<string, { start: string; end: string }> | null;
  };
  serviceDate: string;
  serviceLabel: string;
  isToday: boolean;
  note?: string;
  dishes: PublicMensaDish[];
};

export type PublicTumRoom = {
  roomId: number;
  code: string;
  shortName: string | null;
  description: string;
  purpose: string;
  seats: number | null;
  floor: string | null;
  navUrl: string | null;
  scheduleUrl: string | null;
  modified: string | null;
};

export type PublicTumRoomsPayload = {
  source: "tum-nat-api";
  fetchedAt: string;
  campusId: number;
  campusName: string;
  totalCount: number;
  filters: {
    teaching: boolean;
    centrallyManaged: boolean;
  };
  rooms: PublicTumRoom[];
};

export type PublicNavigatumSearchEntry = {
  id: string;
  type: string;
  name: string;
  subtext: string | null;
};

export type PublicNavigatumSearchSection = {
  facet: string;
  estimatedTotalHits: number;
  entries: PublicNavigatumSearchEntry[];
};

export type PublicNavigatumSearchPayload = {
  source: "navigatum";
  fetchedAt: string;
  query: string;
  sections: PublicNavigatumSearchSection[];
};

export type PublicNavigatumLocationPayload = {
  source: "navigatum";
  fetchedAt: string;
  id: string;
  type: string;
  typeCommonName: string | null;
  name: string;
  parents: string[];
  address: string | null;
  roomCount: string | null;
  redirectUrl: string | null;
  coordinates: {
    lat: number;
    lon: number;
  } | null;
};

export type PublicNavigatumRoutePayload = {
  source: "navigatum";
  fetchedAt: string;
  from: string;
  to: string;
  routeCosting: string;
  result: unknown;
};
