"use client";

const AUTOMATION_TILES = [
  {
    title: "Time based",
    description: "Start actions at fixed times or intervals.",
  },
  {
    title: "Location based",
    description: "Run workflows as soon as you arrive on campus.",
  },
  {
    title: "Moodle event based",
    description: "React automatically to new tasks and deadlines.",
  },
  {
    title: "Custom",
    description: "Create your own rules with conditions and actions.",
  },
];

export function AutomationsTile() {
  return (
    <article className="widget widget-wide">
      <h2>Automation</h2>
      <p>Prebuilt triggers as a GUI preview.</p>
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
