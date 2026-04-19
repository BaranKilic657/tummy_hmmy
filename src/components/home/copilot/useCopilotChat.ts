"use client";

import { useEffect, useMemo, useState } from "react";

import { addCustomCalendarEntry, getCustomCalendarEntries, isWeekDay } from "@/lib/calendar-custom-events";
import { AgentAction, parseAgentActions } from "@/lib/chat-agent-actions";
import { getAccountTypeFromStorage, isGuestAccount } from "@/lib/auth-session";

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

const CHAT_STORAGE_KEY_PREFIX = "tummy.copilot.chat-history";
const CHAT_UPDATED_EVENT = "tummy:copilot-chat-updated";
const COURSE_WATCHLIST_STORAGE_KEY = "tummy.course.watchlist.v1";
const COURSE_REG_REQUEST_STORAGE_KEY = "tummy.course.registration.requests.v1";
const REMINDER_STORAGE_KEY = "tummy.personal.reminders.v1";
const WEEKDAY_ORDER = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
const INITIAL_MESSAGES: ChatMessage[] = [
  {
    role: "assistant",
    content:
      "Hi, I can help with tasks, deadlines, rooms, and schedules. I can also prepare actions for you, like calendar events, email drafts, and course registration checklists.",
  },
];

const GUEST_NOTICE_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "Guest account notice: This is a demo guest account. Information may be outdated, and some functions may not work reliably.",
};

export function useCopilotChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingActions, setPendingActions] = useState<AgentAction[]>([]);
  const [actionStatus, setActionStatus] = useState("");
  const [accountType, setAccountType] = useState<"guest" | "member">("member");

  useEffect(() => {
    setAccountType(getAccountTypeFromStorage());
    const mode = getAccountTypeFromStorage();
    setMessages(ensureGuestNotice(loadMessagesFromStorage(mode), mode));
  }, []);

  useEffect(() => {
    const sync = () => {
      const mode = getAccountTypeFromStorage();
      setAccountType(mode);
      setMessages(ensureGuestNotice(loadMessagesFromStorage(mode), mode));
    };
    window.addEventListener(CHAT_UPDATED_EVENT, sync);
    window.addEventListener("auth-state-changed", sync);
    return () => {
      window.removeEventListener(CHAT_UPDATED_EVENT, sync);
      window.removeEventListener("auth-state-changed", sync);
    };
  }, []);

  useEffect(() => {
    if (accountType === "guest") {
      setPendingActions([]);
      setActionStatus("");
    }
  }, [accountType]);

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

    const mode = getAccountTypeFromStorage();
    const guestMode = mode === "guest";
    setAccountType(mode);

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: normalizedText }];
    persistMessages(nextMessages, mode);
    setMessages(nextMessages);
    setError("");
    setIsLoading(true);

    try {
      const requestPayload = {
        messages: nextMessages,
        calendarEvents: getCustomCalendarEntries(),
        guestMode,
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
      const inferredActions = guestMode ? [] : inferFallbackAgentActions(normalizedText, parsed.displayText, declaredActions);
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
      const mergedActions = [...declaredActions, ...inferredActions];
      const nextActions =
        guestMode
          ? []
          : dedupeAgentActions(synthesizedCalendarAction ? [...mergedActions, synthesizedCalendarAction] : mergedActions);

      if (nextActions.length > 0) {
        setPendingActions((current) => [...current, ...nextActions]);
        finalMessage = buildActionReadyMessage(parsed.displayText, nextActions);
      }

      const withAssistant: ChatMessage[] = [...nextMessages, { role: "assistant", content: finalMessage }];
      persistMessages(withAssistant, mode);
      setMessages(withAssistant);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Chat request failed.");
    } finally {
      setIsLoading(false);
    }
  }

  function clearChat() {
    const mode = getAccountTypeFromStorage();
    const next = ensureGuestNotice(INITIAL_MESSAGES, mode);
    persistMessages(next, mode);
    setMessages(next);
    setInput("");
    setError("");
    setPendingActions([]);
    setActionStatus("");
  }

  function dismissAction(actionId: string) {
    setPendingActions((current) => current.filter((action) => action.id !== actionId));
  }

  async function runAction(actionId: string) {
    if (accountType === "guest") {
      setActionStatus("Guest mode does not allow running action workflows.");
      return;
    }

    const action = pendingActions.find((item) => item.id === actionId);
    if (!action) {
      return;
    }

    const result = await executeAgentAction(action, messages);
    const statusText = result.ok ? `Completed: ${action.summary}` : `Failed: ${action.summary} (${result.message})`;
    setActionStatus(statusText);
    setPendingActions((current) => current.filter((item) => item.id !== actionId));

    const mode = getAccountTypeFromStorage();
    const withAssistant: ChatMessage[] = [
      ...messages,
      {
        role: "assistant",
        content: result.ok ? `Action completed: ${result.message}` : `Action failed: ${result.message}`,
      },
    ];
    persistMessages(withAssistant, mode);
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
    isGuestMode: accountType === "guest",
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
    case "calendar_sync_export":
      return "I prepared a calendar sync export action for your personal calendar.";
    case "calendar_export_custom_week":
      return "I prepared an ICS export for your custom study sessions this week.";
    case "calendar_sync_google":
      return "I prepared a Google Calendar sync action.";
    case "reminder_add":
      return `I prepared a reminder for ${first.title}.`;
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

  if (isGuestAccount() && (action.action === "email_draft" || action.action === "course_registration_assist")) {
    return {
      ok: false,
      message: "This action is unavailable in guest mode. Log in with a TUM account to use it.",
    };
  }

  switch (action.action) {
    case "calendar_add": {
      const result = addCustomCalendarEntry({
        day: action.day,
        startTime: action.startTime,
        endTime: action.endTime,
        module: action.title,
        room: action.room,
        recurrence: "weekly",
      });

      return result.ok
        ? { ok: true, message: `Added to calendar: ${action.day} ${action.startTime}-${action.endTime}.` }
        : { ok: false, message: result.error };
    }
    case "calendar_sync_export": {
      const result = exportEventToIcs(action, {
        includeExistingCustom: Boolean(action.includeExistingCustom),
      });

      return result.ok
        ? { ok: true, message: "Downloaded .ics file. Import it into your personal calendar app." }
        : { ok: false, message: result.message };
    }
    case "calendar_export_custom_week": {
      const result = exportCustomWeekEntriesToIcs();
      return result.ok
        ? { ok: true, message: "Downloaded .ics file for this week's custom study sessions." }
        : { ok: false, message: result.message };
    }
    case "calendar_sync_google": {
      const googleUrl = buildGoogleCalendarUrl({
        title: action.title,
        day: action.day,
        startTime: action.startTime,
        endTime: action.endTime,
        room: action.room,
        details: action.details,
      });

      window.open(googleUrl, "_blank", "noopener,noreferrer");
      return { ok: true, message: "Opened Google Calendar event draft." };
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
    case "reminder_add": {
      const current = readJsonArray(window.localStorage.getItem(REMINDER_STORAGE_KEY));
      const next = [
        ...current,
        {
          title: action.title,
          dueAt: action.dueAt,
          notes: action.notes ?? null,
          createdAt: new Date().toISOString(),
        },
      ];
      window.localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(next));

      const calendarSync = syncReminderToWeeklyCalendar(action.title, action.dueAt, action.notes);

      if (calendarSync.ok) {
        return {
          ok: true,
          message: `Saved reminder for ${formatReminderDate(action.dueAt)} and added it to calendar (${calendarSync.day} ${calendarSync.startTime}-${calendarSync.endTime}).`,
        };
      }

      return {
        ok: true,
        message: `Saved reminder for ${formatReminderDate(action.dueAt)}. ${calendarSync.message}`,
      };
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

function buildGoogleCalendarUrl(input: {
  title: string;
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";
  startTime: string;
  endTime: string;
  room: string;
  details?: string;
}) {
  const startDate = nextDateForWeekday(input.day, input.startTime);
  const endDate = nextDateForWeekday(input.day, input.endTime, startDate);
  const dates = `${toGoogleDateTime(startDate)}/${toGoogleDateTime(endDate)}`;
  const details = [input.details?.trim(), `Location: ${input.room}`].filter(Boolean).join("\n");

  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", input.title);
  url.searchParams.set("dates", dates);
  url.searchParams.set("location", input.room);
  if (details) {
    url.searchParams.set("details", details);
  }

  return url.toString();
}

function exportEventToIcs(
  action: Extract<AgentAction, { action: "calendar_sync_export" }>,
  options: { includeExistingCustom: boolean },
): { ok: true } | { ok: false; message: string } {
  if (typeof window === "undefined") {
    return { ok: false, message: "Calendar export only works in browser." };
  }

  const primaryStart = nextDateForWeekday(action.day, action.startTime);
  const primaryEnd = nextDateForWeekday(action.day, action.endTime, primaryStart);

  const events = [
    {
      title: action.title,
      room: action.room,
      start: primaryStart,
      end: primaryEnd,
      details: "Created by TUMmy Copilot Action Center",
    },
  ];

  if (options.includeExistingCustom) {
    const existing = getCustomCalendarEntries();
    for (const entry of existing) {
      const parsed = parseStoredTimeRange(entry.time);
      if (!parsed) {
        continue;
      }

      const start = nextDateForWeekday(entry.day, parsed.startTime);
      const end = nextDateForWeekday(entry.day, parsed.endTime, start);
      events.push({
        title: entry.module,
        room: entry.room,
        start,
        end,
        details: "Existing custom calendar entry",
      });
    }
  }

  if (events.length === 0) {
    return { ok: false, message: "No events available for export." };
  }

  const now = new Date();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TUMmy//Copilot Action Center//EN",
    "CALSCALE:GREGORIAN",
    ...events.flatMap((event, index) => [
      "BEGIN:VEVENT",
      `UID:${now.getTime()}-${index}@tummy`,
      `DTSTAMP:${toIcsDateTime(now)}`,
      `DTSTART:${toIcsDateTime(event.start)}`,
      `DTEND:${toIcsDateTime(event.end)}`,
      `SUMMARY:${escapeIcsText(event.title)}`,
      `LOCATION:${escapeIcsText(event.room)}`,
      `DESCRIPTION:${escapeIcsText(event.details)}`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];

  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tummy-calendar-sync-${Date.now()}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return { ok: true };
}

function exportCustomWeekEntriesToIcs(): { ok: true } | { ok: false; message: string } {
  if (typeof window === "undefined") {
    return { ok: false, message: "Calendar export only works in browser." };
  }

  const entries = getCustomCalendarEntries();
  if (entries.length === 0) {
    return { ok: false, message: "No custom study sessions found to export." };
  }

  const now = new Date();
  const events = entries
    .map((entry) => {
      const parsed = parseStoredTimeRange(entry.time);
      if (!parsed) {
        return null;
      }

      const start = nextDateForWeekday(entry.day, parsed.startTime);
      const end = nextDateForWeekday(entry.day, parsed.endTime, start);

      return {
        title: entry.module,
        room: entry.room,
        start,
        end,
        details: "Custom study session exported from TUMmy",
      };
    })
    .filter((item): item is { title: string; room: string; start: Date; end: Date; details: string } => Boolean(item));

  if (events.length === 0) {
    return { ok: false, message: "No valid custom study sessions could be exported." };
  }

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TUMmy//Custom Study Sessions//EN",
    "CALSCALE:GREGORIAN",
    ...events.flatMap((event, index) => [
      "BEGIN:VEVENT",
      `UID:custom-week-${now.getTime()}-${index}@tummy`,
      `DTSTAMP:${toIcsDateTime(now)}`,
      `DTSTART:${toIcsDateTime(event.start)}`,
      `DTEND:${toIcsDateTime(event.end)}`,
      `SUMMARY:${escapeIcsText(event.title)}`,
      `LOCATION:${escapeIcsText(event.room)}`,
      `DESCRIPTION:${escapeIcsText(event.details)}`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];

  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tummy-custom-study-week-${Date.now()}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return { ok: true };
}

function parseStoredTimeRange(value: string): { startTime: string; endTime: string } | null {
  const match = /^(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  return {
    startTime: match[1],
    endTime: match[2],
  };
}

function nextDateForWeekday(
  day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday",
  time: string,
  baseDate?: Date,
) {
  const [hourRaw, minuteRaw] = time.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const current = baseDate ? new Date(baseDate) : new Date();
  const target = new Date(current);
  target.setSeconds(0, 0);

  const targetDayIndex = WEEKDAY_ORDER.indexOf(day);
  const currentDayIndex = target.getDay();
  let delta = targetDayIndex - currentDayIndex;
  if (delta < 0) {
    delta += 7;
  }

  target.setDate(target.getDate() + delta);
  target.setHours(hour, minute, 0, 0);

  if (!baseDate && target.getTime() <= current.getTime()) {
    target.setDate(target.getDate() + 7);
  }

  return target;
}

function toGoogleDateTime(date: Date) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}T${String(
    date.getHours(),
  ).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}00`;
}

function toIcsDateTime(date: Date) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}T${String(
    date.getHours(),
  ).padStart(2, "0")}${String(date.getMinutes()).padStart(2, "0")}00`;
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function escapeIcsText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function formatReminderDate(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function syncReminderToWeeklyCalendar(
  title: string,
  dueAt: string,
  notes?: string,
):
  | { ok: true; day: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday"; startTime: string; endTime: string }
  | { ok: false; message: string } {
  const parsed = new Date(dueAt);
  if (Number.isNaN(parsed.getTime())) {
    return { ok: false, message: "Could not map reminder time to calendar." };
  }

  const day = toWeekDay(parsed.getDay());
  if (!day) {
    return { ok: false, message: "Reminder date is outside Monday-Friday, so it was not added to weekly calendar." };
  }

  const startTime = `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`;
  const endDate = new Date(parsed.getTime() + 30 * 60 * 1000);
  const endTime = `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;
  const moduleTitle = `Reminder: ${title}`;
  const room = notes?.trim() ? `Personal · ${notes.trim().slice(0, 48)}` : "Personal";

  const result = addCustomCalendarEntry({
    day,
    startTime,
    endTime,
    module: moduleTitle,
    room,
    recurrence: "once",
    dateIso: toDateInputValue(parsed),
  });

  if (!result.ok) {
    return { ok: false, message: `Reminder saved but calendar entry could not be added (${result.error}).` };
  }

  return {
    ok: true,
    day,
    startTime,
    endTime,
  };
}

function toWeekDay(dayIndex: number): "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | null {
  if (dayIndex === 1) {
    return "Monday";
  }
  if (dayIndex === 2) {
    return "Tuesday";
  }
  if (dayIndex === 3) {
    return "Wednesday";
  }
  if (dayIndex === 4) {
    return "Thursday";
  }
  if (dayIndex === 5) {
    return "Friday";
  }

  return null;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function loadMessagesFromStorage(accountType: "guest" | "member") {
  if (typeof window === "undefined") {
    return INITIAL_MESSAGES;
  }

  try {
    const raw = window.localStorage.getItem(getChatStorageKey(accountType));
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

function ensureGuestNotice(messages: ChatMessage[], accountType: "guest" | "member"): ChatMessage[] {
  if (typeof window === "undefined") {
    return messages;
  }

  if (accountType !== "guest") {
    return messages.filter((message) => message.content !== GUEST_NOTICE_MESSAGE.content);
  }

  const hasNotice = messages.some((message) => message.content === GUEST_NOTICE_MESSAGE.content);
  if (hasNotice) {
    return messages;
  }

  return [GUEST_NOTICE_MESSAGE, ...messages];
}

function persistMessages(messages: ChatMessage[], accountType: "guest" | "member") {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(getChatStorageKey(accountType), JSON.stringify(messages));
  window.dispatchEvent(new Event(CHAT_UPDATED_EVENT));
}

function getChatStorageKey(accountType: "guest" | "member") {
  return `${CHAT_STORAGE_KEY_PREFIX}.${accountType}`;
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

function inferFallbackAgentActions(userText: string, assistantText: string, existingActions: AgentAction[]): AgentAction[] {
  const combined = `${userText}\n${assistantText}`;
  const inferred: AgentAction[] = [];

  if (!hasAction(existingActions, "calendar_export_custom_week") && looksLikeCustomWeekIcsRequest(userText)) {
    inferred.push({
      id: buildFallbackActionId("calendar_export_custom_week"),
      action: "calendar_export_custom_week",
      summary: "Export this week's custom study sessions as ICS",
    });
  }

  if (!hasAction(existingActions, "reminder_add")) {
    const reminder = inferReminderActionFromText(userText);
    if (reminder) {
      inferred.push(reminder);
    }
  }

  if (!hasAction(existingActions, "calendar_sync_google") && /google\s*calendar|gcal/i.test(userText)) {
    const calendarAdd = inferCalendarAddFromText(combined, combined);
    if (calendarAdd) {
      inferred.push({
        id: buildFallbackActionId("calendar_sync_google"),
        action: "calendar_sync_google",
        summary: `Create Google Calendar event for ${calendarAdd.title}`,
        title: calendarAdd.title,
        day: calendarAdd.day,
        startTime: calendarAdd.startTime,
        endTime: calendarAdd.endTime,
        room: calendarAdd.room,
      });
    }
  }

  return inferred;
}

function looksLikeCustomWeekIcsRequest(text: string): boolean {
  const normalized = text.toLowerCase();
  const mentionsExport = /export|download|sync/.test(normalized);
  const mentionsCalendarFile = /ics|ical|calendar/.test(normalized);
  const mentionsCustomWeek = /custom|study|session/.test(normalized) && /week|weekly/.test(normalized);
  return mentionsExport && mentionsCalendarFile && mentionsCustomWeek;
}

function inferReminderActionFromText(text: string): Extract<AgentAction, { action: "reminder_add" }> | null {
  const match = text.match(/(?:add|create)\s+(?:a\s+)?reminder\s+for\s+(.+?)\s+on\s+(\d{4}-\d{2}-\d{2})\s+(?:at\s+)?(\d{1,2}:\d{2})/i);
  if (!match) {
    return null;
  }

  const title = match[1]?.trim();
  const date = match[2]?.trim();
  const time = toNormalizedClock(match[3] || "");
  if (!title || !date || !time) {
    return null;
  }

  const dueAt = new Date(`${date}T${time}:00`);
  if (Number.isNaN(dueAt.getTime())) {
    return null;
  }

  return {
    id: buildFallbackActionId("reminder_add"),
    action: "reminder_add",
    summary: `Create reminder: ${title}`,
    title,
    dueAt: dueAt.toISOString(),
  };
}

function hasAction(actions: AgentAction[], actionType: AgentAction["action"]): boolean {
  return actions.some((action) => action.action === actionType);
}

function dedupeAgentActions(actions: AgentAction[]): AgentAction[] {
  const seen = new Set<string>();
  const result: AgentAction[] = [];

  for (const action of actions) {
    const key = actionDedupKey(action);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(action);
  }

  return result;
}

function actionDedupKey(action: AgentAction): string {
  switch (action.action) {
    case "calendar_add":
      return `${action.action}:${action.day}:${action.startTime}:${action.endTime}:${action.title}:${action.room}`;
    case "calendar_sync_export":
      return `${action.action}:${action.day}:${action.startTime}:${action.endTime}:${action.title}:${action.room}:${String(
        action.includeExistingCustom,
      )}`;
    case "calendar_export_custom_week":
      return action.action;
    case "calendar_sync_google":
      return `${action.action}:${action.day}:${action.startTime}:${action.endTime}:${action.title}:${action.room}`;
    case "email_draft":
      return `${action.action}:${action.to}:${action.subject}:${action.body}`;
    case "reminder_add":
      return `${action.action}:${action.title}:${action.dueAt}`;
    case "course_watch_add":
      return `${action.action}:${action.courseTitle}:${action.courseCode ?? ""}:${action.term ?? ""}`;
    case "course_registration_assist":
      return `${action.action}:${action.courseTitle}:${action.courseCode ?? ""}:${action.term ?? ""}:${action.portalUrl ?? ""}`;
    case "open_url":
      return `${action.action}:${action.url}`;
  }

  const _exhaustiveCheck: never = action;
  return String(_exhaustiveCheck);
}

function buildFallbackActionId(seed: string) {
  return `fallback-${seed}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}
