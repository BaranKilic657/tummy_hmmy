export const CUSTOM_CALENDAR_STORAGE_KEY = "tummy.custom-calendar-events.v1";
export const CUSTOM_CALENDAR_UPDATED_EVENT = "tummy:calendar-events-updated";

export type CalendarWeekDay = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";

export type CustomCalendarEntry = {
  id: string;
  day: CalendarWeekDay;
  time: string;
  module: string;
  room: string;
};

type CalendarEntryInput = {
  day: CalendarWeekDay;
  startTime: string;
  endTime: string;
  module: string;
  room: string;
};

export function getCustomCalendarEntries(): CustomCalendarEntry[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(CUSTOM_CALENDAR_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isCustomCalendarEntry);
  } catch {
    return [];
  }
}

export function addCustomCalendarEntry(input: CalendarEntryInput) {
  const title = input.module.trim();
  const location = input.room.trim();

  if (!title || !location) {
    return { ok: false as const, error: "Please enter title and room." };
  }
  if (!isValidTimeRange(input.startTime, input.endTime)) {
    return { ok: false as const, error: "Please choose a valid time range." };
  }

  const nextEntry: CustomCalendarEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    day: input.day,
    time: `${input.startTime} - ${input.endTime}`,
    module: title,
    room: location,
  };

  const current = getCustomCalendarEntries();
  const next = [...current, nextEntry];
  saveCustomCalendarEntries(next);

  return { ok: true as const, entry: nextEntry };
}

export function saveCustomCalendarEntries(entries: CustomCalendarEntry[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(CUSTOM_CALENDAR_STORAGE_KEY, JSON.stringify(entries));
  window.dispatchEvent(new Event(CUSTOM_CALENDAR_UPDATED_EVENT));
}

export function getStartMinutes(timeRange: string) {
  const match = /^(\d{1,2}):(\d{2})/.exec(timeRange.trim());
  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

function isValidTimeRange(startTime: string, endTime: string) {
  return isValidClock(startTime) && isValidClock(endTime) && startTime < endTime;
}

function isValidClock(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

function isCustomCalendarEntry(input: unknown): input is CustomCalendarEntry {
  if (!input || typeof input !== "object") {
    return false;
  }

  const record = input as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    isWeekDay(record.day) &&
    typeof record.time === "string" &&
    typeof record.module === "string" &&
    typeof record.room === "string"
  );
}

export function isWeekDay(value: unknown): value is CalendarWeekDay {
  return (
    value === "Monday" ||
    value === "Tuesday" ||
    value === "Wednesday" ||
    value === "Thursday" ||
    value === "Friday"
  );
}
