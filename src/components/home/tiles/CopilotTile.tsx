"use client";

export function CopilotTile() {
  return (
    <article className="widget widget-copilot">
      <h2>UNI Copilot</h2>
      <p>Frag nach Fristen, Räumen, Aufgaben oder Lernplan.</p>
      <div className="copilot-input">
        <span>Frag deinen Copilot...</span>
        <button type="button" aria-label="Send">
          →
        </button>
      </div>
    </article>
  );
}
