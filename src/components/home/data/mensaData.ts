import { getTodayWeekDay, type WeekDay } from "./calendarData";

export type MensaTag = "vegan" | "vegetarisch" | "schwein" | "gluten" | "laktose" | "nuesse";

export type MensaDish = {
  name: string;
  tags: MensaTag[];
};

type MensaMenu = Record<WeekDay, MensaDish[]>;

const MENSA_MENU: MensaMenu = {
  Montag: [
    { name: "Spinat-Kaese-Lasagne mit Tomatensauce", tags: ["vegetarisch", "gluten", "laktose"] },
    { name: "Schweinebraten mit Semmelknoedeln", tags: ["schwein", "gluten"] },
    { name: "Linsensalat mit Grillgemuese", tags: ["vegan"] },
  ],
  Dienstag: [
    { name: "Penne Arrabbiata mit Rucola", tags: ["vegan", "gluten"] },
    { name: "Rindergulasch mit Semmelknoedeln", tags: ["gluten"] },
    { name: "Falafel Bowl mit Tahini-Dressing", tags: ["vegan", "nuesse"] },
  ],
  Mittwoch: [
    { name: "Pilzrahmragout mit Kartoffelpueree", tags: ["vegetarisch", "laktose"] },
    { name: "Gebratener Lachs mit Zitronenkartoffeln", tags: [] },
    { name: "Tofu Teriyaki mit Wokgemuese", tags: ["vegan", "gluten"] },
  ],
  Donnerstag: [
    { name: "Kartoffelgratin mit Brokkoli", tags: ["vegetarisch", "laktose"] },
    { name: "Putensteak mit Paprika-Reis", tags: [] },
    { name: "Couscous Bowl mit Kichererbsen", tags: ["vegan", "gluten"] },
  ],
  Freitag: [
    { name: "Gemuese-Maultaschen mit Zwiebelschmelze", tags: ["vegetarisch", "gluten", "laktose"] },
    { name: "Fish & Chips mit Remoulade", tags: ["gluten", "laktose"] },
    { name: "Veggie-Burger mit Ofenkartoffeln", tags: ["vegetarisch", "gluten"] },
  ],
};

export function getTodayMensaMenu(date = new Date()) {
  const weekday = getTodayWeekDay(date);
  return {
    weekday,
    dishes: MENSA_MENU[weekday],
  };
}
