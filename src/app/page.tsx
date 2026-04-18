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
