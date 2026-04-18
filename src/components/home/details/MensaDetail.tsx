"use client";

import { useMemo, useState } from "react";
import { WEEK_DAYS } from "../data/calendarData";
import {
  getMensaLocations,
  getNearestMensa,
  getWeekMensaMenu,
  type MensaLocation,
  type MensaTag,
} from "../data/mensaData";

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

export function MensaDetail() {
  const mensaLocations = useMemo(() => getMensaLocations(), []);
  const nearestMensa = useMemo(() => getNearestMensa(), []);
  const [selectedMensa, setSelectedMensa] = useState<MensaLocation>(nearestMensa);

  const weekMenu = useMemo(() => getWeekMensaMenu(selectedMensa), [selectedMensa]);

  return (
    <section className="mensa-detail">
      <div className="mensa-detail-top">
        <p className="detail-subtitle">Weekly menu</p>
        <label className="mensa-select-wrap">
          <span>Cafeteria</span>
          <select
            value={selectedMensa}
            onChange={(event) => setSelectedMensa(event.target.value as MensaLocation)}
            aria-label="Select cafeteria"
          >
            {mensaLocations.map((location) => (
              <option key={location} value={location}>
                {location}
                {location === nearestMensa ? " 📍" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mensa-week-grid">
        {WEEK_DAYS.map((day) => (
          <article key={`${selectedMensa}-${day}`} className="mensa-day-col">
            <h4>{day}</h4>
            <ul className="mensa-week-list" aria-label={`Cafeteria ${day}`}>
              {weekMenu[day].map((dish) => (
                <li key={`${day}-${dish.name}`} className="mensa-item mensa-item-week">
                  <span>{dish.name}</span>
                  <span className="mensa-tags" aria-label="Dietary tags">
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
        ))}
      </div>
    </section>
  );
}
