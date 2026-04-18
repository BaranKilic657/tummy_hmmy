"use client";

import { WEEK_CALENDAR, WEEK_DAYS } from "./data/calendarData";

type CalendarModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function CalendarModal({ isOpen, onClose }: CalendarModalProps) {
  return (
    <div className={`calendar-overlay ${isOpen ? "is-open" : ""}`} aria-hidden={!isOpen}>
      <button
        type="button"
        className="calendar-backdrop"
        onClick={onClose}
        aria-label="Kalender schließen"
      />
      <section className="calendar-modal" aria-label="Wochenkalender">
        <header className="calendar-modal-head">
          <div>
            <h3>Wochenplan Elektrotechnik</h3>
            <p>Dummy-Daten, nur UI-Vorschau</p>
          </div>
          <button type="button" onClick={onClose}>
            Schließen
          </button>
        </header>

        <div className="calendar-week-grid">
          {WEEK_DAYS.map((day) => (
            <article key={day} className="calendar-day-col">
              <h4>{day}</h4>
              <div className="calendar-day-list">
                {WEEK_CALENDAR[day].map((entry) => (
                  <div key={`${day}-${entry.time}-${entry.module}`} className="calendar-day-entry">
                    <span>{entry.time}</span>
                    <strong>{entry.module}</strong>
                    <small>{entry.room}</small>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
