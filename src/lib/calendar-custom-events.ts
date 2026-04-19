export const CUSTOM_CALENDAR_STORAGE_KEY = "tummy.custom-calendar-events.v1";
export const CUSTOM_CALENDAR_UPDATED_EVENT = "tummy:calendar-events-updated";

export type CalendarWeekDay = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";
export type CalendarRecurrence = "weekly" | "monthly" | "once";

export type CustomCalendarEntry = {
  id: string;
  day: CalendarWeekDay;
  recurrence: CalendarRecurrence;
  dateIso?: string;
  startTime: string;
  endTime: string;
  time: string;
  module: string;
  room: string;
  createdAt: string;
};

type CalendarEntryInput = {
  day: CalendarWeekDay;
  startTime: string;
  endTime: string;
  module: string;
  room: string;
  recurrence: CalendarRecurrence;
  dateIso?: string;
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

    return parsed
      .map((entry) => toModernEntry(entry))
      .filter((entry): entry is CustomCalendarEntry => Boolean(entry));
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
  if (!isValidRecurrencePayload(input.recurrence, input.dateIso)) {
    return { ok: false as const, error: "Please select a valid date for monthly/once events." };
  }

  const nextEntry: CustomCalendarEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    day: input.day,
    recurrence: input.recurrence,
    dateIso: input.dateIso,
    startTime: input.startTime,
    endTime: input.endTime,
    time: `${input.startTime} - ${input.endTime}`,
    module: title,
    room: location,
    createdAt: new Date().toISOString(),
  };

  const current = getCustomCalendarEntries();
  const next = [...current, nextEntry];
  saveCustomCalendarEntries(next);

  return { ok: true as const, entry: nextEntry };
}

export function updateCustomCalendarEntry(id: string, input: CalendarEntryInput) {
  const current = getCustomCalendarEntries();
  const index = current.findIndex((entry) => entry.id === id);
  if (index === -1) {
    return { ok: false as const, error: "Entry not found." };
  }

  const title = input.module.trim();
  const location = input.room.trim();
  if (!title || !location) {
    return { ok: false as const, error: "Please enter title and room." };
  }
  if (!isValidTimeRange(input.startTime, input.endTime)) {
    return { ok: false as const, error: "Please choose a valid time range." };
  }
  if (!isValidRecurrencePayload(input.recurrence, input.dateIso)) {
    return { ok: false as const, error: "Please select a valid date for monthly/once events." };
  }

  const updated: CustomCalendarEntry = {
    ...current[index],
    day: input.day,
    recurrence: input.recurrence,
    dateIso: input.dateIso,
    startTime: input.startTime,
    endTime: input.endTime,
    time: `${input.startTime} - ${input.endTime}`,
    module: title,
    room: location,
  };

  const next = [...current];
  next[index] = updated;
  saveCustomCalendarEntries(next);
  return { ok: true as const, entry: updated };
}

export function deleteCustomCalendarEntry(id: string) {
  const current = getCustomCalendarEntries();
  const next = current.filter((entry) => entry.id !== id);
  if (next.length === current.length) {
    return { ok: false as const, error: "Entry not found." };
  }

  saveCustomCalendarEntries(next);
  return { ok: true as const };
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

function isValidRecurrencePayload(recurrence: CalendarRecurrence, dateIso?: string) {
  if (recurrence === "weekly") {
    return true;
  }

  if (!dateIso) {
    return false;
  }

  const parsed = new Date(dateIso);
  return !Number.isNaN(parsed.getTime());
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
    (record.recurrence === "weekly" || record.recurrence === "monthly" || record.recurrence === "once") &&
    typeof record.startTime === "string" &&
    typeof record.endTime === "string" &&
    typeof record.time === "string" &&
    typeof record.module === "string" &&
    typeof record.room === "string" &&
    typeof record.createdAt === "string"
  );
}

function toModernEntry(input: unknown): CustomCalendarEntry | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const record = input as Record<string, unknown>;

  if (isCustomCalendarEntry(record)) {
    return record;
  }

  if (
    typeof record.id === "string" &&
    isWeekDay(record.day) &&
    typeof record.time === "string" &&
    typeof record.module === "string" &&
    typeof record.room === "string"
  ) {
    const parsed = parseStoredTimeRange(record.time);
    if (!parsed) {
      return null;
    }

    return {
      id: record.id,
      day: record.day,
      recurrence: "weekly",
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      time: record.time,
      module: record.module,
      room: record.room,
      createdAt: new Date().toISOString(),
    };
  }

  return null;
}

function parseStoredTimeRange(value: string): { startTime: string; endTime: string } | null {
  const match = /^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  return { startTime: match[1], endTime: match[2] };
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
