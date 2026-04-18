"use client";

import { useEffect, useState } from "react";

import type { PublicTransitPayload } from "@/lib/public-campus-types";

type TransitTileProps = {
  variant?: "tile" | "detail";
  limit?: number;
};

export function TransitTile({ variant = "tile", limit }: TransitTileProps) {
  const [departures, setDepartures] = useState<PublicTransitPayload | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const requestLimit = limit ?? (variant === "detail" ? 8 : 4);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDepartures() {
      try {
        setIsLoading(true);
        setError("");
        const response = await fetch(
          `/api/public/transit/garching-forschungszentrum?limit=${requestLimit}`,
          { signal: controller.signal },
        );
        const payload = (await response.json()) as PublicTransitPayload | ApiErrorPayload;

        if (!response.ok) {
          throw new Error(getApiErrorMessage(payload, "MVG-Abfahrten konnten nicht geladen werden."));
        }

        setDepartures(payload as PublicTransitPayload);
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "MVG-Abfahrten konnten nicht geladen werden.");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadDepartures();

    return () => controller.abort();
  }, [requestLimit]);

  const body = (
    <>
      {variant === "tile" ? (
        <>
          <h2>Garching U-Bahn</h2>
          <p>
            {departures
              ? departures.departures[0]
                ? `${departures.station.name} · nächste ${departures.line.label} Richtung ${departures.departures[0].destination}`
                : `${departures.station.name} · derzeit keine ${departures.line.label}-Abfahrten`
              : "Live-Abfahrten aus der MVG API"}
          </p>
        </>
      ) : (
        <p className="detail-subtitle">
          Live departures for {departures?.station.name ?? "Garching, Forschungszentrum"} via the MVG API.
        </p>
      )}

      {isLoading ? <p className="widget-state">Abfahrten werden geladen...</p> : null}
      {error ? <p className="widget-error">{error}</p> : null}

      {departures ? (
        <>
          {departures.departures.length > 0 ? (
            <ul className="transit-list" aria-label="Nächste U-Bahn Abfahrten">
              {departures.departures.map((departure) => (
                <li
                  key={`${departure.line}-${departure.realtimeDepartureTime}-${departure.destination}`}
                  className="transit-item"
                >
                  <div className="transit-head">
                    <span className="line-pill">{departure.line}</span>
                    <div className="transit-copy">
                      <strong>{departure.destination}</strong>
                      <small>
                        {formatClock(departure.realtimeDepartureTime)}
                        {departure.platform ? ` · Gleis ${departure.platform}` : ""}
                        {departure.platformChanged ? " · Gleiswechsel" : ""}
                      </small>
                    </div>
                  </div>
                  <div className="transit-side">
                    <span className="transit-eta">{formatMinutes(departure.realtimeDepartureTime)}</span>
                    {departure.cancelled ? <small className="transit-alert">entfällt</small> : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="widget-state">Im Moment sind keine U6-Abfahrten verfügbar.</p>
          )}

          {departures.departures[0]?.messages[0] ? (
            <p className="transit-note">{departures.departures[0].messages[0]}</p>
          ) : null}

          <div className="detail-actions">
            <span className="widget-chip">MVG API · {departures.station.globalId}</span>
            <a
              href={departures.station.monitorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="detail-link"
            >
              Open official monitor
            </a>
          </div>
        </>
      ) : null}
    </>
  );

  if (variant === "detail") {
    return <section className="transit-detail">{body}</section>;
  }

  return <article className="widget widget-transit">{body}</article>;
}

function formatClock(isoString: string) {
  return new Intl.DateTimeFormat("de-DE", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  }).format(new Date(isoString));
}

function formatMinutes(isoString: string) {
  const difference = new Date(isoString).getTime() - Date.now();
  const minutes = Math.max(0, Math.round(difference / 60_000));

  if (minutes <= 1) {
    return "jetzt";
  }

  return `in ${minutes} min`;
}

type ApiErrorPayload = {
  error?: string;
};

function getApiErrorMessage(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
  ) {
    return payload.error;
  }

  return fallback;
}
