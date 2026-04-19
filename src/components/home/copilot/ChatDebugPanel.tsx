"use client";

import { useMemo } from "react";

type ChatDebugPayload = {
  apiRequest?: unknown;
  cognee?: unknown;
  llm?: unknown;
};

type ChatDebugPanelProps = {
  debug: ChatDebugPayload | null;
};

export function ChatDebugPanel({ debug }: ChatDebugPanelProps) {
  if (!isLocalhostClient()) {
    return null;
  }

  const summary = useMemo(() => {
    const llm = asRecord(debug?.llm);
    const cognee = asRecord(debug?.cognee);
    return {
      provider: typeof llm.provider === "string" ? llm.provider : "unknown",
      model: typeof llm.model === "string" ? llm.model : "unknown",
      cogneeUsed: typeof cognee.used === "boolean" ? cognee.used : false,
      llmStatus: typeof llm.status === "number" ? String(llm.status) : "n/a",
    };
  }, [debug]);

  if (!debug) {
    return (
      <details className="chat-debug-panel">
        <summary>Pipeline Debug</summary>
        <p className="chat-debug-empty">No debug payload yet. Send a message first.</p>
      </details>
    );
  }

  return (
    <details className="chat-debug-panel chat-debug-panel-active" open>
      <summary>Pipeline Debug</summary>

      <div className="chat-debug-meta">
        <span>LLM: {summary.provider}</span>
        <span>Model: {summary.model}</span>
        <span>Cognee: {summary.cogneeUsed ? "used" : "not used"}</span>
        <span>Status: {summary.llmStatus}</span>
      </div>

      <div className="chat-toolbar">
        <button type="button" className="chat-secondary-btn" onClick={() => printToConsole(debug)}>
          Print To Console
        </button>
      </div>

      <div className="chat-debug-grid">
        <section className="chat-debug-section">
          <h4>Client Request</h4>
          <pre>{pretty(debug.apiRequest)}</pre>
        </section>

        <section className="chat-debug-section">
          <h4>Cognee</h4>
          <pre>{pretty(debug.cognee)}</pre>
        </section>

        <section className="chat-debug-section">
          <h4>LLM</h4>
          <pre>{pretty(debug.llm)}</pre>
        </section>
      </div>
    </details>
  );
}

function printToConsole(debug: ChatDebugPayload) {
  if (typeof window === "undefined") {
    return;
  }

  console.group("[TUMmy Debug] Manual print");
  console.log("Client Request", debug.apiRequest);
  console.log("Cognee", debug.cognee);
  console.log("LLM", debug.llm);
  console.groupEnd();
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function isLocalhostClient(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function pretty(value: unknown): string {
  if (value == null) {
    return "null";
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
