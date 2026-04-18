"use client";

import type { CalendarEntry } from "../types";
import type { DayName } from "../data/calendarData";

type CalendarTileProps = {
  todayLabel: DayName;
  previewDayLabel: DayName;
  previewHint: string | null;
  todayEntries: CalendarEntry[];
  onOpenWeekView: () => void;
};

export function CalendarTile({
  todayLabel,
  previewDayLabel,
  previewHint,
  todayEntries,
  onOpenWeekView,
}: CalendarTileProps) {
  return (
    <article className="widget widget-calendar">
      <h2>Calendar</h2>
      <p>
        Schedule ({previewDayLabel})
        {previewHint ? ` · ${previewHint}` : todayLabel !== previewDayLabel ? ` · Today: ${todayLabel}` : ""}
      </p>
      <button
        type="button"
        className="calendar-preview"
        onClick={onOpenWeekView}
        aria-label="Open weekly calendar"
      >
        {todayEntries.map((entry) => (
          <span key={`${entry.time}-${entry.module}`} className="calendar-row">
            <strong>{entry.time}</strong>
            <em>{entry.module}</em>
          </span>
        ))}
        <span className="calendar-preview-hint">Click for detail view</span>
      </button>
    </article>
  );
}
