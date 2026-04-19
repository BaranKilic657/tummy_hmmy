"use client";

import { useEffect, useMemo, useState } from "react";

import { addCustomCalendarEntry, getCustomCalendarEntries, isWeekDay } from "@/lib/calendar-custom-events";
import { AgentAction, parseAgentActions } from "@/lib/chat-agent-actions";

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
const COURSE_WATCHLIST_STORAGE_KEY = "tummy.course.watchlist.v1";
const COURSE_REG_REQUEST_STORAGE_KEY = "tummy.course.registration.requests.v1";
const INITIAL_MESSAGES: ChatMessage[] = [
  {
    role: "assistant",
    content:
      "Hi, I can help with tasks, deadlines, rooms, and schedules. I can also prepare actions for you, like calendar events, email drafts, and course registration checklists.",
  },
];

export function useCopilotChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingActions, setPendingActions] = useState<AgentAction[]>([]);
  const [actionStatus, setActionStatus] = useState("");

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

      const parsedActions = parseAgentActions(data.reply);
      const parsed = parseCopilotAction(parsedActions.displayText);
      let finalMessage = parsed.displayText;
      const declaredActions = parsedActions.actions;
      const fallbackAction = !parsed.calendarAdd ? inferCalendarAddFromText(normalizedText, parsed.displayText) : null;
      const actionToExecute = parsed.calendarAdd ?? fallbackAction;
      const synthesizedCalendarAction = actionToExecute
        ? {
            id: `calendar-${Date.now()}`,
            action: "calendar_add" as const,
            summary: `Add ${actionToExecute.title} on ${actionToExecute.day} ${actionToExecute.startTime}-${actionToExecute.endTime}`,
            day: actionToExecute.day,
            startTime: actionToExecute.startTime,
            endTime: actionToExecute.endTime,
            title: actionToExecute.title,
            room: actionToExecute.room,
          }
        : null;
      const nextActions = synthesizedCalendarAction
        ? [...declaredActions, synthesizedCalendarAction]
        : declaredActions;

      if (nextActions.length > 0) {
        setPendingActions((current) => [...current, ...nextActions]);
        finalMessage = buildActionReadyMessage(parsed.displayText, nextActions);
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
    setPendingActions([]);
    setActionStatus("");
  }

  function dismissAction(actionId: string) {
    setPendingActions((current) => current.filter((action) => action.id !== actionId));
  }

  async function runAction(actionId: string) {
    const action = pendingActions.find((item) => item.id === actionId);
    if (!action) {
      return;
    }

    const result = await executeAgentAction(action, messages);
    const statusText = result.ok ? `Completed: ${action.summary}` : `Failed: ${action.summary} (${result.message})`;
    setActionStatus(statusText);
    setPendingActions((current) => current.filter((item) => item.id !== actionId));

    const withAssistant: ChatMessage[] = [
      ...messages,
      {
        role: "assistant",
        content: result.ok ? `Action completed: ${result.message}` : `Action failed: ${result.message}`,
      },
    ];
    persistMessages(withAssistant);
    setMessages(withAssistant);
  }

  return {
    messages,
    input,
    setInput,
    isLoading,
    error,
    pendingActions,
    actionStatus,
    clearChat,
    dismissAction,
    runAction,
    sendCurrentInput,
    latestAssistantMessage,
  };
}

function buildActionReadyMessage(displayText: string, actions: AgentAction[]): string {
  const cleaned = displayText.trim();
  const actionCount = actions.length;
  const countLabel = `${actionCount} action${actionCount > 1 ? "s" : ""}`;

  if (!cleaned || isWeakActionText(cleaned)) {
    return `${summarizePrimaryAction(actions)}\n\nI prepared ${countLabel}. Review and run ${actionCount > 1 ? "them" : "it"} in the Action Center below.`;
  }

  return `${cleaned}\n\nI prepared ${countLabel}. Review and run ${actionCount > 1 ? "them" : "it"} in the Action Center below.`;
}

function isWeakActionText(text: string): boolean {
  const normalized = text.toLowerCase();

  return (
    normalized.includes("what is the email") ||
    normalized.includes("i do not know") ||
    normalized.includes("i don't know") ||
    normalized.includes("as an ai") ||
    normalized.includes("language model") ||
    normalized.includes("cannot access")
  );
}

function summarizePrimaryAction(actions: AgentAction[]): string {
  const first = actions[0];
  if (!first) {
    return "I prepared your request.";
  }

  switch (first.action) {
    case "email_draft":
      return `I drafted your email to ${first.to} with a ready-to-send subject and message.`;
    case "calendar_add":
      return `I prepared a calendar entry for ${first.day} ${first.startTime}-${first.endTime}.`;
    case "course_watch_add":
      return `I prepared the course watchlist entry for ${first.courseTitle}.`;
    case "course_registration_assist":
      return `I prepared a course registration checklist for ${first.courseTitle}.`;
    case "open_url":
      return "I prepared the requested link action.";
    default:
      return "I prepared your request.";
  }
}

async function executeAgentAction(
  action: AgentAction,
  messages: ChatMessage[],
): Promise<{ ok: boolean; message: string }> {
  if (typeof window === "undefined") {
    return { ok: false, message: "Action execution is only available in browser." };
  }

  switch (action.action) {
    case "calendar_add": {
      const result = addCustomCalendarEntry({
        day: action.day,
        startTime: action.startTime,
        endTime: action.endTime,
        module: action.title,
        room: action.room,
      });

      return result.ok
        ? { ok: true, message: `Added to calendar: ${action.day} ${action.startTime}-${action.endTime}.` }
        : { ok: false, message: result.error };
    }
    case "email_draft": {
      const resolvedTo = await resolveEmailRecipient(action, messages);
      if (!resolvedTo) {
        return {
          ok: false,
          message:
            "Recipient email could not be resolved from Cognee. Ask me for the official contact first, then retry.",
        };
      }

      const mailto = `mailto:${encodeURIComponent(resolvedTo)}?subject=${encodeURIComponent(action.subject)}&body=${encodeURIComponent(action.body)}`;
      window.location.href = mailto;
      return { ok: true, message: `Opened email draft for ${resolvedTo}.` };
    }
    case "course_watch_add": {
      const current = readJsonArray(window.localStorage.getItem(COURSE_WATCHLIST_STORAGE_KEY));
      const next = [
        ...current,
        {
          courseTitle: action.courseTitle,
          courseCode: action.courseCode ?? null,
          term: action.term ?? null,
          createdAt: new Date().toISOString(),
        },
      ];
      window.localStorage.setItem(COURSE_WATCHLIST_STORAGE_KEY, JSON.stringify(next));
      return { ok: true, message: `${action.courseTitle} added to your course watchlist.` };
    }
    case "course_registration_assist": {
      const current = readJsonArray(window.localStorage.getItem(COURSE_REG_REQUEST_STORAGE_KEY));
      const next = [
        ...current,
        {
          courseTitle: action.courseTitle,
          courseCode: action.courseCode ?? null,
          term: action.term ?? null,
          portalUrl: action.portalUrl ?? null,
          note: action.note ?? null,
          createdAt: new Date().toISOString(),
        },
      ];
      window.localStorage.setItem(COURSE_REG_REQUEST_STORAGE_KEY, JSON.stringify(next));

      if (action.portalUrl) {
        window.open(action.portalUrl, "_blank", "noopener,noreferrer");
      }

      return {
        ok: true,
        message: action.portalUrl
          ? `Registration checklist saved and portal opened for ${action.courseTitle}.`
          : `Registration checklist saved for ${action.courseTitle}.`,
      };
    }
    case "open_url": {
      if (!isApprovedWebsite(action.url)) {
        return { ok: false, message: "Blocked link: domain is not approved." };
      }

      window.open(action.url, "_blank", "noopener,noreferrer");
      return { ok: true, message: "Opened requested page." };
    }
    default:
      return { ok: false, message: "Unsupported action." };
  }
}

async function resolveEmailRecipient(
  action: Extract<AgentAction, { action: "email_draft" }>,
  messages: ChatMessage[],
): Promise<string | null> {
  if (isValidEmail(action.to)) {
    return action.to.trim();
  }

  try {
    const latestUserPrompt = [...messages]
      .reverse()
      .find((item) => item.role === "user" && item.content.trim().length > 0)?.content;

    const response = await fetch("/api/agent/enrich-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: action.to,
        subject: action.subject,
        body: action.body,
        latestUserPrompt,
        messages: messages.slice(-10),
      }),
    });

    const data = (await response.json()) as { resolvedTo?: string | null };
    const candidate = typeof data?.resolvedTo === "string" ? data.resolvedTo.trim() : "";
    if (candidate && isValidEmail(candidate)) {
      return candidate;
    }

    return null;
  } catch {
    return null;
  }
}

function readJsonArray(raw: string | null): unknown[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isApprovedWebsite(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    return (
      hostname.endsWith("tum.de") ||
      hostname.endsWith("mytum.de") ||
      hostname.endsWith("moodle.tum.de") ||
      hostname.endsWith("campus.tum.de")
    );
  } catch {
    return false;
  }
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
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
