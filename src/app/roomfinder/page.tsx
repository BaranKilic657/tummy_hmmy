"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import type { PublicNavigatumSearchPayload } from "@/lib/public-campus-types";

type ApiErrorPayload = {
  error?: string;
};

export const dynamic = "force-dynamic";

export default function RoomFinderPage() {
  const searchParams = useSearchParams();
  const initialRoomQuery = (searchParams.get("room") ?? "").trim();

  const [query, setQuery] = useState(initialRoomQuery);
  const [results, setResults] = useState<PublicNavigatumSearchPayload | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setQuery(initialRoomQuery);
  }, [initialRoomQuery]);

  useEffect(() => {
    const normalized = query.trim();
    if (!normalized) {
      setResults(null);
      setError("");
      return;
    }

    const controller = new AbortController();

    async function runSearch() {
      try {
        setIsLoading(true);
        setError("");

        const response = await fetch(
          `/api/public/navigatum/search?q=${encodeURIComponent(normalized)}&limit=10`,
          { signal: controller.signal },
        );

        const payload = (await response.json()) as PublicNavigatumSearchPayload | ApiErrorPayload;

        if (!response.ok) {
          throw new Error(getApiErrorMessage(payload, "Unable to search room data."));
        }

        setResults(payload as PublicNavigatumSearchPayload);
      } catch (searchError) {
        if (controller.signal.aborted) {
          return;
        }

        setError(searchError instanceof Error ? searchError.message : "Unable to search room data.");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void runSearch();
    return () => controller.abort();
  }, [query]);

  const flattenedEntries = useMemo(() => {
    if (!results) {
      return [];
    }

    const needle = query.trim().toLowerCase();

    return results.sections
      .flatMap((section) =>
        section.entries.map((entry) => ({
          ...entry,
          facet: section.facet,
        })),
      )
      .sort((a, b) => {
        const aMatch = `${a.name} ${a.subtext ?? ""}`.toLowerCase().includes(needle);
        const bMatch = `${b.name} ${b.subtext ?? ""}`.toLowerCase().includes(needle);

        if (aMatch === bMatch) {
          return 0;
        }

        return aMatch ? -1 : 1;
      });
  }, [results, query]);

  return (
    <main className="screen roomfinder-screen">
      <section className="roomfinder-card">
        <h1>Room Finder</h1>
        <p>Search TUM rooms and jump to NavigaTUM.</p>

        <div className="roomfinder-query" role="search">
          <label htmlFor="roomfinder-query">Room</label>
          <input
            id="roomfinder-query"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. MW 2001"
          />
        </div>

        {isLoading ? <p className="widget-state">Searching room data...</p> : null}
        {error ? <p className="widget-error">{error}</p> : null}

        {!isLoading && !error && query.trim().length === 0 ? (
          <p className="widget-state">Enter a room code to start searching.</p>
        ) : null}

        {!isLoading && !error && query.trim().length > 0 && flattenedEntries.length === 0 ? (
          <p className="widget-state">No matching rooms found.</p>
        ) : null}

        {flattenedEntries.length > 0 ? (
          <ul className="room-list" aria-label="Room finder results">
            {flattenedEntries.map((entry) => {
              const isExactHit = `${entry.name} ${entry.subtext ?? ""}`
                .toLowerCase()
                .includes(query.trim().toLowerCase());

              return (
                <li key={`${entry.facet}-${entry.id}`} className={`room-item ${isExactHit ? "room-item-hit" : ""}`}>
                  <div className="room-copy">
                    <strong>{entry.name}</strong>
                    <small>{entry.subtext ?? entry.facet}</small>
                  </div>
                  <a
                    href={`https://nav.tum.de/search?q=${encodeURIComponent(entry.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="room-link"
                  >
                    Open map
                  </a>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>
    </main>
  );
}

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
