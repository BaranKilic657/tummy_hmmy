"use client";

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { CalendarDetail } from "../components/home/details/CalendarDetail";
import { CopilotDetail } from "../components/home/details/CopilotDetail";
import { MensaDetail } from "../components/home/details/MensaDetail";
import { MoodleDetail } from "../components/home/details/MoodleDetail";
import { TopBar } from "../components/home/TopBar";
import { getTodayCalendarData } from "../components/home/data/calendarData";
import { AutomationsTile } from "../components/home/tiles/AutomationsTile";
import { CampusFinderTile } from "../components/home/tiles/CampusFinderTile";
import { CalendarTile } from "../components/home/tiles/CalendarTile";
import { CopilotTile } from "../components/home/tiles/CopilotTile";
import { MensaTile } from "../components/home/tiles/MensaTile";
import { MoodleTile } from "../components/home/tiles/MoodleTile";
import { TransitTile } from "../components/home/tiles/TransitTile";
import { TumOnlineTile } from "../components/home/tiles/TumOnlineTile";

type DashboardTileId =
  | "copilot"
  | "campusfinder"
  | "calendar"
  | "moodle"
  | "tumonline"
  | "mensa"
  | "transit"
  | "automations";

type TileSpec = {
  id: DashboardTileId;
  weight: number;
};

const TILE_SPECS: TileSpec[] = [
  { id: "copilot", weight: 1 },
  { id: "campusfinder", weight: 2 },
  { id: "moodle", weight: 2 },
  { id: "calendar", weight: 3 },
  { id: "transit", weight: 2 },
  { id: "mensa", weight: 2 },
  { id: "tumonline", weight: 1 },
];

const TILE_TITLES: Record<DashboardTileId, string> = {
  copilot: "UNI Copilot",
  campusfinder: "Campus Finder",
  calendar: "Calendar",
  moodle: "Moodle",
  tumonline: "TUMonline",
  mensa: "Cafeteria",
  transit: "Garching U-Bahn",
  automations: "Automation",
};

export default function HomePage() {
  const [activeTile, setActiveTile] = useState<DashboardTileId | null>(null);

  const todayCalendar = useMemo(() => getTodayCalendarData(), []);
  const topTitle = activeTile ? TILE_TITLES[activeTile] : "Dashboard";

  useEffect(() => {
    if (!activeTile) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveTile(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTile]);

  const renderDashboardTile = (tileId: DashboardTileId): ReactNode => {
    switch (tileId) {
      case "copilot":
        return <CopilotTile />;
      case "campusfinder":
        return <CampusFinderTile />;
      case "calendar":
        return (
          <CalendarTile
            todayLabel={todayCalendar.dayName}
            previewDayLabel={todayCalendar.previewDay}
            previewHint={todayCalendar.previewHint}
            todayEntries={todayCalendar.entries}
            onOpenWeekView={() => setActiveTile("calendar")}
          />
        );
      case "moodle":
        return <MoodleTile />;
      case "tumonline":
        return <TumOnlineTile />;
      case "mensa":
        return <MensaTile />;
      case "transit":
        return <TransitTile />;
      case "automations":
        return <AutomationsTile />;
      default:
        return null;
    }
  };

  const renderFocusContent = (tileId: DashboardTileId): ReactNode => {
    if (tileId === "copilot") {
      return <CopilotDetail />;
    }
    if (tileId === "calendar") {
      return <CalendarDetail />;
    }
    if (tileId === "moodle") {
      return <MoodleDetail />;
    }
    if (tileId === "mensa") {
      return <MensaDetail />;
    }
    if (tileId === "transit") {
      return <TransitTile variant="detail" />;
    }
    return renderDashboardTile(tileId);
  };

  const balancedColumns = useMemo(() => {
    const columns: TileSpec[][] = [[], []];
    const heights = [0, 0];

    for (const spec of TILE_SPECS.filter((tile) => tile.id !== "copilot" && tile.id !== "calendar")) {
      const targetColumnIndex = heights[0] <= heights[1] ? 0 : 1;
      columns[targetColumnIndex].push(spec);
      heights[targetColumnIndex] += spec.weight;
    }

    return columns;
  }, []);

  return (
    <main className="screen home-screen">
      <section className="home-shell">
        <TopBar title={topTitle} />

        <section className="home-columns" aria-label="Dashboard widgets">
          <div className="home-col">
            <div
              className="tile-click-target tile-copilot"
              role="button"
              tabIndex={0}
              onClick={() => setActiveTile("copilot")}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setActiveTile("copilot");
                }
              }}
              aria-label={`Open ${TILE_TITLES.copilot}`}
            >
              {renderDashboardTile("copilot")}
            </div>

            <div
              className="tile-click-target tile-calendar"
              role="button"
              tabIndex={0}
              onClick={() => setActiveTile("calendar")}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setActiveTile("calendar");
                }
              }}
              aria-label={`Open ${TILE_TITLES.calendar}`}
            >
              {renderDashboardTile("calendar")}
            </div>

            {balancedColumns[0].map((tile) => (
              <Fragment key={tile.id}>
                <div
                  className={`tile-click-target tile-${tile.id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveTile(tile.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setActiveTile(tile.id);
                    }
                  }}
                  aria-label={`Open ${TILE_TITLES[tile.id]}`}
                >
                  {renderDashboardTile(tile.id)}
                </div>
              </Fragment>
            ))}
          </div>

          <div className="home-col">
            {balancedColumns[1].map((tile) => (
              <Fragment key={tile.id}>
                <div
                  className={`tile-click-target tile-${tile.id}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveTile(tile.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setActiveTile(tile.id);
                    }
                  }}
                  aria-label={`Open ${TILE_TITLES[tile.id]}`}
                >
                  {renderDashboardTile(tile.id)}
                </div>
              </Fragment>
            ))}
          </div>
        </section>

        <section className="home-grid" aria-label="Automation widgets">
          <div
            className="tile-click-target"
            role="button"
            tabIndex={0}
            onClick={() => setActiveTile("automations")}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setActiveTile("automations");
              }
            }}
            aria-label="Open Automation"
          >
            <AutomationsTile />
          </div>
        </section>
      </section>

      <div className={`focus-overlay ${activeTile ? "is-open" : ""}`} aria-hidden={!activeTile}>
        <button
          type="button"
          className="focus-backdrop"
          onClick={() => setActiveTile(null)}
          aria-label="Close detail view"
        />
        <section className="focus-modal" aria-label="Tile detail view">
          <header className="focus-head">
            <h3>{activeTile ? TILE_TITLES[activeTile] : "Dashboard"}</h3>
            <button type="button" onClick={() => setActiveTile(null)}>
              Close
            </button>
          </header>
          <div className="focus-body">{activeTile ? renderFocusContent(activeTile) : null}</div>
        </section>
      </div>
    </main>
  );
}
