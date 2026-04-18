"use client";

import { FormEvent, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const INITIAL_MESSAGES: Message[] = [
  {
    role: "assistant",
    content: "Hi, I am your simple chatbot. Send me a message.",
  },
];

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const text = input.trim();
    if (!text || isLoading) {
      return;
    }

    const nextMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setIsLoading(true);

    try {
      const requestPayload = { messages: nextMessages };

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      const data = (await response.json()) as { error?: string; reply?: string };

      if (!response.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "API error");
      }

      const reply = typeof data?.reply === "string" ? data.reply : "";
      if (!reply) {
        throw new Error("No reply from the model.");
      }

      setMessages((current) => [...current, { role: "assistant", content: reply }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages(INITIAL_MESSAGES);
    setInput("");
    setError("");
  };

  return (
    <main className="screen chat-screen">
      <section className="chat-card">
        <h1>Chatbot</h1>

          <div className="chat-toolbar">
            <button type="button" className="chat-secondary-btn" onClick={clearChat} disabled={isLoading}>
              Clear Chat
            </button>
          </div>

        <div className="chat-messages" aria-live="polite">
          {messages.map((message, index) => (
            <article key={index} className={`chat-bubble chat-${message.role}`}>
              <p>{message.content}</p>
            </article>
          ))}
          {isLoading ? <p className="chat-loading">Loading response...</p> : null}
        </div>

        <form className="chat-form" onSubmit={onSubmit}>
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Type a message..."
            aria-label="Message"
          />
          <button type="submit" disabled={isLoading}>
            Send
          </button>
        </form>

        {error ? <p className="chat-error">{error}</p> : null}
      </section>
    </main>
  );
}
