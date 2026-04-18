import { getTodayDayName, WEEK_DAYS, type WeekDay } from "./calendarData";

export type MensaTag = "vegan" | "vegetarisch" | "schwein" | "gluten" | "laktose" | "nuesse";
export type MensaLocation = "Cafeteria Arcisstrasse" | "Cafeteria Leopoldstrasse" | "Cafeteria Garching";

export type MensaDish = {
  name: string;
  tags: MensaTag[];
};

type MensaMenu = Record<WeekDay, MensaDish[]>;

const MENSA_LOCATIONS: MensaLocation[] = [
  "Cafeteria Arcisstrasse",
  "Cafeteria Leopoldstrasse",
  "Cafeteria Garching",
];

const NEAREST_MENSA: MensaLocation = "Cafeteria Arcisstrasse";

const ARCIS_MENU: MensaMenu = {
  Monday: [
    { name: "Spinach and cheese lasagna with tomato sauce", tags: ["vegetarisch", "gluten", "laktose"] },
    { name: "Roast pork with bread dumplings", tags: ["schwein", "gluten"] },
    { name: "Lentil salad with grilled vegetables", tags: ["vegan"] },
  ],
  Tuesday: [
    { name: "Penne arrabbiata with arugula", tags: ["vegan", "gluten"] },
    { name: "Beef goulash with bread dumplings", tags: ["gluten"] },
    { name: "Falafel bowl with tahini dressing", tags: ["vegan", "nuesse"] },
  ],
  Wednesday: [
    { name: "Mushroom cream ragout with mashed potatoes", tags: ["vegetarisch", "laktose"] },
    { name: "Pan-seared salmon with lemon potatoes", tags: [] },
    { name: "Teriyaki tofu with wok vegetables", tags: ["vegan", "gluten"] },
  ],
  Thursday: [
    { name: "Potato gratin with broccoli", tags: ["vegetarisch", "laktose"] },
    { name: "Turkey steak with paprika rice", tags: [] },
    { name: "Couscous bowl with chickpeas", tags: ["vegan", "gluten"] },
  ],
  Friday: [
    { name: "Vegetable dumplings with caramelized onions", tags: ["vegetarisch", "gluten", "laktose"] },
    { name: "Fish and chips with remoulade", tags: ["gluten", "laktose"] },
    { name: "Veggie burger with roasted potatoes", tags: ["vegetarisch", "gluten"] },
  ],
};

const LEOPOLD_MENU: MensaMenu = {
  Monday: [
    { name: "Chickpea curry with rice", tags: ["vegan"] },
    { name: "Ham pasta in cheese sauce", tags: ["schwein", "gluten", "laktose"] },
    { name: "Roasted vegetables with hummus", tags: ["vegan", "nuesse"] },
  ],
  Tuesday: [
    { name: "Tofu wrap with herb salad", tags: ["vegan", "gluten"] },
    { name: "Beef lasagna", tags: ["gluten", "laktose"] },
    { name: "Potato goulash", tags: ["vegan"] },
  ],
  Wednesday: [
    { name: "Veggie chili sin carne", tags: ["vegan"] },
    { name: "Breaded pork schnitzel", tags: ["schwein", "gluten"] },
    { name: "Cheese spaetzle", tags: ["vegetarisch", "gluten", "laktose"] },
  ],
  Thursday: [
    { name: "Falafel plate with bulgur", tags: ["vegan", "gluten"] },
    { name: "Chicken breast with mashed potatoes", tags: ["laktose"] },
    { name: "Gnocchi al pomodoro", tags: ["vegetarisch", "gluten"] },
  ],
  Friday: [
    { name: "Vegan sushi bowl", tags: ["vegan"] },
    { name: "Leberkaese with pretzel", tags: ["schwein", "gluten"] },
    { name: "Spinach strudel with yogurt dip", tags: ["vegetarisch", "gluten", "laktose"] },
  ],
};

const GARCHING_MENU: MensaMenu = {
  Monday: [
    { name: "Lentil bolognese with fusilli", tags: ["vegan", "gluten"] },
    { name: "Turkey cream strips", tags: ["laktose"] },
    { name: "Vegetable stir-fry with peanut sauce", tags: ["vegan", "nuesse"] },
  ],
  Tuesday: [
    { name: "Veggie moussaka", tags: ["vegetarisch", "laktose"] },
    { name: "Pork fillet with pepper sauce", tags: ["schwein", "laktose"] },
    { name: "Soba noodles with tofu", tags: ["vegan", "gluten"] },
  ],
  Wednesday: [
    { name: "Tomato risotto with arugula", tags: ["vegetarisch", "laktose"] },
    { name: "Salmon fillet with vegetable rice", tags: [] },
    { name: "Bean burrito", tags: ["vegan", "gluten"] },
  ],
  Thursday: [
    { name: "Vegetable coconut curry", tags: ["vegan"] },
    { name: "Beef patty with potatoes", tags: ["gluten"] },
    { name: "Spinach ricotta cannelloni", tags: ["vegetarisch", "gluten", "laktose"] },
  ],
  Friday: [
    { name: "Vegan Thai vegetables", tags: ["vegan"] },
    { name: "Sausage with sauerkraut", tags: ["schwein"] },
    { name: "Bread dumplings with mushroom cream", tags: ["vegetarisch", "gluten", "laktose"] },
  ],
};

const MENSA_MENU_BY_LOCATION: Record<MensaLocation, MensaMenu> = {
  "Cafeteria Arcisstrasse": ARCIS_MENU,
  "Cafeteria Leopoldstrasse": LEOPOLD_MENU,
  "Cafeteria Garching": GARCHING_MENU,
};

export function getMensaLocations(): MensaLocation[] {
  return MENSA_LOCATIONS;
}

export function getNearestMensa(): MensaLocation {
  return NEAREST_MENSA;
}

export function getWeekMensaMenu(location: MensaLocation = NEAREST_MENSA): MensaMenu {
  return MENSA_MENU_BY_LOCATION[location];
}

export function getTodayMensaMenu(location: MensaLocation = NEAREST_MENSA, date = new Date()) {
  const dayName = getTodayDayName(date);
  const weekday = WEEK_DAYS.includes(dayName as WeekDay) ? (dayName as WeekDay) : null;
  return {
    dayName,
    mensa: location,
    dishes: weekday ? MENSA_MENU_BY_LOCATION[location][weekday] : [],
  };
}
