import { NextResponse } from "next/server";
import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ConverseCommandInput,
} from "@aws-sdk/client-bedrock-runtime";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type BedrockContentBlock = { text: string };

type BedrockMessage = {
  role: "user" | "assistant";
  content: BedrockContentBlock[];
};

function normalizeMessages(inputMessages: ChatMessage[]): BedrockMessage[] {
  const normalized: BedrockMessage[] = inputMessages
    .filter((message) => message && (message.role === "user" || message.role === "assistant"))
    .map((message) => ({
      role: message.role,
      content: [{ text: String(message.content ?? "") }],
    }))
    .filter((message) => message.content[0].text.trim().length > 0);

  while (normalized[0]?.role === "assistant") {
    normalized.shift();
  }

  return normalized;
}

function extractErrorMessage(data: unknown): string {
  if (!data || typeof data !== "object") {
    return "Bedrock request failed.";
  }

  const record = data as Record<string, unknown>;
  if (typeof record.message === "string") {
    return record.message;
  }
  if (typeof record.Message === "string") {
    return record.Message;
  }
  if (typeof record.error === "string") {
    return record.error;
  }
  if (typeof record.__type === "string") {
    return record.__type;
  }

  return "Bedrock request failed.";
}

async function callWithBearerToken(
  messages: BedrockMessage[],
  region: string,
  modelId: string,
  bearerToken: string,
) {
  const bedrockUrl = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(modelId)}/converse`;

  const response = await fetch(bedrockUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearerToken}`,
    },
    body: JSON.stringify({
      messages,
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
      error: extractErrorMessage(data),
      details: data,
    };
  }

  const reply =
    typeof data?.output?.message?.content?.[0]?.text === "string"
      ? data.output.message.content[0].text
      : "";

  if (!reply) {
    return {
      ok: false as const,
      status: 502,
      error: "The API did not return a text response.",
      details: data,
    };
  }

  return { ok: true as const, reply };
}

async function callWithAwsCredentials(messages: BedrockMessage[], region: string, modelId: string) {
  const client = new BedrockRuntimeClient({ region });
  const input: ConverseCommandInput = {
    modelId,
    messages,
  };

  const output = await client.send(new ConverseCommand(input));
  const reply = output.output?.message?.content?.find((block) => typeof block.text === "string")?.text;

  if (!reply) {
    return {
      ok: false as const,
      status: 502,
      error: "The API did not return a text response.",
      details: output,
    };
  }

  return { ok: true as const, reply };
}

export async function POST(request: Request) {
  try {
    const bearerToken = process.env.BEDROCK_API_KEY ?? process.env.AWS_BEARER_TOKEN;
    const region = process.env.BEDROCK_REGION ?? "us-east-1";
    const modelId = process.env.BEDROCK_MODEL_ID ?? "us.anthropic.claude-3-5-haiku-20241022-v1:0";

    if (!bearerToken && !process.env.AWS_ACCESS_KEY_ID) {
      return NextResponse.json(
        {
          error:
            "BEDROCK_API_KEY (or AWS_BEARER_TOKEN) is missing. Alternatively set AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY.",
        },
        { status: 500 },
      );
    }

    const body = (await request.json()) as { messages?: ChatMessage[] };
    const inputMessages = Array.isArray(body.messages) ? body.messages : [];
    const normalized = normalizeMessages(inputMessages);

    if (normalized.length === 0) {
      return NextResponse.json({ error: "No message was sent." }, { status: 400 });
    }

    const result = bearerToken
      ? await callWithBearerToken(normalized, region, modelId, bearerToken)
      : await callWithAwsCredentials(normalized, region, modelId);

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, details: result.details ?? null },
        { status: result.status },
      );
    }

    return NextResponse.json({ reply: result.reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
