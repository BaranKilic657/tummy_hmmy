"use client";

import { FormEvent, useState } from "react";
import { addCustomCalendarEntry, getCustomCalendarEntries, isWeekDay } from "@/lib/calendar-custom-events";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export function CopilotTile() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi, I can help with tasks, deadlines, rooms, and schedules." },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const latestAssistantMessage =
    [...messages].reverse().find((message) => message.role === "assistant")?.content ?? "";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();

    const text = input.trim();
    if (!text || isLoading) {
      return;
    }

    const nextMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          calendarEvents: getCustomCalendarEntries(),
        }),
      });

      const data = (await response.json()) as { error?: string; reply?: string };

      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Chat request failed.");
      }

      if (!data.reply) {
        throw new Error("No reply from the model.");
      }

      const parsed = parseCopilotAction(data.reply);
      let finalMessage = parsed.displayText;
      const fallbackAction = !parsed.calendarAdd ? inferCalendarAddFromText(text, parsed.displayText) : null;
      const actionToExecute = parsed.calendarAdd ?? fallbackAction;

      if (actionToExecute) {
        const result = addCustomCalendarEntry({
          day: actionToExecute.day,
          startTime: actionToExecute.startTime,
          endTime: actionToExecute.endTime,
          module: actionToExecute.title,
          room: actionToExecute.room,
        });

        finalMessage = result.ok
          ? `${parsed.displayText}\n\nAdded to calendar: ${actionToExecute.day} ${actionToExecute.startTime}-${actionToExecute.endTime} · ${actionToExecute.title} (${actionToExecute.room})`
          : `${parsed.displayText}\n\nCalendar add failed: ${result.error}`;
      }

      setMessages((current) => [...current, { role: "assistant", content: finalMessage }]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Chat request failed.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <article className="widget widget-copilot">
      <h2>UNI Copilot</h2>
      <p>Chat assistant for your daily student tasks.</p>
      <form className="copilot-input" onSubmit={onSubmit} onClick={(event) => event.stopPropagation()}>
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          placeholder="Ask your copilot..."
          aria-label="Ask your copilot"
        />
        <button type="submit" aria-label="Send" disabled={isLoading}>
          {isLoading ? "…" : "→"}
        </button>
      </form>
      {error ? <p className="widget-error">{error}</p> : null}
      {!error && latestAssistantMessage ? <p className="copilot-preview">{latestAssistantMessage}</p> : null}
    </article>
  );
}

type CalendarAddAction = {
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";
  startTime: string;
  endTime: string;
  title: string;
  room: string;
};

function parseCopilotAction(rawReply: string): {
  displayText: string;
  calendarAdd: CalendarAddAction | null;
} {
  const match = rawReply.match(/<calendar_action>([\s\S]*?)<\/calendar_action>/i);
  if (!match) {
    return { displayText: rawReply.trim(), calendarAdd: null };
  }

  const displayText = rawReply.replace(match[0], "").trim();

  try {
    const parsed = JSON.parse(match[1]) as Record<string, unknown>;
    if (
      parsed.action === "calendar_add" &&
      isWeekDay(parsed.day) &&
      typeof parsed.startTime === "string" &&
      typeof parsed.endTime === "string" &&
      typeof parsed.title === "string" &&
      typeof parsed.room === "string"
    ) {
      return {
        displayText,
        calendarAdd: {
          day: parsed.day,
          startTime: parsed.startTime,
          endTime: parsed.endTime,
          title: parsed.title,
          room: parsed.room,
        },
      };
    }
  } catch {
    // Ignore malformed action payload.
  }

  return { displayText, calendarAdd: null };
}

function inferCalendarAddFromText(userText: string, assistantText: string): CalendarAddAction | null {
  const combined = `${userText}\n${assistantText}`;
  if (!/\b(add|create|schedule|termin|eintrag|kalender|calendar)\b/i.test(combined)) {
    return null;
  }

  const day = parseWeekDay(combined);
  const timeRange = parseTimeRange(combined);
  if (!day || !timeRange) {
    return null;
  }

  const title = parseTitle(combined) ?? "Custom appointment";
  const room = parseRoom(combined) ?? "TBD";

  return {
    day,
    startTime: timeRange.startTime,
    endTime: timeRange.endTime,
    title,
    room,
  };
}

function parseWeekDay(text: string): CalendarAddAction["day"] | null {
  const normalized = text.toLowerCase();
  const mapping: Array<{ keys: string[]; day: CalendarAddAction["day"] }> = [
    { keys: ["monday", "montag"], day: "Monday" },
    { keys: ["tuesday", "dienstag"], day: "Tuesday" },
    { keys: ["wednesday", "mittwoch"], day: "Wednesday" },
    { keys: ["thursday", "donnerstag"], day: "Thursday" },
    { keys: ["friday", "freitag"], day: "Friday" },
  ];

  for (const entry of mapping) {
    if (entry.keys.some((key) => normalized.includes(key))) {
      return entry.day;
    }
  }

  return null;
}

function parseTimeRange(text: string) {
  const rangeMatch = text.match(/(\d{1,2}:\d{2})\s*(?:-|bis|to)\s*(\d{1,2}:\d{2})/i);
  if (!rangeMatch) {
    return null;
  }

  const startTime = toNormalizedClock(rangeMatch[1]);
  const endTime = toNormalizedClock(rangeMatch[2]);
  if (!startTime || !endTime || startTime >= endTime) {
    return null;
  }

  return { startTime, endTime };
}

function toNormalizedClock(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseTitle(text: string) {
  const quoted = text.match(/["“„']([^"“„']{2,120})["“„']/);
  if (quoted?.[1]) {
    return quoted[1].trim();
  }

  const named = text.match(/(?:called|named|titel|title)\s+([a-z0-9][a-z0-9 .,_-]{2,80})/i);
  if (named?.[1]) {
    return named[1].trim();
  }

  return null;
}

function parseRoom(text: string) {
  const roomMatch = text.match(/(?:room|raum)\s+([a-z0-9][a-z0-9 ./_-]{1,40})/i);
  return roomMatch?.[1]?.trim() ?? null;
}
