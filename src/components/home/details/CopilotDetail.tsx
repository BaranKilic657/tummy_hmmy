"use client";

import { FormEvent } from "react";

import { useCopilotChat } from "../copilot/useCopilotChat";

export function CopilotDetail() {
  const { messages, input, setInput, isLoading, error, sendCurrentInput } = useCopilotChat();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendCurrentInput();
  }

  return (
    <section className="copilot-detail copilot-chat-detail">
      <p className="detail-subtitle">Full chat history</p>

      <div className="chat-messages copilot-detail-messages" aria-live="polite">
        {messages.map((message, index) => (
          <article key={`${message.role}-${index}`} className={`chat-bubble chat-${message.role}`}>
            <p>{message.content}</p>
          </article>
        ))}
        {isLoading ? <p className="chat-loading">Loading response...</p> : null}
      </div>

      <form className="chat-form copilot-detail-form" onSubmit={onSubmit}>
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask your copilot..."
          aria-label="Ask your copilot"
        />
        <button type="submit" disabled={isLoading}>
          Send
        </button>
      </form>

      {error ? <p className="chat-error">{error}</p> : null}
    </section>
  );
}
