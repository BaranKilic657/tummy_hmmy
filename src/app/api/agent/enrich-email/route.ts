import { NextResponse } from "next/server";
import { retrieveCogneeContext } from "@/server/chat/cognee";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type EnrichEmailRequest = {
  to?: string;
  subject?: string;
  body?: string;
  messages?: ChatMessage[];
  latestUserPrompt?: string;
};

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as EnrichEmailRequest;
    const to = String(body.to ?? "").trim();
    const subject = String(body.subject ?? "").trim();
    const draftBody = String(body.body ?? "").trim();
    const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    const latestUserPrompt = String(body.latestUserPrompt ?? "").trim();

    if (isValidEmail(to)) {
      return NextResponse.json({ resolvedTo: to, source: "provided", warning: null });
    }

    const contactHint = extractContactHint(to, subject, draftBody, latestUserPrompt);
    const query = buildContactQuery(contactHint, subject, draftBody, latestUserPrompt);

    const retrieval = await retrieveCogneeContext({
      latestUserPrompt: query,
      messages,
    });

    const candidateEmails = extractEmails(retrieval.context);
    const resolved = rankEmails(candidateEmails, contactHint)[0] ?? null;

    if (!resolved) {
      return NextResponse.json(
        {
          resolvedTo: null,
          source: "cognee",
          warning: retrieval.warning || "No email address found in Cognee response.",
          query,
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      resolvedTo: resolved,
      source: "cognee",
      warning: retrieval.warning ?? null,
      query,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function extractContactHint(to: string, subject: string, body: string, latestUserPrompt: string) {
  const joined = `${to} ${subject} ${body} ${latestUserPrompt}`.trim();
  const clean = joined
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/[^a-zA-Z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) {
    return "TUM student support";
  }

  const lower = clean.toLowerCase();
  if (lower.includes("service desk")) {
    return "TUM Service Desk";
  }
  if (lower.includes("erasmus") || lower.includes("semester abroad") || lower.includes("exchange")) {
    return "TUM International Center";
  }
  if (lower.includes("moodle")) {
    return "TUM Moodle support";
  }

  return clean.split(" ").slice(0, 8).join(" ");
}

function buildContactQuery(contactHint: string, subject: string, body: string, latestUserPrompt: string) {
  const compactContext = `${subject} ${body} ${latestUserPrompt}`
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);

  const contextClause = compactContext ? ` Context: ${compactContext}.` : "";

  return `Find the official email address for ${contactHint} at TUM. Return contact details relevant to this request.${contextClause}`;
}

function extractEmails(text: string): string[] {
  if (!text) {
    return [];
  }

  const found = text.match(EMAIL_REGEX) ?? [];
  return [...new Set(found.map((entry) => entry.trim().toLowerCase()))];
}

function rankEmails(emails: string[], hint: string): string[] {
  const hintLower = hint.toLowerCase();

  return [...emails].sort((a, b) => scoreEmail(b, hintLower) - scoreEmail(a, hintLower));
}

function scoreEmail(email: string, hintLower: string): number {
  let score = 0;

  if (email.endsWith("@tum.de") || email.endsWith("@mytum.de")) {
    score += 4;
  }
  if (hintLower.includes("service desk") && email.includes("service")) {
    score += 3;
  }
  if (hintLower.includes("international") && email.includes("international")) {
    score += 3;
  }
  if (hintLower.includes("moodle") && email.includes("moodle")) {
    score += 3;
  }

  return score;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
