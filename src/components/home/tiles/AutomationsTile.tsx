"use client";

const AUTOMATION_TILES = [
  {
    title: "Time based",
    description: "Starte Aktionen zu festen Zeiten oder Intervallen.",
  },
  {
    title: "Location based",
    description: "Führe Workflows aus, sobald du am Campus ankommst.",
  },
  {
    title: "Moodle event based",
    description: "Reagiere automatisch auf neue Aufgaben und Deadlines.",
  },
  {
    title: "Custom",
    description: "Erstelle eigene Regeln mit Bedingungen und Aktionen.",
  },
];

export function AutomationsTile() {
  return (
    <article className="widget widget-wide">
      <h2>Automations</h2>
      <p>Vorgefertigte Trigger als GUI-Vorschau.</p>
      <div className="automation-grid" aria-label="Automation types">
        {AUTOMATION_TILES.map((tile) => (
          <div key={tile.title} className="automation-tile">
            <h3>{tile.title}</h3>
            <p>{tile.description}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
