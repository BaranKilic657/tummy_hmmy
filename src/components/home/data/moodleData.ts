export type MoodleDeadline = {
  title: string;
  due: string;
};

export const MOODLE_COURSES = [
  "Signals & Systems",
  "Electrical Circuits",
  "Embedded Systems Lab",
];

export const MOODLE_DEADLINES: MoodleDeadline[] = [
  { title: "Problem Set 4", due: "Tue, 18:00" },
  { title: "Lab Report 2", due: "Thu, 23:59" },
];

export const MOODLE_UPDATES = [
  "New forum post in Control Engineering",
  "Lecture slides uploaded for Field Theory",
];
