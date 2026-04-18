"use client";

import { WEEK_CALENDAR, WEEK_DAYS } from "../data/calendarData";

export function CalendarDetail() {
  return (
    <section className="calendar-detail">
      <p className="detail-subtitle">Weekly electrical engineering schedule</p>
      <div className="calendar-week-grid">
        {WEEK_DAYS.map((day) => (
          <article key={day} className="calendar-day-col">
            <h4>{day}</h4>
            <div className="calendar-day-list">
              {WEEK_CALENDAR[day].map((entry) => (
                <div key={`${day}-${entry.time}-${entry.module}`} className="calendar-day-entry">
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
