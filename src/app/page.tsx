"use client";

import { useEffect, useMemo, useState } from "react";

type CalendarEntry = {
  time: string;
  module: string;
  room: string;
};

const WEEK_DAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag"];

const WEEK_CALENDAR: Record<string, CalendarEntry[]> = {
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

export default function HomePage() {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const todayLabel = useMemo(() => {
    const dayIndex = new Date().getDay();
    const indexMap = [0, 0, 1, 2, 3, 4, 0];
    return WEEK_DAYS[indexMap[dayIndex]];
  }, []);

  const todayEntries = WEEK_CALENDAR[todayLabel];

  useEffect(() => {
    if (!isCalendarOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCalendarOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isCalendarOpen]);

  return (
    <main className="screen home-screen">
      <section className="home-shell">
        <header className="home-topbar">
          <div className="home-logo">TUMmy</div>

          <nav className="home-nav" aria-label="Main navigation">
            <span>Dashboard</span>
            <span>Widgets</span>
            <span>Campus</span>
          </nav>

          <div className="home-top-actions" aria-hidden="true">
            <div className="home-search-icon">⌕</div>
            <div className="home-avatar">TUM</div>
          </div>
        </header>

        <section className="home-columns" aria-label="Dashboard widgets">
          <div className="home-col">
            <article className="widget widget-copilot">
              <h2>UNI Copilot</h2>
              <p>Frag nach Fristen, Räumen, Aufgaben oder Lernplan.</p>
              <div className="copilot-input">
                <span>Frag deinen Copilot...</span>
                <button type="button" aria-label="Send">
                  →
                </button>
              </div>
            </article>

            <article className="widget widget-moodle">
              <h2>Moodle</h2>
              <p>Kursräume, Abgaben und neue Ankündigungen.</p>
            </article>
          </div>

          <div className="home-col">
            <article className="widget widget-calendar">
              <h2>Kalender</h2>
              <p>Heutiger Stundenplan ({todayLabel})</p>
              <button
                type="button"
                className="calendar-preview"
                onClick={() => setIsCalendarOpen(true)}
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

            <article className="widget">
              <h2>TUMonline</h2>
              <p>Anmeldung, Notenstatus und Studieninfos.</p>
            </article>
          </div>
        </section>

        <section className="home-grid" aria-label="Automation widgets">
          <article className="widget widget-wide">
            <h2>Automations</h2>
            <p>Vorgefertigte Trigger als GUI-Vorschau.</p>
            <div className="automation-grid" aria-label="Automation types">
              <div className="automation-tile">
                <h3>Time based</h3>
                <p>Starte Aktionen zu festen Zeiten oder Intervallen.</p>
              </div>
              <div className="automation-tile">
                <h3>Location based</h3>
                <p>Führe Workflows aus, sobald du am Campus ankommst.</p>
              </div>
              <div className="automation-tile">
                <h3>Moodle event based</h3>
                <p>Reagiere automatisch auf neue Aufgaben und Deadlines.</p>
              </div>
              <div className="automation-tile">
                <h3>Custom</h3>
                <p>Erstelle eigene Regeln mit Bedingungen und Aktionen.</p>
              </div>
            </div>
          </article>
        </section>
      </section>

      <div className={`calendar-overlay ${isCalendarOpen ? "is-open" : ""}`} aria-hidden={!isCalendarOpen}>
        <button
          type="button"
          className="calendar-backdrop"
          onClick={() => setIsCalendarOpen(false)}
          aria-label="Kalender schließen"
        />
        <section className="calendar-modal" aria-label="Wochenkalender">
          <header className="calendar-modal-head">
            <div>
              <h3>Wochenplan Elektrotechnik</h3>
              <p>Dummy-Daten, nur UI-Vorschau</p>
            </div>
            <button type="button" onClick={() => setIsCalendarOpen(false)}>
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
    </main>
  );
}
