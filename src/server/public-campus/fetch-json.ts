import "server-only";

type FetchJsonOptions = RequestInit & {
  revalidate?: number;
};

export async function fetchJson<T>(
  url: string,
  options: FetchJsonOptions = {},
): Promise<T> {
  const { revalidate = 900, headers, ...requestInit } = options;
  const response = await fetch(url, {
    ...requestInit,
    headers: {
      accept: "application/json",
      ...headers,
    },
    next: {
      revalidate,
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Upstream request failed (${response.status} ${response.statusText})`);
  }

  return (await response.json()) as T;
}

export function getBerlinDateParts(referenceDate = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(referenceDate);
  const year = Number(parts.find((part) => part.type === "year")?.value ?? "1970");
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "01");
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "01");
  const isoDate = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const anchor = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  return {
    year,
    month,
    day,
    isoDate,
    anchor,
  };
}

export function formatGermanDateLabel(isoDate: string) {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(`${isoDate}T12:00:00Z`));
}

export function isSameBerlinDate(isoDate: string, referenceDate = new Date()) {
  return isoDate === getBerlinDateParts(referenceDate).isoDate;
}
