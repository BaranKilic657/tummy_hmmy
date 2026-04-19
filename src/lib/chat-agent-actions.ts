export type WeekDay = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";

export type AgentActionType =
  | "calendar_add"
  | "email_draft"
  | "course_watch_add"
  | "course_registration_assist"
  | "open_url";

type AgentActionBase = {
  id: string;
  action: AgentActionType;
  summary: string;
};

export type CalendarAddAgentAction = AgentActionBase & {
  action: "calendar_add";
  day: WeekDay;
  startTime: string;
  endTime: string;
  title: string;
  room: string;
};

export type EmailDraftAgentAction = AgentActionBase & {
  action: "email_draft";
  to: string;
  subject: string;
  body: string;
};

export type CourseWatchAddAgentAction = AgentActionBase & {
  action: "course_watch_add";
  courseTitle: string;
  courseCode?: string;
  term?: string;
};

export type CourseRegistrationAssistAgentAction = AgentActionBase & {
  action: "course_registration_assist";
  courseTitle: string;
  courseCode?: string;
  term?: string;
  portalUrl?: string;
  note?: string;
};

export type OpenUrlAgentAction = AgentActionBase & {
  action: "open_url";
  url: string;
};

export type AgentAction =
  | CalendarAddAgentAction
  | EmailDraftAgentAction
  | CourseWatchAddAgentAction
  | CourseRegistrationAssistAgentAction
  | OpenUrlAgentAction;

export type ParsedAgentActions = {
  displayText: string;
  actions: AgentAction[];
};

const ACTION_TAG_PATTERN = /<agent_action>([\s\S]*?)<\/agent_action>/gi;
const WEEK_DAYS: WeekDay[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export function parseAgentActions(rawReply: string): ParsedAgentActions {
  const actions: AgentAction[] = [];
  const displayText = rawReply.replace(ACTION_TAG_PATTERN, "").trim();

  for (const match of rawReply.matchAll(ACTION_TAG_PATTERN)) {
    const payload = match[1]?.trim();
    if (!payload) {
      continue;
    }

    const parsedAction = parseSingleAction(payload);
    if (parsedAction) {
      actions.push(parsedAction);
    }
  }

  return {
    displayText,
    actions,
  };
}

function parseSingleAction(payload: string): AgentAction | null {
  try {
    const parsed = JSON.parse(payload) as Record<string, unknown>;
    const actionType = asString(parsed.action);

    if (!actionType) {
      return null;
    }

    if (actionType === "calendar_add") {
      const day = asWeekDay(parsed.day);
      const startTime = asTime(parsed.startTime);
      const endTime = asTime(parsed.endTime);
      const title = asString(parsed.title);
      const room = asString(parsed.room);

      if (!day || !startTime || !endTime || !title || !room || startTime >= endTime) {
        return null;
      }

      return {
        id: buildActionId(),
        action: "calendar_add",
        summary: asString(parsed.summary) ?? `Add ${title} on ${day} ${startTime}-${endTime}`,
        day,
        startTime,
        endTime,
        title,
        room,
      };
    }

    if (actionType === "email_draft") {
      const to = asString(parsed.to);
      const subject = asString(parsed.subject);
      const body = asString(parsed.body);

      if (!to || !subject || !body) {
        return null;
      }

      return {
        id: buildActionId(),
        action: "email_draft",
        summary: asString(parsed.summary) ?? `Draft email to ${to}`,
        to,
        subject,
        body,
      };
    }

    if (actionType === "course_watch_add") {
      const courseTitle = asString(parsed.courseTitle);
      if (!courseTitle) {
        return null;
      }

      return {
        id: buildActionId(),
        action: "course_watch_add",
        summary: asString(parsed.summary) ?? `Add ${courseTitle} to course watchlist`,
        courseTitle,
        courseCode: asString(parsed.courseCode) ?? undefined,
        term: asString(parsed.term) ?? undefined,
      };
    }

    if (actionType === "course_registration_assist") {
      const courseTitle = asString(parsed.courseTitle);
      if (!courseTitle) {
        return null;
      }

      const portalUrl = asSafeUrl(parsed.portalUrl);

      return {
        id: buildActionId(),
        action: "course_registration_assist",
        summary: asString(parsed.summary) ?? `Prepare registration workflow for ${courseTitle}`,
        courseTitle,
        courseCode: asString(parsed.courseCode) ?? undefined,
        term: asString(parsed.term) ?? undefined,
        portalUrl: portalUrl ?? undefined,
        note: asString(parsed.note) ?? undefined,
      };
    }

    if (actionType === "open_url") {
      const url = asSafeUrl(parsed.url);
      if (!url) {
        return null;
      }

      return {
        id: buildActionId(),
        action: "open_url",
        summary: asString(parsed.summary) ?? `Open link: ${url}`,
        url,
      };
    }
  } catch {
    return null;
  }

  return null;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asWeekDay(value: unknown): WeekDay | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return WEEK_DAYS.includes(normalized as WeekDay) ? (normalized as WeekDay) : null;
}

function asTime(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function asSafeUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed, "https://tum.de");
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

function buildActionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `action-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}
