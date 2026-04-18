import "server-only";

import { getTodayCalendarData, WEEK_CALENDAR } from "@/components/home/data/calendarData";
import { MOODLE_COURSES, MOODLE_DEADLINES, MOODLE_UPDATES } from "@/components/home/data/moodleData";
import { searchPublicNavigatum } from "@/server/public-campus/navigatum";
import { getPublicMensaMenu } from "@/server/public-campus/mensa";
import { getGarchingForschungszentrumTransit } from "@/server/public-campus/transit";
import { getPublicTumRooms } from "@/server/public-campus/tum-nat";

type ContextCalendarEvent = {
  day: string;
  time: string;
  module: string;
  room: string;
};

export async function buildDashboardContext(customCalendarEvents: ContextCalendarEvent[] = []) {
  const todayCalendar = getTodayCalendarData();

  const [mensa, transit, tumRooms, campusSearch] = await Promise.all([
    getPublicMensaMenu({ canteenId: "mensa-garching" }).catch(() => null),
    getGarchingForschungszentrumTransit({ limit: 3 }).catch(() => null),
    getPublicTumRooms({ campusId: 2, limit: 3 }).catch(() => null),
    searchPublicNavigatum({ query: "garching", limit: 3 }).catch(() => null),
  ]);

  const lines: string[] = [
    "Runtime dashboard snapshot (current request):",
    "",
    "Calendar tile:",
    `- Today label: ${todayCalendar.dayName}`,
    `- Preview day: ${todayCalendar.previewDay}${todayCalendar.previewHint ? ` (${todayCalendar.previewHint})` : ""}`,
    ...todayCalendar.entries.map((entry) => `- ${entry.time} | ${entry.module} | room ${entry.room}`),
    "",
    "Calendar week overview:",
    ...Object.entries(WEEK_CALENDAR).map(([day, entries]) => {
      const preview = entries
        .slice(0, 2)
        .map((entry) => `${entry.time} ${entry.module}`)
        .join(" ; ");
      return `- ${day}: ${preview}`;
    }),
    "",
    "Moodle tile:",
    `- Courses (${MOODLE_COURSES.length}): ${MOODLE_COURSES.join(", ")}`,
    ...MOODLE_DEADLINES.map((deadline) => `- Deadline: ${deadline.title} (Due ${deadline.due})`),
    ...MOODLE_UPDATES.map((update) => `- Update: ${update}`),
    "",
    "Automation tile:",
    "- Time based, Location based, Moodle event based, Custom",
  ];

  lines.push("", "Custom calendar events created by user:");
  if (customCalendarEvents.length === 0) {
    lines.push("- none");
  } else {
    lines.push(
      ...customCalendarEvents.slice(0, 20).map(
        (event) => `- ${event.day} | ${event.time} | ${event.module} | room ${event.room}`,
      ),
    );
  }

  if (mensa) {
    lines.push(
      "",
      "Mensa tile:",
      `- Canteen: ${mensa.canteen.name}`,
      `- Service day: ${mensa.serviceLabel}${mensa.isToday ? " (today)" : ""}`,
      ...mensa.dishes.slice(0, 4).map((dish) => `- ${dish.name} | ${dish.category}${dish.studentPrice ? ` | ${dish.studentPrice}` : ""}`),
    );
  } else {
    lines.push("", "Mensa tile:", "- Live mensa data unavailable right now.");
  }

  if (transit) {
    lines.push(
      "",
      "Transit tile (MVG):",
      `- Station: ${transit.station.name} (${transit.station.globalId})`,
      ...transit.departures
        .slice(0, 3)
        .map((departure) => `- ${departure.line} to ${departure.destination} at ${departure.realtimeDepartureTime}`),
    );
  } else {
    lines.push("", "Transit tile (MVG):", "- Live transit data unavailable right now.");
  }

  if (tumRooms) {
    lines.push(
      "",
      "TUMonline tile:",
      `- Campus: ${tumRooms.campusName}`,
      ...tumRooms.rooms.map(
        (room) => `- ${room.shortName ?? room.code} | ${room.purpose}${room.seats ? ` | ${room.seats} seats` : ""}`,
      ),
    );
  } else {
    lines.push("", "TUMonline tile:", "- Live room data unavailable right now.");
  }

  if (campusSearch) {
    const topEntries = campusSearch.sections.flatMap((section) => section.entries).slice(0, 3);
    lines.push(
      "",
      "Campus Finder tile:",
      '- Default search query in UI: "garching"',
      ...topEntries.map((entry) => `- ${entry.name} | ${entry.type}${entry.subtext ? ` | ${entry.subtext}` : ""}`),
    );
  } else {
    lines.push("", "Campus Finder tile:", "- Live NavigaTUM search unavailable right now.");
  }

  return lines.join("\n");
}
