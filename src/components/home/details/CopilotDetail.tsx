"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import { useCopilotChat } from "../copilot/useCopilotChat";

export function CopilotDetail() {
  const {
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
  } = useCopilotChat();
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  useEffect(() => {
    const element = messagesRef.current;
    if (!element || !isNearBottom) {
      return;
    }

    element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading, isNearBottom]);

  const handleThreadScroll = () => {
    const element = messagesRef.current;
    if (!element) {
      return;
    }

    const distanceToBottom = element.scrollHeight - (element.scrollTop + element.clientHeight);
    setIsNearBottom(distanceToBottom < 60);
  };

  const jumpToLatest = () => {
    const element = messagesRef.current;
    if (!element) {
      return;
    }

    element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
    setIsNearBottom(true);
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendCurrentInput();
  }

  return (
    <section className="copilot-detail copilot-chat-detail">
      <div className="copilot-top-row">
        <p className="detail-subtitle">Full chat history</p>

        <div className="chat-toolbar">
          <button type="button" className="chat-secondary-btn" onClick={clearChat} disabled={isLoading}>
            Clear Chat
          </button>
        </div>
      </div>

      <div
        ref={messagesRef}
        className="chat-messages copilot-detail-messages"
        aria-live="polite"
        onScroll={handleThreadScroll}
      >
        {messages.map((message, index) => (
          <article key={`${message.role}-${index}`} className={`chat-bubble chat-${message.role}`}>
            <p>{message.content}</p>
          </article>
        ))}
        {isLoading ? <p className="chat-loading">Loading response...</p> : null}
      </div>

      {!isNearBottom ? (
        <div className="copilot-jump-wrap">
          <button type="button" className="chat-secondary-btn" onClick={jumpToLatest}>
            Jump to latest
          </button>
        </div>
      ) : null}

      <form className="chat-form copilot-detail-form copilot-detail-form-sticky" onSubmit={onSubmit}>
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

      <details className="agent-actions-panel" aria-label="Planned copilot actions" open={pendingActions.length > 0}>
        <summary className="agent-actions-summary-row">
          <span>Action Center</span>
          <span>{pendingActions.length} pending</span>
        </summary>

        {actionStatus ? <p className="agent-actions-status">{actionStatus}</p> : null}

        {pendingActions.length === 0 ? (
          <p className="agent-actions-empty">No pending actions. Ask me to draft an email, plan registration, or add events.</p>
        ) : (
          <div className="agent-actions-list">
            {pendingActions.map((action) => (
              <article key={action.id} className="agent-action-card">
                <p className="agent-action-type">{action.action.replaceAll("_", " ")}</p>
                <p className="agent-action-summary">{action.summary}</p>
                <div className="agent-action-buttons">
                  <button type="button" className="chat-secondary-btn" onClick={() => void runAction(action.id)}>
                    Run action
                  </button>
                  <button type="button" className="chat-secondary-btn" onClick={() => dismissAction(action.id)}>
                    Dismiss
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="agent-actions-examples">
          <p>Examples:</p>
          <p>"Draft an email to my tutor asking for an extension."</p>
          <p>"Prepare registration steps for IN2064 in SS2026."</p>
          <p>"Add exam prep on Wednesday from 14:00 to 16:00 in Library."</p>
        </div>
      </details>
    </section>
  );
}
