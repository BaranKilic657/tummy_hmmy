"use client";

import { useEffect, useState } from "react";

import type { PublicMensaPayload } from "@/lib/public-campus-types";

const LABEL_BADGES: Array<{ match: string; emoji: string; label: string }> = [
  { match: "VEGAN", emoji: "🌱", label: "vegan" },
  { match: "VEGETARIAN", emoji: "🥕", label: "vegetarisch" },
  { match: "PORK", emoji: "🐷", label: "Schwein" },
  { match: "BEEF", emoji: "🐄", label: "Rind" },
  { match: "FISH", emoji: "🐟", label: "Fisch" },
  { match: "GLUTEN", emoji: "🌾", label: "Gluten" },
  { match: "LACTOSE", emoji: "🥛", label: "Laktose" },
];

export function MensaTile() {
  const [menu, setMenu] = useState<PublicMensaPayload | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadMenu() {
      try {
        setIsLoading(true);
        setError("");
        const response = await fetch("/api/public/mensa?canteenId=mensa-garching", {
          signal: controller.signal,
        });
        const payload = (await response.json()) as PublicMensaPayload | ApiErrorPayload;

        if (!response.ok) {
          throw new Error(getApiErrorMessage(payload, "Mensa konnte nicht geladen werden."));
        }

        setMenu(payload as PublicMensaPayload);
      } catch (loadError) {
        if (controller.signal.aborted) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Mensa konnte nicht geladen werden.");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadMenu();

    return () => controller.abort();
  }, []);

  return (
    <article className="widget widget-mensa">
      <h2>Mensa</h2>
      <p>
        {menu ? `${menu.canteen.name} · ${menu.isToday ? "heute" : "nächster Ausgabetag"} (${menu.serviceLabel})` : "Live-Menü aus der Public API"}
      </p>

      {isLoading ? <p className="widget-state">Menü wird geladen...</p> : null}
      {error ? <p className="widget-error">{error}</p> : null}

      {menu ? (
        <>
          <ul className="mensa-list" aria-label="Heutige Mensagerichte">
            {menu.dishes.slice(0, 4).map((dish) => (
              <li key={`${menu.serviceDate}-${dish.name}`} className="mensa-item">
                <div className="mensa-copy">
                  <strong>{dish.name}</strong>
                  <small>
                    {dish.category}
                    {dish.studentPrice ? ` · ${dish.studentPrice}` : ""}
                  </small>
                </div>
                <span className="mensa-tags" aria-label="Kennzeichnungen">
                  {getDishBadges(dish.labels).map((badge) => (
                    <span key={`${dish.name}-${badge.label}`} title={badge.label} aria-label={badge.label}>
                      {badge.emoji}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
          <span className="widget-chip">
            {menu.source === "eat-api" ? "TUM-Dev Eat API" : "OpenMensa Fallback"}
          </span>
        </>
      ) : null}
    </article>
  );
}

function getDishBadges(labels: string[]) {
  return LABEL_BADGES.filter((badge) => labels.includes(badge.match)).slice(0, 3);
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
