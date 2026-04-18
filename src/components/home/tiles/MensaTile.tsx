"use client";

import { useMemo } from "react";
import { getTodayMensaMenu, type MensaTag } from "../data/mensaData";

const TAG_EMOJIS: Record<MensaTag, string> = {
  vegan: "🌱",
  vegetarisch: "🥕",
  schwein: "🐷",
  gluten: "🌾",
  laktose: "🥛",
  nuesse: "🥜",
};

const TAG_LABELS: Record<MensaTag, string> = {
  vegan: "vegan",
  vegetarisch: "vegetarian",
  schwein: "contains pork",
  gluten: "contains gluten",
  laktose: "contains lactose",
  nuesse: "contains nuts",
};

export function MensaTile() {
  const { dayName, dishes } = useMemo(() => getTodayMensaMenu(), []);

  return (
    <article className="widget widget-mensa">
      <h2>Cafeteria</h2>
      <p>Today ({dayName})</p>

      <ul className="mensa-list" aria-label="Today's cafeteria meals">
        {dishes.length > 0 ? (
          dishes.map((dish) => (
            <li key={dish.name} className="mensa-item">
              <span>{dish.name}</span>
              <span className="mensa-tags" aria-label="Dietary tags">
                {dish.tags.map((tag) => (
                  <span key={`${dish.name}-${tag}`} title={TAG_LABELS[tag]} aria-label={TAG_LABELS[tag]}>
                    {TAG_EMOJIS[tag]}
                  </span>
                ))}
              </span>
            </li>
          ))
        ) : (
          <li className="mensa-item">The cafeteria is closed on weekends.</li>
        )}
      </ul>
    </article>
  );
}
