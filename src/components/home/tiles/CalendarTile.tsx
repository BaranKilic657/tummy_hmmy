"use client";

import type { CalendarEntry } from "../types";
import type { WeekDay } from "../data/calendarData";

type CalendarTileProps = {
  todayLabel: WeekDay;
  todayEntries: CalendarEntry[];
  onOpenWeekView: () => void;
};

export function CalendarTile({ todayLabel, todayEntries, onOpenWeekView }: CalendarTileProps) {
  return (
    <article className="widget widget-calendar">
      <h2>Kalender</h2>
      <p>Heutiger Stundenplan ({todayLabel})</p>
      <button
        type="button"
        className="calendar-preview"
        onClick={onOpenWeekView}
        aria-label="Wochenkalender öffnen"
      >
        {todayEntries.map((entry) => (
          <span key={`${entry.time}-${entry.module}`} className="calendar-row">
            <strong>{entry.time}</strong>
            <em>{entry.module}</em>
          </span>
        ))}
        <span className="calendar-preview-hint">Klick für Wochenansicht</span>
      </button>
    </article>
  );
}
