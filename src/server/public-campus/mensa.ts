import "server-only";

import type { PublicMensaDish, PublicMensaPayload } from "@/lib/public-campus-types";
import { fetchJson, formatGermanDateLabel, getBerlinDateParts, isSameBerlinDate } from "./fetch-json";

const EAT_API_BASE = "https://tum-dev.github.io/eat-api";
const OPENMENSA_BASE = "https://openmensa.org/api/v2";
const DEFAULT_CANTEEN_ID = "mensa-garching";

type EatApiCanteen = {
  name: string;
  canteen_id: string;
  location: {
    address: string;
    latitude: number;
    longitude: number;
  };
  open_hours?: Record<string, { start: string; end: string }>;
};

type EatApiDish = {
  name: string;
  labels?: string[];
  dish_type?: string;
  prices?: {
    students?: EatApiPrice;
    staff?: EatApiPrice;
    guests?: EatApiPrice;
  };
};

type EatApiPrice = {
  base_price?: number;
  price_per_unit?: number;
  unit?: string;
};

type EatApiWeekMenu = {
  days?: Array<{
    date: string;
    dishes: EatApiDish[];
  }>;
};

type OpenMensaCanteen = {
  id: number;
  name: string;
  address?: string;
  city?: string;
};

type OpenMensaDay = {
  date: string;
  closed?: boolean;
};

type OpenMensaMeal = {
  name: string;
  category?: string;
  notes?: string[];
  prices?: {
    students?: number | null;
    employees?: number | null;
    others?: number | null;
  };
};

export async function getPublicMensaMenu(input: {
  canteenId?: string;
  referenceDate?: Date;
} = {}): Promise<PublicMensaPayload> {
  const canteenId = input.canteenId ?? DEFAULT_CANTEEN_ID;
  const referenceDate = input.referenceDate ?? new Date();
  const canteen = await getEatApiCanteen(canteenId);

  try {
    const liveMenu = await getEatApiMenu(canteen, referenceDate);

    if (liveMenu) {
      return liveMenu;
    }
  } catch {
    // OpenMensa fallback is attempted below.
  }

  const fallbackMenu = await getOpenMensaMenu(canteen, referenceDate);

  if (fallbackMenu) {
    return fallbackMenu;
  }

  throw new Error("No public mensa menu is currently available for the requested canteen.");
}

async function getEatApiCanteen(canteenId: string) {
  const canteens = await fetchJson<EatApiCanteen[]>(`${EAT_API_BASE}/enums/canteens.json`, {
    revalidate: 60 * 60 * 12,
  });
  const canteen = canteens.find((entry) => entry.canteen_id === canteenId);

  if (!canteen) {
    throw new Error(`Unknown canteen id "${canteenId}".`);
  }

  return canteen;
}

async function getEatApiMenu(
  canteen: EatApiCanteen,
  referenceDate: Date,
): Promise<PublicMensaPayload | null> {
  const currentWeek = getBerlinWeek(referenceDate);
  const nextWeekDate = new Date(currentWeek.anchor);
  nextWeekDate.setUTCDate(nextWeekDate.getUTCDate() + 7);
  const nextWeek = getBerlinWeek(nextWeekDate);

  const currentMenu = await fetchWeekMenu(canteen.canteen_id, currentWeek.year, currentWeek.week);
  let selectedDay = pickUpcomingDay(currentMenu, currentWeek.isoDate);

  if (!selectedDay) {
    const upcomingMenu = await fetchWeekMenu(canteen.canteen_id, nextWeek.year, nextWeek.week);
    selectedDay = pickFirstAvailableDay(upcomingMenu);
  }

  if (!selectedDay) {
    return null;
  }

  return {
    source: "eat-api",
    fetchedAt: new Date().toISOString(),
    canteen: {
      id: canteen.canteen_id,
      name: canteen.name,
      address: canteen.location.address,
      openHours: canteen.open_hours ?? null,
    },
    serviceDate: selectedDay.date,
    serviceLabel: formatGermanDateLabel(selectedDay.date),
    isToday: isSameBerlinDate(selectedDay.date, referenceDate),
    dishes: selectedDay.dishes.map(mapEatDish).slice(0, 6),
  };
}

async function getOpenMensaMenu(
  canteen: EatApiCanteen,
  referenceDate: Date,
): Promise<PublicMensaPayload | null> {
  const searchParams = new URLSearchParams({
    "near[lat]": String(canteen.location.latitude),
    "near[lng]": String(canteen.location.longitude),
  });
  const nearby = await fetchJson<OpenMensaCanteen[]>(
    `${OPENMENSA_BASE}/canteens?${searchParams.toString()}`,
    { revalidate: 60 * 60 * 6 },
  );
  const fallbackCanteen = pickOpenMensaCanteen(nearby, canteen.name);

  if (!fallbackCanteen) {
    return null;
  }

  const days = await fetchJson<OpenMensaDay[]>(
    `${OPENMENSA_BASE}/canteens/${fallbackCanteen.id}/days`,
    { revalidate: 60 * 15 },
  );
  const today = getBerlinDateParts(referenceDate).isoDate;
  const selectedDay = pickOpenMensaDay(days, today);

  if (!selectedDay) {
    return null;
  }

  const meals = await fetchJson<OpenMensaMeal[]>(
    `${OPENMENSA_BASE}/canteens/${fallbackCanteen.id}/days/${selectedDay.date}/meals`,
    { revalidate: 60 * 15 },
  );

  if (meals.length === 0) {
    return null;
  }

  return {
    source: "openmensa",
    fetchedAt: new Date().toISOString(),
    canteen: {
      id: canteen.canteen_id,
      name: fallbackCanteen.name,
      address: [fallbackCanteen.address, fallbackCanteen.city].filter(Boolean).join(", "),
      openHours: canteen.open_hours ?? null,
    },
    serviceDate: selectedDay.date,
    serviceLabel: formatGermanDateLabel(selectedDay.date),
    isToday: isSameBerlinDate(selectedDay.date, referenceDate),
    note: "Eat API fallback was unavailable, so OpenMensa is being used.",
    dishes: meals.map(mapOpenMensaMeal).slice(0, 6),
  };
}

async function fetchWeekMenu(canteenId: string, year: number, week: number) {
  return fetchJson<EatApiWeekMenu>(`${EAT_API_BASE}/${canteenId}/${year}/${week}.json`, {
    revalidate: 60 * 30,
  });
}

function pickUpcomingDay(menu: EatApiWeekMenu, isoDate: string) {
  const futureDays = (menu.days ?? []).filter(
    (day) => day.dishes.length > 0 && day.date >= isoDate,
  );

  if (futureDays.length > 0) {
    return futureDays[0];
  }

  return null;
}

function pickFirstAvailableDay(menu: EatApiWeekMenu) {
  return (menu.days ?? []).find((day) => day.dishes.length > 0) ?? null;
}

function mapEatDish(dish: EatApiDish): PublicMensaDish {
  return {
    name: dish.name,
    category: dish.dish_type ?? "Gericht",
    labels: dish.labels ?? [],
    studentPrice: formatEatPrice(dish.prices?.students),
    staffPrice: formatEatPrice(dish.prices?.staff),
    guestPrice: formatEatPrice(dish.prices?.guests),
  };
}

function mapOpenMensaMeal(meal: OpenMensaMeal): PublicMensaDish {
  return {
    name: meal.name,
    category: meal.category ?? "Gericht",
    labels: meal.notes ?? [],
    studentPrice: formatEuroPrice(meal.prices?.students),
    staffPrice: formatEuroPrice(meal.prices?.employees),
    guestPrice: formatEuroPrice(meal.prices?.others),
  };
}

function formatEatPrice(price?: EatApiPrice) {
  if (!price) {
    return null;
  }

  const parts: string[] = [];

  if (typeof price.base_price === "number" && price.base_price > 0) {
    parts.push(formatEuroPrice(price.base_price) ?? "");
  }

  if (typeof price.price_per_unit === "number") {
    parts.push(`${formatEuroPrice(price.price_per_unit) ?? "€0.00"}/${price.unit ?? "100g"}`);
  }

  return parts.filter(Boolean).join(" + ") || null;
}

function formatEuroPrice(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function pickOpenMensaCanteen(canteens: OpenMensaCanteen[], preferredName: string) {
  const normalizedPreferred = normalizeName(preferredName);
  return (
    canteens.find((canteen) => normalizeName(canteen.name) === normalizedPreferred) ??
    canteens.find((canteen) => normalizeName(canteen.name).includes(normalizedPreferred)) ??
    canteens[0] ??
    null
  );
}

function pickOpenMensaDay(days: OpenMensaDay[], isoDate: string) {
  const openDays = days.filter((day) => !day.closed);
  return openDays.find((day) => day.date >= isoDate) ?? openDays[0] ?? null;
}

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, " ")
    .trim();
}

function getBerlinWeek(referenceDate: Date) {
  const berlinDate = getBerlinDateParts(referenceDate);
  const target = new Date(berlinDate.anchor);
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1, 12, 0, 0));
  const week = Math.ceil((((target.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);

  return {
    year: target.getUTCFullYear(),
    week,
    isoDate: berlinDate.isoDate,
    anchor: berlinDate.anchor,
  };
}
