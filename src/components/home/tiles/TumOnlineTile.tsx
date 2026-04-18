"use client";

import { useEffect, useState } from "react";

import type { PublicTumRoomsPayload } from "@/lib/public-campus-types";

export function TumOnlineTile() {
  const [rooms, setRooms] = useState<PublicTumRoomsPayload | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRooms() {
      try {
        setIsLoading(true);
        setError("");
        const response = await fetch("/api/public/tum/rooms?campusId=2&limit=4", {
          signal: controller.signal,
        });
        const payload = (await response.json()) as PublicTumRoomsPayload | ApiErrorPayload;

        if (!response.ok) {
          throw new Error(getApiErrorMessage(payload, "TUM-Raumdaten konnten nicht geladen werden."));
        }

        setRooms(payload as PublicTumRoomsPayload);
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }

        setError(
          loadError instanceof Error ? loadError.message : "TUM-Raumdaten konnten nicht geladen werden.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadRooms();

    return () => controller.abort();
  }, []);

  return (
    <article className="widget">
      <h2>TUMonline</h2>
<<<<<<< HEAD
      <p>
        {rooms
          ? `Öffentliche Raumdaten für ${rooms.campusName}`
          : "Öffentliche Hörsaal- und Raumdaten aus dem NAT API"}
      </p>

      {isLoading ? <p className="widget-state">Raumliste wird geladen...</p> : null}
      {error ? <p className="widget-error">{error}</p> : null}

      {rooms ? (
        <>
          <ul className="room-list" aria-label="Öffentliche Raumdaten">
            {rooms.rooms.map((room) => (
              <li key={room.roomId} className="room-item">
                <div className="room-copy">
                  <strong>{room.shortName ?? room.code}</strong>
                  <small>
                    {room.purpose}
                    {room.seats ? ` · ${room.seats} Plätze` : ""}
                  </small>
                </div>
                {room.navUrl ? (
                  <a
                    href={room.navUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="room-link"
                  >
                    Karte
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
          <span className="widget-chip">{rooms.totalCount} öffentliche Lehr-Räume</span>
        </>
      ) : null}
=======
      <p>Enrollment, grades status, and study information.</p>
>>>>>>> fa1b31f68acf4be888a262e17695f542f304ab16
    </article>
  );
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
