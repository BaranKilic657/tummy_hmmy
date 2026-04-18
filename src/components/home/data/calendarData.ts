import type { CalendarEntry } from "../types";

export const WEEK_DAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"] as const;

export type WeekDay = (typeof WEEK_DAYS)[number];

export const WEEK_CALENDAR: Record<WeekDay, CalendarEntry[]> = {
  Montag: [
    { time: "08:15 - 09:45", module: "Höhere Mathematik 2", room: "MW 2001" },
    { time: "10:00 - 11:30", module: "Grundlagen der Elektrotechnik", room: "HS 2" },
    { time: "13:00 - 14:30", module: "Elektronische Schaltungstechnik", room: "N1173" },
  ],
  Dienstag: [
    { time: "09:00 - 10:30", module: "Digitale Signalverarbeitung", room: "MI HS1" },
    { time: "11:00 - 12:30", module: "Kommunikationsnetze", room: "5606" },
    { time: "14:00 - 15:30", module: "Leistungselektronik", room: "N2407" },
  ],
  Mittwoch: [
    { time: "08:00 - 09:30", module: "Messtechnik", room: "PH 201" },
    { time: "10:00 - 11:30", module: "Mikrocontroller-Labor", room: "N3210" },
    { time: "13:15 - 14:45", module: "Regelungstechnik", room: "HS 3" },
  ],
  Donnerstag: [
    { time: "09:00 - 10:30", module: "Feldtheorie", room: "N0335" },
    { time: "11:00 - 12:30", module: "Halbleiterbauelemente", room: "5612" },
    { time: "15:00 - 16:30", module: "Embedded Systems", room: "MI 00.08.036" },
  ],
  Freitag: [
    { time: "08:30 - 10:00", module: "Technische Informatik", room: "HS 4" },
    { time: "10:30 - 12:00", module: "Schaltungssimulation", room: "N2305" },
    { time: "13:00 - 14:30", module: "Projektpraktikum ET", room: "N1190" },
  ],
};

export function getTodayWeekDay(date = new Date()): WeekDay {
  const dayIndex = date.getDay();
  const indexMap = [0, 0, 1, 2, 3, 4, 0] as const;
  return WEEK_DAYS[indexMap[dayIndex]];
}
