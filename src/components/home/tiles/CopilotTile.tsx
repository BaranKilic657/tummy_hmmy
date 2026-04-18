"use client";

export function CopilotTile() {
  return (
    <article className="widget widget-copilot">
      <h2>UNI Copilot</h2>
      <p>Ask about deadlines, rooms, tasks, or your study plan.</p>
      <div className="copilot-input">
        <span>Ask your copilot...</span>
        <button type="button" aria-label="Send">
          →
        </button>
      </div>
    </article>
  );
}
