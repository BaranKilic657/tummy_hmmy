import type { CalendarEntry } from "../types";

export const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;
export const ALL_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type WeekDay = (typeof WEEK_DAYS)[number];
export type DayName = (typeof ALL_DAYS)[number];

export const WEEK_CALENDAR: Record<WeekDay, CalendarEntry[]> = {
  Monday: [
    { time: "08:15 - 09:45", module: "Advanced Mathematics 2", room: "MW 2001" },
    { time: "10:00 - 11:30", module: "Fundamentals of Electrical Engineering", room: "HS 2" },
    { time: "13:00 - 14:30", module: "Electronic Circuit Design", room: "N1173" },
  ],
  Tuesday: [
    { time: "09:00 - 10:30", module: "Digital Signal Processing", room: "MI HS1" },
    { time: "11:00 - 12:30", module: "Communication Networks", room: "5606" },
    { time: "14:00 - 15:30", module: "Power Electronics", room: "N2407" },
  ],
  Wednesday: [
    { time: "08:00 - 09:30", module: "Measurement Engineering", room: "PH 201" },
    { time: "10:00 - 11:30", module: "Microcontroller Lab", room: "N3210" },
    { time: "13:15 - 14:45", module: "Control Engineering", room: "HS 3" },
  ],
  Thursday: [
    { time: "09:00 - 10:30", module: "Field Theory", room: "N0335" },
    { time: "11:00 - 12:30", module: "Semiconductor Devices", room: "5612" },
    { time: "15:00 - 16:30", module: "Embedded Systems", room: "MI 00.08.036" },
  ],
  Friday: [
    { time: "08:30 - 10:00", module: "Technical Computer Science", room: "HS 4" },
    { time: "10:30 - 12:00", module: "Circuit Simulation", room: "N2305" },
    { time: "13:00 - 14:30", module: "Electrical Engineering Project Lab", room: "N1190" },
  ],
};

function isWeekDay(day: DayName): day is WeekDay {
  return WEEK_DAYS.includes(day as WeekDay);
}

export function getTodayDayName(date = new Date()): DayName {
  const dayIndex = date.getDay();
  const indexMap = [6, 0, 1, 2, 3, 4, 5] as const;
  return ALL_DAYS[indexMap[dayIndex]];
}

export function getTodayCalendarData(date = new Date()) {
  const dayName = getTodayDayName(date);
  const isWeekend = !isWeekDay(dayName);
  const previewDay: WeekDay = isWeekend ? "Monday" : dayName;
  const entries = WEEK_CALENDAR[previewDay];

  const dayIndex = date.getDay();
  const previewHint =
    dayIndex === 0
      ? "Tomorrow (Monday)"
      : dayIndex === 6
        ? "In 2 days (Monday)"
        : null;

  return {
    dayName,
    previewDay,
    entries,
    previewHint,
  };
}
