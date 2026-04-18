"use client";

import { MOODLE_COURSES, MOODLE_DEADLINES, MOODLE_UPDATES } from "../data/moodleData";

export function MoodleTile() {
  const nextDeadline = MOODLE_DEADLINES[0];

  return (
    <article className="widget widget-moodle widget-moodle-compact">
      <h2>Moodle</h2>
      <p>Course rooms, submissions, and new announcements.</p>

      <div className="moodle-kpis" aria-label="Moodle overview">
        <div className="moodle-kpi">
          <strong>{MOODLE_COURSES.length}</strong>
          <span>Courses</span>
        </div>
        <div className="moodle-kpi">
          <strong>{MOODLE_DEADLINES.length}</strong>
          <span>Deadlines</span>
        </div>
        <div className="moodle-kpi">
          <strong>{MOODLE_UPDATES.length}</strong>
          <span>Updates</span>
        </div>
      </div>

      <div className="moodle-next">
        <span>Next deadline</span>
        <strong>{nextDeadline.title}</strong>
        <em>Due {nextDeadline.due}</em>
      </div>
    </article>
  );
}
