"use client";

import { useEffect, useMemo, useState } from "react";

import { addCustomCalendarEntry, getCustomCalendarEntries, isWeekDay } from "@/lib/calendar-custom-events";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type CalendarAddAction = {
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";
  startTime: string;
  endTime: string;
  title: string;
  room: string;
};

const CHAT_STORAGE_KEY = "tummy.copilot.chat-history.v1";
const CHAT_UPDATED_EVENT = "tummy:copilot-chat-updated";
const INITIAL_MESSAGES: ChatMessage[] = [
  { role: "assistant", content: "Hi, I can help with tasks, deadlines, rooms, and schedules." },
];

export function useCopilotChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMessages(loadMessagesFromStorage());
  }, []);

  useEffect(() => {
    const sync = () => setMessages(loadMessagesFromStorage());
    window.addEventListener(CHAT_UPDATED_EVENT, sync);
    return () => window.removeEventListener(CHAT_UPDATED_EVENT, sync);
  }, []);

  const latestAssistantMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === "assistant")?.content ?? "",
    [messages],
  );

  async function sendCurrentInput() {
    const text = input.trim();
    if (!text || isLoading) {
      return;
    }

    await sendMessage(text);
    setInput("");
  }

  async function sendMessage(text: string) {
    const normalizedText = text.trim();
    if (!normalizedText || isLoading) {
      return;
    }

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: normalizedText }];
    persistMessages(nextMessages);
    setMessages(nextMessages);
    setError("");
    setIsLoading(true);

    try {
      const requestPayload = {
        messages: nextMessages,
        calendarEvents: getCustomCalendarEntries(),
      };

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
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
      const fallbackAction = !parsed.calendarAdd ? inferCalendarAddFromText(normalizedText, parsed.displayText) : null;
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

      const withAssistant: ChatMessage[] = [...nextMessages, { role: "assistant", content: finalMessage }];
      persistMessages(withAssistant);
      setMessages(withAssistant);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Chat request failed.");
    } finally {
      setIsLoading(false);
    }
  }

  function clearChat() {
    persistMessages(INITIAL_MESSAGES);
    setMessages(INITIAL_MESSAGES);
    setInput("");
    setError("");
  }

  return {
    messages,
    input,
    setInput,
    isLoading,
    error,
    clearChat,
    sendCurrentInput,
    latestAssistantMessage,
  };
}

function loadMessagesFromStorage() {
  if (typeof window === "undefined") {
    return INITIAL_MESSAGES;
  }

  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) {
      return INITIAL_MESSAGES;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return INITIAL_MESSAGES;
    }
    const valid = parsed.filter(isChatMessage);
    return valid.length > 0 ? valid : INITIAL_MESSAGES;
  } catch {
    return INITIAL_MESSAGES;
  }
}

function persistMessages(messages: ChatMessage[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
  window.dispatchEvent(new Event(CHAT_UPDATED_EVENT));
}

function isChatMessage(input: unknown): input is ChatMessage {
  if (!input || typeof input !== "object") {
    return false;
  }
  const record = input as Record<string, unknown>;
  return (
    (record.role === "user" || record.role === "assistant") &&
    typeof record.content === "string" &&
    record.content.trim().length > 0
  );
}

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
