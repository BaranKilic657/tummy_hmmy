import type { CalendarEntry } from "@/components/home/types";
import type { WeekDay } from "@/components/home/data/calendarData";

export const COURSE_OVERRIDE_STORAGE_KEY = "tummy.calendar.course-overrides.v1";
export const COURSE_OVERRIDE_UPDATED_EVENT = "tummy:calendar-course-overrides-updated";

export type CourseOverride = {
  key: string;
  day: WeekDay;
  original: CalendarEntry;
  mode: "updated" | "deleted";
  updated?: CalendarEntry;
  updatedAt: string;
};

type CourseOverrideInput = {
  day: WeekDay;
  original: CalendarEntry;
  updated: CalendarEntry;
};

export function getCourseOverrideMap(): Record<string, CourseOverride> {
  const list = getCourseOverrides();
  return list.reduce<Record<string, CourseOverride>>((acc, item) => {
    acc[item.key] = item;
    return acc;
  }, {});
}

export function getCourseOverrides(): CourseOverride[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(COURSE_OVERRIDE_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isCourseOverride);
  } catch {
    return [];
  }
}

export function upsertCourseOverride(input: CourseOverrideInput) {
  const current = getCourseOverrides();
  const key = buildCourseEntryKey(input.day, input.original);

  const nextOverride: CourseOverride = {
    key,
    day: input.day,
    original: input.original,
    mode: "updated",
    updated: input.updated,
    updatedAt: new Date().toISOString(),
  };

  const next = mergeOverride(current, nextOverride);
  saveCourseOverrides(next);

  return { ok: true as const, override: nextOverride };
}

export function hideCourseEntry(day: WeekDay, original: CalendarEntry) {
  const current = getCourseOverrides();
  const key = buildCourseEntryKey(day, original);

  const nextOverride: CourseOverride = {
    key,
    day,
    original,
    mode: "deleted",
    updatedAt: new Date().toISOString(),
  };

  const next = mergeOverride(current, nextOverride);
  saveCourseOverrides(next);

  return { ok: true as const, override: nextOverride };
}

export function restoreCourseEntry(day: WeekDay, original: CalendarEntry) {
  const current = getCourseOverrides();
  const key = buildCourseEntryKey(day, original);
  const next = current.filter((item) => item.key !== key);

  if (next.length === current.length) {
    return { ok: false as const, error: "No override found for selected course." };
  }

  saveCourseOverrides(next);
  return { ok: true as const };
}

function saveCourseOverrides(overrides: CourseOverride[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(COURSE_OVERRIDE_STORAGE_KEY, JSON.stringify(overrides));
  window.dispatchEvent(new Event(COURSE_OVERRIDE_UPDATED_EVENT));
}

function mergeOverride(current: CourseOverride[], nextOverride: CourseOverride) {
  const filtered = current.filter((item) => item.key !== nextOverride.key);
  return [...filtered, nextOverride];
}

function isCourseOverride(input: unknown): input is CourseOverride {
  if (!input || typeof input !== "object") {
    return false;
  }

  const record = input as Record<string, unknown>;
  const original = record.original as Record<string, unknown> | undefined;
  const updated = record.updated as Record<string, unknown> | undefined;

  const originalValid =
    Boolean(original) &&
    typeof original?.time === "string" &&
    typeof original?.module === "string" &&
    typeof original?.room === "string";

  const updatedValid =
    record.mode !== "updated" ||
    (Boolean(updated) && typeof updated?.time === "string" && typeof updated?.module === "string" && typeof updated?.room === "string");

  return (
    typeof record.key === "string" &&
    (record.day === "Monday" ||
      record.day === "Tuesday" ||
      record.day === "Wednesday" ||
      record.day === "Thursday" ||
      record.day === "Friday") &&
    (record.mode === "updated" || record.mode === "deleted") &&
    typeof record.updatedAt === "string" &&
    originalValid &&
    updatedValid
  );
}

export function buildCourseEntryKey(day: WeekDay, entry: CalendarEntry) {
  return `${day}|${entry.time}|${entry.module}|${entry.room}`;
}
