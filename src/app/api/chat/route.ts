import { NextResponse } from "next/server";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type BedrockContentBlock = { text: string };

type BedrockMessage = {
  role: "user" | "assistant";
  content: BedrockContentBlock[];
};

export async function POST(request: Request) {
  try {
    const apiKey = process.env.BEDROCK_API_KEY;
    const region = process.env.BEDROCK_REGION ?? "us-east-1";
    const modelId = process.env.BEDROCK_MODEL_ID ?? "us.anthropic.claude-3-5-haiku-20241022-v1:0";

    if (!apiKey) {
      return NextResponse.json(
        { error: "BEDROCK_API_KEY fehlt in der .env Datei." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as { messages?: ChatMessage[] };
    const inputMessages = Array.isArray(body.messages) ? body.messages : [];

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

    if (normalized.length === 0) {
      return NextResponse.json({ error: "Keine Nachricht gesendet." }, { status: 400 });
    }

    const bedrockUrl = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(modelId)}/converse`;

    const response = await fetch(bedrockUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        messages: normalized,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const message =
        typeof data?.message === "string"
          ? data.message
          : "Bedrock Anfrage fehlgeschlagen.";
      return NextResponse.json({ error: message, details: data }, { status: response.status });
    }

    const reply =
      typeof data?.output?.message?.content?.[0]?.text === "string"
        ? data.output.message.content[0].text
        : "";

    if (!reply) {
      return NextResponse.json(
        { error: "Die API hat keine Textantwort geliefert.", details: data },
        { status: 502 },
      );
    }

    return NextResponse.json({ reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unbekannter Fehler";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
