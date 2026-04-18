"use client";

import { FormEvent } from "react";

import { useCopilotChat } from "../copilot/useCopilotChat";

export function CopilotTile() {
  const { input, setInput, isLoading, error, latestAssistantMessage, sendCurrentInput } = useCopilotChat();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    await sendCurrentInput();
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
