"use client";

import { MOODLE_COURSES, MOODLE_DEADLINES, MOODLE_UPDATES } from "../data/moodleData";

export function MoodleDetail() {
  return (
    <section className="moodle-detail">
      <p className="detail-subtitle">Detailed Moodle overview</p>

      <div className="moodle-section">
        <h3>Courses</h3>
        <div className="moodle-chips">
          {MOODLE_COURSES.map((course) => (
            <span key={course} className="moodle-chip">
              {course}
            </span>
          ))}
        </div>
      </div>

      <div className="moodle-section">
        <h3>Upcoming deadlines</h3>
        <ul className="moodle-list">
          {MOODLE_DEADLINES.map((item) => (
            <li key={item.title} className="moodle-item">
              <strong>{item.title}</strong>
              <span>Due {item.due}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="moodle-section">
        <h3>Latest updates</h3>
        <ul className="moodle-list">
          {MOODLE_UPDATES.map((update) => (
            <li key={update} className="moodle-item moodle-item-single">
              <span>{update}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
