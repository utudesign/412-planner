// Generates supabase/seed.sql (same data as scripts/seed.mjs) for pasting into the Supabase SQL editor.
import fs from "node:fs";
import crypto from "node:crypto";
import { SECTIONS, STARTER_TASKS, PODCAST_TASKS, SEED_MEMBERS, SEED_PROJECTS, addDays, ownerFor } from "../lib/template.mjs";
const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const id = () => crypto.randomUUID();
const out = ["-- 412 Planner seed data. Run once AFTER schema.sql.", "begin;"];
const m = {};
for (const x of SEED_MEMBERS) {
  m[x.key] = id();
  out.push(`insert into members (id, name, title, role, email) values (${q(m[x.key])}, ${q(x.name)}, ${q(x.title)}, ${q(x.role)}, ${q(x.email ?? null)});`);
}
const people = { admin: m.tuguldur, coordinator: m.tsenguun, gospel: m.nomin };
for (const p of SEED_PROJECTS) {
  const pid = id(), lead = p.lead ? m[p.lead] : null;
  out.push(`insert into projects (id, name, purpose, color, lead_id, start_date, end_date, created_by) values (${q(pid)}, ${q(p.name)}, ${q(p.purpose)}, ${q(p.color)}, ${q(lead)}, ${q(p.start)}, ${q(p.end)}, ${q(m.tuguldur)});`);
  const sec = {};
  SECTIONS.forEach((s, i) => { sec[s.name] = id(); out.push(`insert into sections (id, project_id, name, kind, position) values (${q(sec[s.name])}, ${q(pid)}, ${q(s.name)}, ${q(s.kind)}, ${i});`); });
  (p.tasks === "podcast" ? PODCAST_TASKS : STARTER_TASKS).filter((t) => !(t.onlyIfNoLead && lead)).forEach((t, i) => {
    out.push(`insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values (${q(pid)}, ${q(sec[t.section])}, ${q(t.title)}, ${q(t.description ?? null)}, ${q(ownerFor(t.owner, lead, people))}, ${q(addDays(t.anchor === "start" ? p.start : p.end, t.offset))}, ${i}, ${q(m.tuguldur)});`);
  });
}
out.push("commit;");
fs.writeFileSync(new URL("../supabase/seed.sql", import.meta.url), out.join("\n") + "\n");
console.log("wrote supabase/seed.sql", out.length, "lines");
