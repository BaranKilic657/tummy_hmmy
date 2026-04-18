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
  vegetarisch: "vegetarisch",
  schwein: "enthält Schwein",
  gluten: "enthält Gluten",
  laktose: "enthält Laktose",
  nuesse: "enthält Nüsse",
};

export function MensaTile() {
  const { weekday, dishes } = useMemo(() => getTodayMensaMenu(), []);

  return (
    <article className="widget widget-mensa">
      <h2>Mensa</h2>
      <p>Heute ({weekday})</p>

      <ul className="mensa-list" aria-label="Heutige Mensagerichte">
        {dishes.map((dish) => (
          <li key={dish.name} className="mensa-item">
            <span>{dish.name}</span>
            <span className="mensa-tags" aria-label="Kennzeichnungen">
              {dish.tags.map((tag) => (
                <span key={`${dish.name}-${tag}`} title={TAG_LABELS[tag]} aria-label={TAG_LABELS[tag]}>
                  {TAG_EMOJIS[tag]}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
