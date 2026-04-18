import { NextResponse } from "next/server";
import { COPILOT_SYSTEM_CONTEXT } from "@/lib/copilot-context";
import { buildDashboardContext } from "@/server/chat/dashboard-context";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type GeminiPart = {
  text: string;
};

type GeminiContent = {
  role: "user" | "model";
  parts: GeminiPart[];
};

type VertexAuthMode = "api_key" | "bearer";
type LlmProvider = "vertex" | "gemini";
type CalendarContextEvent = {
  day: string;
  time: string;
  module: string;
  room: string;
};

function normalizeMessages(inputMessages: ChatMessage[]): GeminiContent[] {
  const normalized = inputMessages
    .filter((message) => message && (message.role === "user" || message.role === "assistant"))
    .map((message) => ({
      role: (message.role === "assistant" ? "model" : "user") as GeminiContent["role"],
      parts: [{ text: String(message.content ?? "") }],
    }))
    .filter((message) => message.parts[0].text.trim().length > 0);

  while (normalized[0]?.role === "model") {
    normalized.shift();
  }

  return normalized;
}

function extractGeminiErrorMessage(data: unknown): string {
  if (!data || typeof data !== "object") {
    return "LLM request failed.";
  }

  const record = data as Record<string, unknown>;
  const errorRecord = record.error as Record<string, unknown> | undefined;

  if (errorRecord && typeof errorRecord.message === "string") {
    return errorRecord.message;
  }
  if (typeof record.message === "string") {
    return record.message;
  }

  return "LLM request failed.";
}

function buildVertexEndpoint(projectId: string, location: string, model: string) {
  const normalizedLocation = location.trim() || "us-central1";
  return `https://${encodeURIComponent(normalizedLocation)}-aiplatform.googleapis.com/v1/projects/${encodeURIComponent(
    projectId,
  )}/locations/${encodeURIComponent(normalizedLocation)}/publishers/google/models/${encodeURIComponent(model)}:generateContent`;
}

async function callGeminiApiGenerateContent(
  messages: GeminiContent[],
  apiKey: string,
  model: string,
  systemContext: string,
) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemContext }],
      },
      contents: messages,
      generationConfig: {
        temperature: 0.65,
      },
    }),
  });

  const rawText = await response.text();
  const data = rawText
    ? (() => {
        try {
          return JSON.parse(rawText);
        } catch {
          return { raw: rawText };
        }
      })()
    : null;

  if (!response.ok) {
    return {
      ok: false as const,
      status: response.status,
      error: `Gemini API: ${extractGeminiErrorMessage(data)}`,
      details: data,
    };
  }

  const replyParts = Array.isArray(data?.candidates?.[0]?.content?.parts)
    ? data.candidates[0].content.parts
    : [];
  const reply = replyParts
    .map((part: unknown) =>
      part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string"
        ? (part as { text: string }).text
        : "",
    )
    .join("")
    .trim();

  if (!reply) {
    return {
      ok: false as const,
      status: 502,
      error: "The LLM did not return a text response.",
      details: data,
    };
  }

  return { ok: true as const, reply };
}

async function callVertexGenerateContent(
  messages: GeminiContent[],
  credential: string,
  model: string,
  projectId: string,
  location: string,
  authMode: VertexAuthMode,
  systemContext: string,
) {
  const baseEndpoint = buildVertexEndpoint(projectId, location, model);
  const endpoint = authMode === "api_key" ? `${baseEndpoint}?key=${encodeURIComponent(credential)}` : baseEndpoint;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (authMode === "bearer") {
    headers.Authorization = `Bearer ${credential}`;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemContext }],
      },
      contents: messages,
      generationConfig: {
        temperature: 0.65,
      },
    }),
  });

  const rawText = await response.text();
  const data = rawText
    ? (() => {
        try {
          return JSON.parse(rawText);
        } catch {
          return { raw: rawText };
        }
      })()
    : null;

  if (!response.ok) {
    return {
      ok: false as const,
      status: response.status,
      error: `Vertex AI: ${extractGeminiErrorMessage(data)}`,
      details: data,
    };
  }

  const replyParts = Array.isArray(data?.candidates?.[0]?.content?.parts)
    ? data.candidates[0].content.parts
    : [];
  const reply = replyParts
    .map((part: unknown) =>
      part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string"
        ? (part as { text: string }).text
        : "",
    )
    .join("")
    .trim();

  if (!reply) {
    return {
      ok: false as const,
      status: 502,
      error: "The LLM did not return a text response.",
      details: data,
    };
  }

  return { ok: true as const, reply };
}

export async function POST(request: Request) {
  try {
    const legacyLlmKey = process.env.LLM_KEY?.trim() || process.env.LLM_API_KEY?.trim();
    const geminiApiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || legacyLlmKey;
    const llmModel = process.env.LLM_MODEL?.trim() || process.env.VERTEX_MODEL?.trim() || "gemini-2.5-flash";
    const vertexProjectId = process.env.VERTEX_PROJECT_ID?.trim();
    const vertexLocation = process.env.VERTEX_LOCATION?.trim() || "us-central1";
    const vertexApiKey =
      process.env.VERTEX_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || legacyLlmKey;
    const vertexBearerToken =
      process.env.VERTEX_BEARER_TOKEN?.trim() || process.env.GOOGLE_OAUTH_ACCESS_TOKEN?.trim() || legacyLlmKey;
    const configuredVertexAuthMode = process.env.VERTEX_AUTH_MODE?.trim() as VertexAuthMode | undefined;
    const vertexAuthMode =
      configuredVertexAuthMode ?? (vertexBearerToken ? "bearer" : "api_key");
    const configuredProvider = process.env.LLM_PROVIDER?.trim().toLowerCase() as LlmProvider | undefined;
    const hasVertexConfigHints =
      Boolean(vertexProjectId) ||
      Boolean(process.env.VERTEX_AUTH_MODE?.trim()) ||
      Boolean(process.env.VERTEX_API_KEY?.trim()) ||
      Boolean(process.env.VERTEX_BEARER_TOKEN?.trim());
    const provider: LlmProvider = configuredProvider ?? (hasVertexConfigHints ? "vertex" : "gemini");

    if (!geminiApiKey && !vertexApiKey && !vertexBearerToken) {
      return NextResponse.json(
        {
          error:
            "No LLM key found. Set one of: LLM_KEY, LLM_API_KEY, GEMINI_API_KEY, or GOOGLE_API_KEY.",
        },
        { status: 500 },
      );
    }
    if (configuredProvider && configuredProvider !== "vertex" && configuredProvider !== "gemini") {
      return NextResponse.json(
        { error: 'LLM_PROVIDER must be either "vertex" or "gemini".' },
        { status: 500 },
      );
    }
    if (vertexAuthMode !== "api_key" && vertexAuthMode !== "bearer") {
      return NextResponse.json(
        { error: 'VERTEX_AUTH_MODE must be either "api_key" or "bearer".' },
        { status: 500 },
      );
    }

    const body = (await request.json()) as { messages?: ChatMessage[]; calendarEvents?: unknown[] };
    const inputMessages = Array.isArray(body.messages) ? body.messages : [];
    const calendarEvents = Array.isArray(body.calendarEvents)
      ? body.calendarEvents.filter(isCalendarContextEvent).slice(0, 40)
      : [];
    const normalized = normalizeMessages(inputMessages);
    const dashboardContext = await buildDashboardContext(calendarEvents).catch(
      () => "Runtime dashboard snapshot is currently unavailable.",
    );
    const fullSystemContext = `${COPILOT_SYSTEM_CONTEXT}\n\n${dashboardContext}`;

    if (normalized.length === 0) {
      return NextResponse.json({ error: "No message was sent." }, { status: 400 });
    }

    if (provider === "vertex") {
      if (!vertexProjectId) {
        return NextResponse.json(
          {
            error:
              "LLM_PROVIDER=vertex requires VERTEX_PROJECT_ID. Add it to ensure paid Vertex billing is used.",
          },
          { status: 500 },
        );
      }

      if (vertexAuthMode === "api_key" && !vertexApiKey) {
        return NextResponse.json(
          {
            error:
              "VERTEX_AUTH_MODE=api_key requires VERTEX_API_KEY (or GOOGLE_API_KEY/LLM_KEY).",
          },
          { status: 500 },
        );
      }

      if (vertexAuthMode === "bearer" && !vertexBearerToken) {
        return NextResponse.json(
          {
            error:
              "VERTEX_AUTH_MODE=bearer requires VERTEX_BEARER_TOKEN (or LLM_KEY/LLM_API_KEY as bearer token).",
          },
          { status: 500 },
        );
      }
    }

    const result =
      provider === "vertex"
      ? await callVertexGenerateContent(
          normalized,
          vertexAuthMode === "bearer" ? vertexBearerToken! : vertexApiKey!,
          llmModel,
          vertexProjectId!,
          vertexLocation,
          vertexAuthMode,
          fullSystemContext,
        )
      : await callGeminiApiGenerateContent(normalized, geminiApiKey!, llmModel, fullSystemContext);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, details: result.details ?? null },
        { status: result.status },
      );
    }

    return NextResponse.json({ reply: result.reply, provider });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function isCalendarContextEvent(input: unknown): input is CalendarContextEvent {
  if (!input || typeof input !== "object") {
    return false;
  }

  const record = input as Record<string, unknown>;
  return (
    typeof record.day === "string" &&
    typeof record.time === "string" &&
    typeof record.module === "string" &&
    typeof record.room === "string"
  );
}
