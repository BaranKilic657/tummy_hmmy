"use client";

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
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
import { AUTH_ACCOUNT_TYPE_KEY, AUTH_LOGIN_KEY, type AccountType } from "../lib/auth-session";

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

const GUEST_ALLOWED_TILES: DashboardTileId[] = ["copilot", "campusfinder", "mensa", "transit"];

export default function HomePage() {
  const [isAuthResolved, setIsAuthResolved] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("member");
  const [activeTile, setActiveTile] = useState<DashboardTileId | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncAuthState = () => {
      const loggedIn = sessionStorage.getItem(AUTH_LOGIN_KEY) === "true";
      const mode = sessionStorage.getItem(AUTH_ACCOUNT_TYPE_KEY) === "guest" ? "guest" : "member";
      setIsLoggedIn(loggedIn);
      setAccountType(mode);
      setIsAuthResolved(true);
    };

    syncAuthState();
    window.addEventListener("auth-state-changed", syncAuthState);

    return () => {
      window.removeEventListener("auth-state-changed", syncAuthState);
    };
  }, []);

  const todayCalendar = useMemo(() => getTodayCalendarData(), []);
  const isGuest = accountType === "guest";
  const isTileVisible = (tileId: DashboardTileId) => !isGuest || GUEST_ALLOWED_TILES.includes(tileId);
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

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    if (activeTile) {
      document.body.classList.add("home-focus-open");
      return () => {
        document.body.classList.remove("home-focus-open");
      };
    }

    document.body.classList.remove("home-focus-open");
    return () => {
      document.body.classList.remove("home-focus-open");
    };
  }, [activeTile]);

  useEffect(() => {
    if (!activeTile) {
      return;
    }

    if (!isTileVisible(activeTile)) {
      setActiveTile(null);
    }
  }, [activeTile, accountType]);

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

    for (const spec of TILE_SPECS.filter(
      (tile) =>
        tile.id !== "copilot" &&
        tile.id !== "calendar" &&
        tile.id !== "moodle" &&
        tile.id !== "transit" &&
        isTileVisible(tile.id),
    )) {
      const targetColumnIndex = heights[0] <= heights[1] ? 0 : 1;
      columns[targetColumnIndex].push(spec);
      heights[targetColumnIndex] += spec.weight;
    }

    return columns;
  }, []);

  const loginAsGuest = () => {
    if (typeof window === "undefined") {
      return;
    }

    sessionStorage.setItem(AUTH_LOGIN_KEY, "true");
    sessionStorage.setItem(AUTH_ACCOUNT_TYPE_KEY, "guest");
    window.dispatchEvent(new Event("auth-state-changed"));
    setIsLoggedIn(true);
    setAccountType("guest");
    setIsAuthResolved(true);
  };

  if (!isAuthResolved) {
    return (
      <main className="screen auth-gate-screen" aria-live="polite" aria-busy="true">
        <section className="auth-gate-shell auth-gate-loading">
          <p>Preparing your campus cockpit...</p>
        </section>
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="screen auth-gate-screen">
        <section className="auth-gate-shell" aria-labelledby="auth-gate-title">
          <p className="auth-gate-tag">TUMmy x HMmy</p>
          <h1 id="auth-gate-title">Your daily university workflow, one command away.</h1>
          <p className="auth-gate-subtitle">
            Check Moodle updates, find rooms, read cafeteria menus, and ask the campus copilot from one
            place. Sign in once with your TUM credentials to unlock the dashboard.
          </p>

          <div className="auth-gate-actions">
            <Link href="/login" className="auth-gate-primary-btn">
              Login with TUM ID
            </Link>
            <button type="button" className="auth-gate-secondary-btn" onClick={loginAsGuest}>
              Continue as Guest
            </button>
          </div>

          <section className="auth-gate-highlights" aria-label="Campus Autopilot highlights">
            <article>
              <h2>Built for TUM students</h2>
              <p>Purpose-built widgets for transport, rooms, cafeteria, calendar, and AI-powered help.</p>
            </article>
            <article>
              <h2>Grounded answers</h2>
              <p>Copilot responses blend campus context and retrieval so you can trust what you read.</p>
            </article>
            <article>
              <h2>Fast every morning</h2>
              <p>One clean dashboard instead of jumping between five tabs before your first lecture.</p>
            </article>
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className="screen home-screen">
      <section className="home-shell">
        <TopBar title={topTitle} accountType={accountType} />
        {isGuest ? (
          <p className="guest-dashboard-banner">
            Guest mode: You are viewing a limited demo dashboard with dummy data and restricted features.
          </p>
        ) : null}

        <section className="home-columns" aria-label="Dashboard widgets">
          <div className="home-col">
            {isTileVisible("copilot") ? (
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
            ) : null}

            {isTileVisible("calendar") ? (
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
            ) : null}

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
            {(["moodle", "transit"] as const)
              .filter((tileId) => isTileVisible(tileId))
              .map((tileId) => (
              <Fragment key={tileId}>
                <div
                  className={`tile-click-target tile-${tileId}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveTile(tileId)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setActiveTile(tileId);
                    }
                  }}
                  aria-label={`Open ${TILE_TITLES[tileId]}`}
                >
                  {renderDashboardTile(tileId)}
                </div>
              </Fragment>
            ))}

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

        {isTileVisible("automations") ? (
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
        ) : null}
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
