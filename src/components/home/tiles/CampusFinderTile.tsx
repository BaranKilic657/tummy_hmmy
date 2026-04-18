"use client";

import { FormEvent, useEffect, useState } from "react";

import type {
  PublicNavigatumLocationPayload,
  PublicNavigatumSearchEntry,
  PublicNavigatumSearchPayload,
} from "@/lib/public-campus-types";

export function CampusFinderTile() {
  const [query, setQuery] = useState("garching");
  const [results, setResults] = useState<PublicNavigatumSearchEntry[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<PublicNavigatumLocationPayload | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void runSearch("garching");
  }, []);

  async function runSearch(searchQuery: string) {
    const normalizedQuery = searchQuery.trim();

    if (!normalizedQuery) {
      setResults([]);
      setSelectedLocation(null);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/public/navigatum/search?q=${encodeURIComponent(normalizedQuery)}&limit=5`,
      );
      const payload = (await response.json()) as PublicNavigatumSearchPayload | ApiErrorPayload;

      if (!response.ok) {
        throw new Error(getApiErrorMessage(payload, "Search failed."));
      }

      const nextResults = flattenSearchResults(payload as PublicNavigatumSearchPayload);
      setResults(nextResults);

      if (nextResults[0]) {
        await loadLocation(nextResults[0].id);
      } else {
        setSelectedLocation(null);
      }
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Search failed.");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadLocation(id: string) {
    const response = await fetch(`/api/public/navigatum/locations/${encodeURIComponent(id)}`);
    const payload = (await response.json()) as PublicNavigatumLocationPayload | ApiErrorPayload;

    if (!response.ok) {
      throw new Error(getApiErrorMessage(payload, "Location could not be loaded."));
    }

    setSelectedLocation(payload as PublicNavigatumLocationPayload);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runSearch(query);
  }

  return (
    <article className="widget widget-campus-finder">
      <h2>Campus Finder</h2>
      <p>Live search via NavigaTUM for buildings, rooms, and campus places.</p>

      <form className="navigator-form" onSubmit={onSubmit}>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="e.g. garching, mi, audimax"
          aria-label="Campus search"
        />
        <button type="submit" aria-label="Start search">
          →
        </button>
      </form>

      {isLoading ? <p className="widget-state">Loading NavigaTUM...</p> : null}
      {error ? <p className="widget-error">{error}</p> : null}

      {results.length > 0 ? (
        <div className="navigator-results" aria-label="NavigaTUM results">
          {results.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="navigator-result"
              onClick={() => {
                void loadLocation(entry.id).catch((loadError) => {
                  setError(
                    loadError instanceof Error ? loadError.message : "Location could not be loaded.",
                  );
                });
              }}
            >
              <strong>{entry.name}</strong>
              <small>{entry.subtext ?? entry.type}</small>
            </button>
          ))}
        </div>
      ) : null}

      {selectedLocation ? (
        <div className="navigator-detail">
          <strong>{selectedLocation.name}</strong>
          <p>
            {selectedLocation.typeCommonName ?? selectedLocation.type}
            {selectedLocation.address ? ` · ${selectedLocation.address}` : ""}
          </p>
          {selectedLocation.parents.length > 0 ? (
            <span className="widget-chip">{selectedLocation.parents.join(" · ")}</span>
          ) : null}
          {selectedLocation.redirectUrl ? (
            <a
              href={selectedLocation.redirectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="navigator-link"
            >
              Open in NavigaTUM
            </a>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function flattenSearchResults(payload: PublicNavigatumSearchPayload) {
  return payload.sections.flatMap((section) => section.entries).slice(0, 5);
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
