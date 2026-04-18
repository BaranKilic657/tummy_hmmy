"use client";

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { CalendarModal } from "../components/home/CalendarModal";
import { TopBar } from "../components/home/TopBar";
import { getTodayWeekDay, WEEK_CALENDAR } from "../components/home/data/calendarData";
import { AutomationsTile } from "../components/home/tiles/AutomationsTile";
import { CalendarTile } from "../components/home/tiles/CalendarTile";
import { CopilotTile } from "../components/home/tiles/CopilotTile";
import { MensaTile } from "../components/home/tiles/MensaTile";
import { MoodleTile } from "../components/home/tiles/MoodleTile";
import { TumOnlineTile } from "../components/home/tiles/TumOnlineTile";

type DashboardTileId = "copilot" | "calendar" | "moodle" | "tumonline" | "mensa";

type TileSpec = {
  id: DashboardTileId;
  weight: number;
};

const TILE_SPECS: TileSpec[] = [
  { id: "moodle", weight: 2 },
  { id: "calendar", weight: 3 },
  { id: "mensa", weight: 2 },
  { id: "tumonline", weight: 1 },
];

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

  const renderDashboardTile = (tileId: DashboardTileId): ReactNode => {
    switch (tileId) {
      case "copilot":
        return <CopilotTile />;
      case "calendar":
        return (
          <CalendarTile
            todayLabel={todayLabel}
            todayEntries={todayEntries}
            onOpenWeekView={() => setIsCalendarOpen(true)}
          />
        );
      case "moodle":
        return <MoodleTile />;
      case "tumonline":
        return <TumOnlineTile />;
      case "mensa":
        return <MensaTile />;
      default:
        return null;
    }
  };

  const balancedColumns = useMemo(() => {
    const columns: TileSpec[][] = [[{ id: "copilot", weight: 1 }], []];
    const heights = [1, 0];

    for (const spec of TILE_SPECS) {
      const targetColumnIndex = heights[0] <= heights[1] ? 0 : 1;
      columns[targetColumnIndex].push(spec);
      heights[targetColumnIndex] += spec.weight;
    }

    return columns;
  }, []);

  return (
    <main className="screen home-screen">
      <section className="home-shell">
        <TopBar />

        <section className="home-columns" aria-label="Dashboard widgets">
          {balancedColumns.map((column, columnIndex) => (
            <div key={`column-${columnIndex}`} className="home-col">
              {column.map((tile) => (
                <Fragment key={tile.id}>{renderDashboardTile(tile.id)}</Fragment>
              ))}
            </div>
          ))}
        </section>

        <section className="home-grid" aria-label="Automation widgets">
          <AutomationsTile />
        </section>
      </section>

      <CalendarModal isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} />
    </main>
  );
}
