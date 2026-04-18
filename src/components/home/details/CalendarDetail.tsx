"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { WEEK_CALENDAR, WEEK_DAYS, type WeekDay } from "../data/calendarData";
import type { CalendarEntry } from "../types";
import {
  addCustomCalendarEntry,
  CUSTOM_CALENDAR_UPDATED_EVENT,
  getCustomCalendarEntries,
  getStartMinutes,
  type CustomCalendarEntry,
} from "@/lib/calendar-custom-events";

export function CalendarDetail() {
  const [customEntries, setCustomEntries] = useState<CustomCalendarEntry[]>([]);
  const [day, setDay] = useState<WeekDay>("Monday");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [module, setModule] = useState("");
  const [room, setRoom] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setCustomEntries(getCustomCalendarEntries());
  }, []);

  useEffect(() => {
    const refresh = () => setCustomEntries(getCustomCalendarEntries());
    window.addEventListener(CUSTOM_CALENDAR_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(CUSTOM_CALENDAR_UPDATED_EVENT, refresh);
  }, []);

  const weekData = useMemo(() => {
    return WEEK_DAYS.reduce<Record<WeekDay, Array<CalendarEntry & { isCustom: boolean }>>>(
      (accumulator, weekDay) => {
        const baseEntries = WEEK_CALENDAR[weekDay].map((entry) => ({ ...entry, isCustom: false }));
        const ownEntries = customEntries
          .filter((entry) => entry.day === weekDay)
          .map((entry) => ({ time: entry.time, module: entry.module, room: entry.room, isCustom: true }));

        accumulator[weekDay] = [...baseEntries, ...ownEntries].sort(
          (left, right) => getStartMinutes(left.time) - getStartMinutes(right.time),
        );
        return accumulator;
      },
      {
        Monday: [],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
      },
    );
  }, [customEntries]);

  function onAddCustomEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = module.trim();
    const location = room.trim();
    if (!title || !location) {
      setError("Please enter title and room.");
      return;
    }
    if (!startTime || !endTime || startTime >= endTime) {
      setError("Please choose a valid time range.");
      return;
    }

    const result = addCustomCalendarEntry({
      day,
      module: title,
      room: location,
      startTime,
      endTime,
    });

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setCustomEntries((current) => [...current, result.entry]);
    setModule("");
    setRoom("");
    setError("");
  }

  return (
    <section className="calendar-detail">
      <p className="detail-subtitle">Weekly electrical engineering schedule</p>
      <form className="calendar-custom-form" onSubmit={onAddCustomEntry}>
        <select value={day} onChange={(event) => setDay(event.target.value as WeekDay)} aria-label="Day">
          {WEEK_DAYS.map((weekDay) => (
            <option key={weekDay} value={weekDay}>
              {weekDay}
            </option>
          ))}
        </select>
        <input
          type="time"
          value={startTime}
          onChange={(event) => setStartTime(event.target.value)}
          aria-label="Start time"
        />
        <input
          type="time"
          value={endTime}
          onChange={(event) => setEndTime(event.target.value)}
          aria-label="End time"
        />
        <input
          type="text"
          value={module}
          onChange={(event) => setModule(event.target.value)}
          placeholder="Appointment title"
          aria-label="Appointment title"
        />
        <input
          type="text"
          value={room}
          onChange={(event) => setRoom(event.target.value)}
          placeholder="Room"
          aria-label="Room"
        />
        <button type="submit">Add</button>
      </form>
      {error ? <p className="widget-error">{error}</p> : null}

      <div className="calendar-week-grid">
        {WEEK_DAYS.map((day) => (
          <article key={day} className="calendar-day-col">
            <h4>{day}</h4>
            <div className="calendar-day-list">
              {weekData[day].map((entry, index) => (
                <div key={`${day}-${entry.time}-${entry.module}-${entry.room}-${index}`} className="calendar-day-entry">
                  <span>{entry.time}</span>
                  <strong>{entry.module}</strong>
                  <small>
                    <a
                      href={`https://nav.tum.de/search?q=${encodeURIComponent(entry.room)}`}
                      className="calendar-room-link"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {entry.room}
                    </a>
                    {entry.isCustom ? " · custom" : ""}
                  </small>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
