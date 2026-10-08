// Seeds the 412 team (from "412 Events and Outreach team") and the 2027 projects.
// Usage:  npm run seed        (reads .env.local)
// Safe to re-run: skips members/projects that already exist by name.
import { createClient } from "@supabase/supabase-js";
import { SECTIONS, STARTER_TASKS, PODCAST_TASKS, SEED_MEMBERS, SEED_PROJECTS, addDays, ownerFor } from "../lib/template.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Run: npm run seed (with .env.local filled in)");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const must = ({ data, error }) => { if (error) throw new Error(error.message); return data; };

// 1. Members
const ids = {};
for (const m of SEED_MEMBERS) {
  const existing = must(await db.from("members").select("id").eq("name", m.name).maybeSingle());
  if (existing) { ids[m.key] = existing.id; console.log(`• member exists: ${m.name}`); continue; }
  const row = must(await db.from("members")
    .insert({ name: m.name, title: m.title, role: m.role, email: m.email ?? null })
    .select("id").single());
  ids[m.key] = row.id;
  console.log(`+ member: ${m.name} (${m.role})`);
}
const people = { admin: ids.tuguldur, coordinator: ids.tsenguun, gospel: ids.nomin };

// 2. Projects + sections + starter tasks
for (const p of SEED_PROJECTS) {
  const existing = must(await db.from("projects").select("id").eq("name", p.name).maybeSingle());
  if (existing) { console.log(`• project exists: ${p.name}`); continue; }
  const leadId = p.lead ? ids[p.lead] : null;
  const project = must(await db.from("projects").insert({
    name: p.name, purpose: p.purpose, color: p.color, lead_id: leadId,
    start_date: p.start, end_date: p.end, created_by: ids.tuguldur,
  }).select("*").single());

  const sections = must(await db.from("sections")
    .insert(SECTIONS.map((s, i) => ({ project_id: project.id, name: s.name, kind: s.kind, position: i })))
    .select("*"));

  const tasks = (p.tasks === "podcast" ? PODCAST_TASKS : STARTER_TASKS).filter((t) => !(t.onlyIfNoLead && leadId)).map((t, i) => ({
    project_id: project.id,
    section_id: sections.find((s) => s.name === t.section)?.id ?? null,
    title: t.title,
    description: t.description ?? null,
    assignee_id: ownerFor(t.owner, leadId, people),
    due_date: addDays(t.anchor === "start" ? p.start : p.end, t.offset),
    position: i,
    created_by: ids.tuguldur,
  }));
  must(await db.from("tasks").insert(tasks));
  console.log(`+ project: ${p.name} (${tasks.length} starter tasks)`);
}
console.log("Done.");
