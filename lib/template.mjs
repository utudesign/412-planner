// Project template derived from "412 Events and Outreach team" (team structure doc).
// Used by the seed script and by "New project" in the app, so every project
// starts with the same functions and the same 8-step lifecycle.

/** Functions every project plan identifies (doc step 3). `kind: "gospel"` = owned by the Gospel & Outreach Coordinator. */
export const SECTIONS = [
  { name: "Program", kind: "general" },
  { name: "Logistics", kind: "general" },
  { name: "Volunteers", kind: "general" },
  { name: "Media", kind: "general" },
  { name: "Finance", kind: "general" },
  { name: "Gospel & Outreach", kind: "gospel" },
  { name: "Follow-up", kind: "general" },
  { name: "Evaluation", kind: "general" },
];

/**
 * Starter tasks (doc steps 2–8).
 * owner: "lead" | "coordinator" | "gospel" | "admin" → who gets assigned.
 * anchor/offset: due date = project start/end date + offset days.
 */
export const STARTER_TASKS = [
  { section: "Program", title: "Assign a Project Lead", owner: "admin", anchor: "start", offset: 7, onlyIfNoLead: true,
    description: "Events & Outreach Lead assigns the Project Lead who owns the whole project." },
  { section: "Program", title: "Write the project plan: purpose, functions, resources", owner: "lead", anchor: "start", offset: 14,
    description: "Every project needs a clear purpose, owner, timeline, and resources. List which functions this project needs (Program, Logistics, Volunteers, Media, Finance, Gospel & Outreach, Follow-up)." },
  { section: "Program", title: "Build the timeline and add deadlines to the master calendar", owner: "coordinator", anchor: "start", offset: 21,
    description: "Project & Calendar Coordinator helps the Project Lead set dates, deadlines and meetings, and checks for conflicts with other 412 projects." },
  { section: "Gospel & Outreach", title: "Define the Gospel purpose of this project", owner: "gospel", anchor: "start", offset: 30,
    description: "Work with the Project Lead on how the Gospel will be shared at this event." },
  { section: "Gospel & Outreach", title: "Recruit Gospel, testimony, prayer and conversation volunteers", owner: "gospel", anchor: "end", offset: -60 },
  { section: "Gospel & Outreach", title: "Prepare and coach the Gospel team", owner: "gospel", anchor: "end", offset: -21 },
  { section: "Gospel & Outreach", title: "Confirm Gospel speaker and testimony", owner: "gospel", anchor: "end", offset: -30 },
  { section: "Program", title: "Readiness check: is every component ready?", owner: "lead", anchor: "end", offset: -7,
    description: "Project Lead integrates everything before the event." },
  { section: "Follow-up", title: "Plan immediate follow-up for new contacts", owner: "gospel", anchor: "end", offset: -14 },
  { section: "Evaluation", title: "Evaluate the whole project", owner: "lead", anchor: "end", offset: 14 },
  { section: "Evaluation", title: "Evaluate Gospel & outreach fruit", owner: "gospel", anchor: "end", offset: 14 },
  { section: "Evaluation", title: "Document lessons learned and project information", owner: "coordinator", anchor: "end", offset: 21 },
];

/** Seed data: people and 2027 projects from the team doc and the 2027 agenda. */
export const SEED_MEMBERS = [
  { key: "tuguldur", name: "Tuguldur", title: "Events & Outreach Lead", role: "admin" },
  { key: "tsenguun", name: "Tsenguun", title: "Project & Calendar Coordinator", role: "coordinator" },
  { key: "nomin", name: "Nomin", title: "Gospel & Outreach Coordinator", role: "gospel" },
  { key: "tamiraa", name: "Tamiraa", title: "Sports Project Lead", role: "member" },
];

export const SEED_PROJECTS = [
  { name: "Good News Cup — Sports", color: "#ea580c", lead: "tamiraa", start: "2026-10-15", end: "2027-03-31",
    purpose: "Basketball tournament in the Washington DC area, Feb or March 2027. 8–12 teams, one weekend, ~200–300 people at peak." },
  { name: "Open Mic — Chicago", color: "#7c3aed", lead: null, start: "2026-11-01", end: "2027-04-30",
    purpose: "One-evening performance night in the Chicago metro, Feb–April 2027 window. 200–300 attendees; needs stage, sound and lighting." },
  { name: "Annual Youth Conference 2027", color: "#0891b2", lead: null, start: "2026-11-01", end: "2027-06-30",
    purpose: "412's annual youth conference, June 2027." },
  { name: "412 Podcast", color: "#16a34a", lead: null, start: "2027-01-01", end: "2027-12-31", tasks: "podcast",
    purpose: "Monthly YouTube podcast, year-round: youth questions never answered in church and basics for new believers. Batch 4–5 episodes per shoot." },
];

/** The podcast is a year-round series, so it gets its own starter tasks instead of the event lifecycle. */
export const PODCAST_TASKS = [
  { section: "Program", title: "Assign a Project Lead", owner: "admin", anchor: "start", offset: -45, onlyIfNoLead: true },
  { section: "Program", title: "Write the podcast plan: format, host, episode length", owner: "lead", anchor: "start", offset: -30 },
  { section: "Logistics", title: "Set up production zones: East Coast, Central, West Coast (camera, sound, lighting)", owner: "lead", anchor: "start", offset: -21 },
  { section: "Media", title: "Recruit an editing / social media team for each zone", owner: "lead", anchor: "start", offset: -21 },
  { section: "Program", title: "Open question collection on YouTube, the website and social media", owner: "coordinator", anchor: "start", offset: -14 },
  { section: "Gospel & Outreach", title: "Line up leaders and counseling pastors to prepare biblical answers", owner: "gospel", anchor: "start", offset: -14 },
  { section: "Program", title: "Film batch 1 (episodes 1–5)", owner: "lead", anchor: "start", offset: 7 },
  { section: "Media", title: "Release episode 1", owner: "lead", anchor: "start", offset: 30 },
  { section: "Program", title: "Film batch 2 (episodes 6–10)", owner: "lead", anchor: "start", offset: 120 },
  { section: "Evaluation", title: "Mid-year review: views, questions received, fruit", owner: "lead", anchor: "start", offset: 180 },
];

export function addDays(isoDate, days) {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Resolve a starter task's assignee member id. people = { admin, coordinator, gospel } ids (may be null). */
export function ownerFor(owner, leadId, people) {
  if (owner === "lead") return leadId ?? people.admin ?? null;
  return people[owner] ?? null;
}
