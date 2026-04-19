"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { WEEK_CALENDAR, WEEK_DAYS, type WeekDay } from "../data/calendarData";
import type { CalendarEntry } from "../types";
import {
  addCustomCalendarEntry,
  CUSTOM_CALENDAR_UPDATED_EVENT,
  deleteCustomCalendarEntry,
  getCustomCalendarEntries,
  getStartMinutes,
  type CalendarRecurrence,
  type CustomCalendarEntry,
  updateCustomCalendarEntry,
} from "@/lib/calendar-custom-events";
import {
  buildCourseEntryKey,
  COURSE_OVERRIDE_UPDATED_EVENT,
  getCourseOverrideMap,
  hideCourseEntry,
  restoreCourseEntry,
  type CourseOverride,
  upsertCourseOverride,
} from "@/lib/calendar-course-overrides";

export function CalendarDetail() {
  const [customEntries, setCustomEntries] = useState<CustomCalendarEntry[]>([]);
  const [courseOverrideMap, setCourseOverrideMap] = useState<Record<string, CourseOverride>>({});
  const [weekOffset, setWeekOffset] = useState(0);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingCourse, setEditingCourse] = useState<{ day: WeekDay; original: CalendarEntry } | null>(null);
  const [day, setDay] = useState<WeekDay>("Monday");
  const [recurrence, setRecurrence] = useState<CalendarRecurrence>("weekly");
  const [dateIso, setDateIso] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [module, setModule] = useState("");
  const [room, setRoom] = useState("");
  const [courseTime, setCourseTime] = useState("");
  const [courseModule, setCourseModule] = useState("");
  const [courseRoom, setCourseRoom] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setCustomEntries(getCustomCalendarEntries());
    setCourseOverrideMap(getCourseOverrideMap());
  }, []);

  useEffect(() => {
    const refresh = () => setCustomEntries(getCustomCalendarEntries());
    window.addEventListener(CUSTOM_CALENDAR_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(CUSTOM_CALENDAR_UPDATED_EVENT, refresh);
  }, []);

  useEffect(() => {
    const refresh = () => setCourseOverrideMap(getCourseOverrideMap());
    window.addEventListener(COURSE_OVERRIDE_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(COURSE_OVERRIDE_UPDATED_EVENT, refresh);
  }, []);

  const weekDates = useMemo(() => buildWeekDates(weekOffset), [weekOffset]);

  useEffect(() => {
    if (recurrence === "weekly") {
      return;
    }
    if (dateIso) {
      return;
    }

    const selected = weekDates[day];
    setDateIso(toDateInputValue(selected));
  }, [recurrence, day, weekDates, dateIso]);

  const weekData = useMemo(() => {
    return WEEK_DAYS.reduce<Record<WeekDay, Array<CalendarEntry & { isCustom: boolean }>>>(
      (accumulator, weekDay) => {
        const baseEntries = WEEK_CALENDAR[weekDay].map((entry) => ({ ...entry, isCustom: false }));
        const resolvedBaseEntries = baseEntries
          .map((entry) => {
            const key = buildCourseEntryKey(weekDay, entry);
            const override = courseOverrideMap[key];

            if (!override) {
              return entry;
            }

            if (override.mode === "deleted") {
              return null;
            }

            return {
              ...override.updated,
              isCustom: false,
            };
          })
          .filter((entry): entry is CalendarEntry & { isCustom: boolean } => Boolean(entry));
        const ownEntries = customEntries
          .filter((entry) => shouldEntryAppearOnWeekDay(entry, weekDay, weekDates[weekDay]))
          .map((entry) => ({
            time: `${entry.startTime} - ${entry.endTime}`,
            module: entry.module,
            room: `${entry.room}${entry.recurrence !== "weekly" ? ` · ${entry.recurrence}` : ""}`,
            isCustom: true,
          }));

        accumulator[weekDay] = [...resolvedBaseEntries, ...ownEntries].sort(
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
  }, [customEntries, courseOverrideMap, weekDates]);

  const baseEntriesForWeek = useMemo(() => {
    return WEEK_DAYS.flatMap((weekDay) =>
      WEEK_CALENDAR[weekDay].map((entry) => {
        const key = buildCourseEntryKey(weekDay, entry);
        const override = courseOverrideMap[key];
        return {
          key,
          day: weekDay,
          original: entry,
          effective: override?.mode === "updated" && override.updated ? override.updated : entry,
          hidden: override?.mode === "deleted",
        };
      }),
    );
  }, [courseOverrideMap]);

  const hiddenBaseEntries = useMemo(
    () => baseEntriesForWeek.filter((entry) => entry.hidden),
    [baseEntriesForWeek],
  );

  const customEntriesForWeek = useMemo(() => {
    return customEntries
      .filter((entry) => shouldEntryAppearOnWeekDay(entry, entry.day, weekDates[entry.day]))
      .sort((left, right) => {
        const leftDate = weekDates[left.day].getTime();
        const rightDate = weekDates[right.day].getTime();
        if (leftDate !== rightDate) {
          return leftDate - rightDate;
        }
        return left.startTime.localeCompare(right.startTime);
      });
  }, [customEntries, weekDates]);

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

    const selectedDate = recurrence === "weekly" ? undefined : dateIso;

    const payload = {
      day,
      module: title,
      room: location,
      startTime,
      endTime,
      recurrence,
      dateIso: selectedDate,
    };
    const result = editingEntryId
      ? updateCustomCalendarEntry(editingEntryId, payload)
      : addCustomCalendarEntry(payload);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setCustomEntries(getCustomCalendarEntries());
    resetForm();
    setError("");
  }

  function startEdit(entry: CustomCalendarEntry) {
    setEditingEntryId(entry.id);
    setDay(entry.day);
    setRecurrence(entry.recurrence);
    setDateIso(entry.dateIso ?? "");
    setStartTime(entry.startTime);
    setEndTime(entry.endTime);
    setModule(entry.module);
    setRoom(entry.room);
    setError("");
  }

  function cancelEdit() {
    resetForm();
    setError("");
  }

  function removeEntry(id: string) {
    const result = deleteCustomCalendarEntry(id);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setCustomEntries(getCustomCalendarEntries());
    if (editingEntryId === id) {
      resetForm();
    }
  }

  function startEditCourse(day: WeekDay, original: CalendarEntry) {
    setEditingCourse({ day, original });
    setCourseTime(original.time);
    setCourseModule(original.module);
    setCourseRoom(original.room);
    setError("");
  }

  function cancelCourseEdit() {
    setEditingCourse(null);
    setCourseTime("");
    setCourseModule("");
    setCourseRoom("");
  }

  function onSaveCourseEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingCourse) {
      return;
    }

    const parsedRange = parseTimeRange(courseTime);
    if (!parsedRange) {
      setError("Please use a valid course time range like 08:30 - 10:00.");
      return;
    }

    const moduleValue = courseModule.trim();
    const roomValue = courseRoom.trim();
    if (!moduleValue || !roomValue) {
      setError("Please provide module and room for course update.");
      return;
    }

    const result = upsertCourseOverride({
      day: editingCourse.day,
      original: editingCourse.original,
      updated: {
        time: `${parsedRange.start} - ${parsedRange.end}`,
        module: moduleValue,
        room: roomValue,
      },
    });

    if (!result.ok) {
      setError("Could not save module changes.");
      return;
    }

    setCourseOverrideMap(getCourseOverrideMap());
    cancelCourseEdit();
    setError("");
  }

  function hideCourse(day: WeekDay, original: CalendarEntry) {
    hideCourseEntry(day, original);
    setCourseOverrideMap(getCourseOverrideMap());
  }

  function restoreCourse(day: WeekDay, original: CalendarEntry) {
    const result = restoreCourseEntry(day, original);
    if (!result.ok) {
      setError(result.error);
      return;
    }

    setCourseOverrideMap(getCourseOverrideMap());
  }

  function resetForm() {
    setEditingEntryId(null);
    setDay("Monday");
    setRecurrence("weekly");
    setDateIso("");
    setStartTime("09:00");
    setEndTime("10:00");
    setModule("");
    setRoom("");
  }

  return (
    <section className="calendar-detail">
      <div className="calendar-detail-head">
        <p className="detail-subtitle">Weekly electrical engineering schedule</p>
        <div className="calendar-week-nav" role="group" aria-label="Week navigation">
          <button type="button" onClick={() => setWeekOffset((current) => current - 1)}>
            Previous week
          </button>
          <span>
            {formatHeaderDate(weekDates.Monday)} - {formatHeaderDate(weekDates.Friday)}
          </span>
          <button type="button" onClick={() => setWeekOffset((current) => current + 1)}>
            Next week
          </button>
        </div>
      </div>

      <form className="calendar-custom-form" onSubmit={onAddCustomEntry}>
        <select value={day} onChange={(event) => setDay(event.target.value as WeekDay)} aria-label="Day">
          {WEEK_DAYS.map((weekDay) => (
            <option key={weekDay} value={weekDay}>
              {weekDay}
            </option>
          ))}
        </select>
        <select
          value={recurrence}
          onChange={(event) => setRecurrence(event.target.value as CalendarRecurrence)}
          aria-label="Recurrence"
        >
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="once">Once</option>
        </select>
        <input
          type="date"
          value={dateIso}
          onChange={(event) => setDateIso(event.target.value)}
          aria-label="Event date"
          disabled={recurrence === "weekly"}
        />
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
        <button type="submit">{editingEntryId ? "Save" : "Add"}</button>
        {editingEntryId ? (
          <button type="button" onClick={cancelEdit} className="calendar-form-ghost-btn">
            Cancel
          </button>
        ) : null}
      </form>

      {editingCourse ? (
        <form className="calendar-course-edit-form" onSubmit={onSaveCourseEdit}>
          <strong>Edit module: {editingCourse.day}</strong>
          <input
            type="text"
            value={courseTime}
            onChange={(event) => setCourseTime(event.target.value)}
            placeholder="08:30 - 10:00"
            aria-label="Course time range"
          />
          <input
            type="text"
            value={courseModule}
            onChange={(event) => setCourseModule(event.target.value)}
            placeholder="Module"
            aria-label="Course module"
          />
          <input
            type="text"
            value={courseRoom}
            onChange={(event) => setCourseRoom(event.target.value)}
            placeholder="Room"
            aria-label="Course room"
          />
          <button type="submit">Save module</button>
          <button type="button" className="calendar-form-ghost-btn" onClick={cancelCourseEdit}>
            Cancel
          </button>
        </form>
      ) : null}

      {error ? <p className="widget-error">{error}</p> : null}

      <div className="calendar-week-grid">
        {WEEK_DAYS.map((day) => (
          <article key={day} className="calendar-day-col">
            <h4>
              {day}
              <small>{formatHeaderDate(weekDates[day])}</small>
            </h4>
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

      <section className="calendar-custom-list">
        <h4>Custom entries in displayed week</h4>
        {customEntriesForWeek.length === 0 ? (
          <p className="widget-state">No custom entries in this week.</p>
        ) : (
          <ul>
            {customEntriesForWeek.map((entry) => (
              <li key={entry.id}>
                <div>
                  <strong>{entry.module}</strong>
                  <p>
                    {entry.day} {entry.startTime}-{entry.endTime} · {entry.room} · {entry.recurrence}
                  </p>
                </div>
                <div className="calendar-entry-actions">
                  <button type="button" onClick={() => startEdit(entry)}>
                    Edit
                  </button>
                  <button type="button" onClick={() => removeEntry(entry.id)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="calendar-custom-list">
        <h4>Course modules (editable)</h4>
        <ul>
          {baseEntriesForWeek
            .filter((entry) => !entry.hidden)
            .map((entry) => (
              <li key={entry.key}>
                <div>
                  <strong>{entry.effective.module}</strong>
                  <p>
                    {entry.day} {entry.effective.time} · {entry.effective.room}
                  </p>
                </div>
                <div className="calendar-entry-actions">
                  <button type="button" onClick={() => startEditCourse(entry.day, entry.original)}>
                    Edit
                  </button>
                  <button type="button" onClick={() => hideCourse(entry.day, entry.original)}>
                    Hide
                  </button>
                </div>
              </li>
            ))}
        </ul>
      </section>

      {hiddenBaseEntries.length > 0 ? (
        <section className="calendar-custom-list">
          <h4>Hidden modules</h4>
          <ul>
            {hiddenBaseEntries.map((entry) => (
              <li key={`hidden-${entry.key}`}>
                <div>
                  <strong>{entry.original.module}</strong>
                  <p>
                    {entry.day} {entry.original.time} · {entry.original.room}
                  </p>
                </div>
                <div className="calendar-entry-actions">
                  <button type="button" onClick={() => restoreCourse(entry.day, entry.original)}>
                    Restore
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}

function buildWeekDates(offset: number): Record<WeekDay, Date> {
  const today = new Date();
  const currentDay = today.getDay();
  const deltaToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(today.getDate() + deltaToMonday + offset * 7);

  return {
    Monday: new Date(monday),
    Tuesday: addDays(monday, 1),
    Wednesday: addDays(monday, 2),
    Thursday: addDays(monday, 3),
    Friday: addDays(monday, 4),
  };
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatHeaderDate(date: Date): string {
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" });
}

function shouldEntryAppearOnWeekDay(entry: CustomCalendarEntry, weekDay: WeekDay, targetDate: Date): boolean {
  if (entry.day !== weekDay) {
    return false;
  }

  if (entry.recurrence === "weekly") {
    return true;
  }

  if (!entry.dateIso) {
    return false;
  }

  const sourceDate = new Date(entry.dateIso);
  if (Number.isNaN(sourceDate.getTime())) {
    return false;
  }

  if (entry.recurrence === "once") {
    return toDateInputValue(sourceDate) === toDateInputValue(targetDate);
  }

  return sourceDate.getDate() === targetDate.getDate();
}

function parseTimeRange(value: string): { start: string; end: string } | null {
  const match = /^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const start = toClock(match[1]);
  const end = toClock(match[2]);
  if (!start || !end || start >= end) {
    return null;
  }

  return { start, end };
}

function toClock(input: string): string | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(input.trim());
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
