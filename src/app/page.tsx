"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarModal } from "../components/home/CalendarModal";
import { TopBar } from "../components/home/TopBar";
import { getTodayWeekDay, WEEK_CALENDAR } from "../components/home/data/calendarData";
import { AutomationsTile } from "../components/home/tiles/AutomationsTile";
import { CalendarTile } from "../components/home/tiles/CalendarTile";
import { CopilotTile } from "../components/home/tiles/CopilotTile";
import { MoodleTile } from "../components/home/tiles/MoodleTile";
import { TumOnlineTile } from "../components/home/tiles/TumOnlineTile";

export default function HomePage() {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const todayLabel = useMemo(() => getTodayWeekDay(), []);
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
    <main className="screen">
      <header className="header">
        <div className="logo-wrap">
          <div className="logo">Campus Autopilot</div>
          <p className="tagline">by TUMmy & HMmy</p>
        </div>
        <nav className="nav" aria-label="Main navigation">
          <a href="#">Overview</a>
          <a href="#">How It Works</a>
          <a href="/tictactoe">Tic-Tac-Toe</a>
          <a href="/login">Login</a>
        </nav>
      </header>

      <section className="hero">
        <p className="group">Student-first automation</p>
        <h1>Autonomous support for everyday campus life.</h1>
        <p>
          Campus Autopilot keeps an eye on opportunities, reminders, and next
          steps so students can focus on learning instead of tracking every task
          manually.
        </p>
        <div className="actions">
          <button type="button">Open Preview</button>
          <a href="/login" className="hero-login-btn">
            Login with TUM ID
          </a>
          <a href="#" className="text-link">
            See sample workflow
          </a>
        </div>
    <main className="screen home-screen">
      <section className="home-shell">
        <TopBar />

        <section className="home-columns" aria-label="Dashboard widgets">
          <div className="home-col">
            <CopilotTile />
            <MoodleTile />
          </div>

          <div className="home-col">
            <CalendarTile
              todayLabel={todayLabel}
              todayEntries={todayEntries}
              onOpenWeekView={() => setIsCalendarOpen(true)}
            />
            <TumOnlineTile />
          </div>
        </section>

        <section className="home-grid" aria-label="Automation widgets">
          <AutomationsTile />
        </section>
      </section>

      <CalendarModal isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} />
    </main>
  );
}
