-- 412 Planner: full setup (schema + 2027 seed). Paste into Supabase → SQL Editor → Run.
-- 412 Planner — database schema
-- Run once in Supabase → SQL Editor.
-- Access control is enforced in the app's server actions (Clerk userId → members row);
-- the browser never talks to Supabase directly, so RLS is enabled with no policies
-- (service-role key only).

create extension if not exists "pgcrypto";

-- ── Members ─────────────────────────────────────────────────────────────
-- A member can exist before they sign up (so tasks can be assigned to them).
-- On first sign-in the app links the Clerk account by matching email.
create table if not exists members (
  id            uuid primary key default gen_random_uuid(),
  clerk_user_id text unique,
  email         text unique,
  name          text not null,
  title         text,                       -- e.g. "Project & Calendar Coordinator"
  role          text not null default 'member'
                check (role in ('admin','coordinator','gospel','member')),
  image_url     text,
  created_at    timestamptz not null default now()
);

-- ── Projects ────────────────────────────────────────────────────────────
create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  purpose     text,                          -- "clear purpose" per the team doc
  gospel_purpose text,                       -- Gospel component, owned by the Gospel coordinator
  color       text not null default '#4f46e5',
  lead_id     uuid references members(id) on delete set null,  -- Project Lead
  status      text not null default 'planning'
              check (status in ('planning','on_track','at_risk','off_track','done')),
  start_date  date,
  end_date    date,
  archived    boolean not null default false,
  created_by  uuid references members(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ── Sections (the project's functions: Program, Logistics, Gospel & Outreach…) ──
create table if not exists sections (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  name        text not null,
  kind        text not null default 'general'
              check (kind in ('general','gospel')),   -- 'gospel' sections are editable by the Gospel coordinator
  position    double precision not null default 0
);
create index if not exists sections_project_idx on sections(project_id);

-- ── Tasks ───────────────────────────────────────────────────────────────
create table if not exists tasks (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references projects(id) on delete cascade,
  section_id   uuid references sections(id) on delete set null,
  title        text not null,
  description  text,
  status       text not null default 'todo'
               check (status in ('todo','doing','done')),
  priority     text check (priority in ('low','medium','high')),
  assignee_id  uuid references members(id) on delete set null,
  start_date   date,
  due_date     date,
  position     double precision not null default 0,
  completed_at timestamptz,
  created_by   uuid references members(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists tasks_project_idx  on tasks(project_id);
create index if not exists tasks_assignee_idx on tasks(assignee_id);
create index if not exists tasks_due_idx      on tasks(due_date);

-- ── Comments ────────────────────────────────────────────────────────────
create table if not exists comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references tasks(id) on delete cascade,
  author_id  uuid references members(id) on delete set null,
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists comments_task_idx on comments(task_id);

-- ── Attachments (files live in the private Storage bucket "attachments") ──
create table if not exists attachments (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references tasks(id) on delete cascade,
  uploader_id  uuid references members(id) on delete set null,
  file_name    text not null,
  storage_path text not null,
  size_bytes   bigint,
  mime_type    text,
  created_at   timestamptz not null default now()
);
create index if not exists attachments_task_idx on attachments(task_id);


-- ── Project status updates (Overview tab) ───────────────────────────────
create table if not exists status_updates (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  author_id   uuid references members(id) on delete set null,
  status      text not null check (status in ('on_track','at_risk','off_track','done')),
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists status_updates_project_idx on status_updates(project_id);

-- ── Project messages (Messages tab) ─────────────────────────────────────
create table if not exists project_messages (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  author_id   uuid references members(id) on delete set null,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists project_messages_project_idx on project_messages(project_id);

-- ── Email notifications ─────────────────────────────────────────────────
-- Per-member preferences (all on by default)
alter table members add column if not exists notify_assigned boolean not null default true;  -- task assigned to me
alter table members add column if not exists notify_comments boolean not null default true;  -- comment on my task
alter table members add column if not exists notify_due      boolean not null default true;  -- due tomorrow / overdue reminders
alter table members add column if not exists notify_digest   boolean not null default true;  -- daily "your week ahead" list
alter table members add column if not exists notify_weekly   boolean not null default true;  -- Monday project summary (leads, admin, coordinator)

-- One row per scheduled email actually sent, so a re-run cron never double-sends.
create table if not exists notification_log (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references members(id) on delete cascade,
  kind       text not null,               -- 'daily' | 'weekly'
  sent_on    date not null,               -- ET date
  created_at timestamptz not null default now(),
  unique (member_id, kind, sent_on)
);

alter table members     enable row level security;
alter table projects    enable row level security;
alter table sections    enable row level security;
alter table tasks       enable row level security;
alter table comments    enable row level security;
alter table attachments enable row level security;
alter table status_updates   enable row level security;
alter table project_messages enable row level security;
alter table notification_log enable row level security;

-- Private bucket for task files (25 MB per file)
insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', false, 26214400)
on conflict (id) do nothing;

-- 412 Planner seed data. Run once AFTER schema.sql.
begin;
insert into members (id, name, title, role, email) values ('e07c1d40-4a96-451e-a6b1-d64a2dbce848', 'Tuguldur', 'Events & Outreach Lead', 'admin', null);
insert into members (id, name, title, role, email) values ('cd2186ab-fd90-47a1-a27e-6c776ed9401c', 'Tsenguun', 'Project & Calendar Coordinator', 'coordinator', null);
insert into members (id, name, title, role, email) values ('3866f678-aecb-45ea-aeed-1b996d5edc9f', 'Nomin', 'Gospel & Outreach Coordinator', 'gospel', null);
insert into members (id, name, title, role, email) values ('c32c657d-e2b1-4270-ab41-a7e10b9cf7ff', 'Tamiraa', 'Sports Project Lead', 'member', null);
insert into projects (id, name, purpose, color, lead_id, start_date, end_date, created_by) values ('c9c4bfc5-59a3-4c93-ae5e-6071ad37c35f', 'Good News Cup — Sports', 'Basketball tournament in the Washington DC area, Feb or March 2027. 8–12 teams, one weekend, ~200–300 people at peak.', '#ea580c', 'c32c657d-e2b1-4270-ab41-a7e10b9cf7ff', '2026-10-15', '2027-03-31', 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into sections (id, project_id, name, kind, position) values ('692f53ba-1627-4640-bf48-c71182bdc8fa', 'c9c4bfc5-59a3-4c93-ae5e-6071ad37c35f', 'Program', 'general', 0);
insert into sections (id, project_id, name, kind, position) values ('a2445260-6dae-419d-8ec2-84ae5d753a07', 'c9c4bfc5-59a3-4c93-ae5e-6071ad37c35f', 'Logistics', 'general', 1);
insert into sections (id, project_id, name, kind, position) values ('d025ef33-e3fc-4db1-8386-d114448807ae', 'c9c4bfc5-59a3-4c93-ae5e-6071ad37c35f', 'Volunteers', 'general', 2);
insert into sections (id, project_id, name, kind, position) values ('713f43a9-c663-4258-b999-4ccfac194c93', 'c9c4bfc5-59a3-4c93-ae5e-6071ad37c35f', 'Media', 'general', 3);
insert into sections (id, project_id, name, kind, position) values ('cdf41ff6-b13d-4393-bb6e-71e5a445cf62', 'c9c4bfc5-59a3-4c93-ae5e-6071ad37c35f', 'Finance', 'general', 4);
insert into sections (id, project_id, name, kind, position) values ('19f2e3ff-1660-48c0-a7d7-bbe16e09c2ec', 'c9c4bfc5-59a3-4c93-ae5e-6071ad37c35f', 'Gospel & Outreach', 'gospel', 5);
insert into sections (id, project_id, name, kind, position) values ('5cf955f5-9fb6-4e93-883f-90e9b8c1fc5d', 'c9c4bfc5-59a3-4c93-ae5e-6071ad37c35f', 'Follow-up', 'general', 6);
insert into sections (id, project_id, name, kind, position) values ('21924eaf-1280-4aaf-81d8-c43bf5ed08e7', 'c9c4bfc5-59a3-4c93-ae5e-6071ad37c35f', 'Evaluation', 'general', 7);
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('c9c4bfc5-59a3-4c93-ae5e-6071ad37c35f', '692f53ba-1627-4640-bf48-c71182bdc8fa', 'Write the project plan: purpose, functions, resources', 'Every project needs a clear purpose, owner, timeline, and resources. List which functions this project needs (Program, Logistics, Volunteers, Media, Finance, Gospel & Outreach, Follow-up).', 'c32c657d-e2b1-4270-ab41-a7e10b9cf7ff', '2026-10-29', 0, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('c9c4bfc5-59a3-4c93-ae5e-6071ad37c35f', '692f53ba-1627-4640-bf48-c71182bdc8fa', 'Build the timeline and add deadlines to the master calendar', 'Project & Calendar Coordinator helps the Project Lead set dates, deadlines and meetings, and checks for conflicts with other 412 projects.', 'cd2186ab-fd90-47a1-a27e-6c776ed9401c', '2026-11-05', 1, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('c9c4bfc5-59a3-4c93-ae5e-6071ad37c35f', '19f2e3ff-1660-48c0-a7d7-bbe16e09c2ec', 'Define the Gospel purpose of this project', 'Work with the Project Lead on how the Gospel will be shared at this event.', '3866f678-aecb-45ea-aeed-1b996d5edc9f', '2026-11-14', 2, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('c9c4bfc5-59a3-4c93-ae5e-6071ad37c35f', '19f2e3ff-1660-48c0-a7d7-bbe16e09c2ec', 'Recruit Gospel, testimony, prayer and conversation volunteers', null, '3866f678-aecb-45ea-aeed-1b996d5edc9f', '2027-01-30', 3, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('c9c4bfc5-59a3-4c93-ae5e-6071ad37c35f', '19f2e3ff-1660-48c0-a7d7-bbe16e09c2ec', 'Prepare and coach the Gospel team', null, '3866f678-aecb-45ea-aeed-1b996d5edc9f', '2027-03-10', 4, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('c9c4bfc5-59a3-4c93-ae5e-6071ad37c35f', '19f2e3ff-1660-48c0-a7d7-bbe16e09c2ec', 'Confirm Gospel speaker and testimony', null, '3866f678-aecb-45ea-aeed-1b996d5edc9f', '2027-03-01', 5, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('c9c4bfc5-59a3-4c93-ae5e-6071ad37c35f', '692f53ba-1627-4640-bf48-c71182bdc8fa', 'Readiness check: is every component ready?', 'Project Lead integrates everything before the event.', 'c32c657d-e2b1-4270-ab41-a7e10b9cf7ff', '2027-03-24', 6, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('c9c4bfc5-59a3-4c93-ae5e-6071ad37c35f', '5cf955f5-9fb6-4e93-883f-90e9b8c1fc5d', 'Plan immediate follow-up for new contacts', null, '3866f678-aecb-45ea-aeed-1b996d5edc9f', '2027-03-17', 7, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('c9c4bfc5-59a3-4c93-ae5e-6071ad37c35f', '21924eaf-1280-4aaf-81d8-c43bf5ed08e7', 'Evaluate the whole project', null, 'c32c657d-e2b1-4270-ab41-a7e10b9cf7ff', '2027-04-14', 8, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('c9c4bfc5-59a3-4c93-ae5e-6071ad37c35f', '21924eaf-1280-4aaf-81d8-c43bf5ed08e7', 'Evaluate Gospel & outreach fruit', null, '3866f678-aecb-45ea-aeed-1b996d5edc9f', '2027-04-14', 9, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('c9c4bfc5-59a3-4c93-ae5e-6071ad37c35f', '21924eaf-1280-4aaf-81d8-c43bf5ed08e7', 'Document lessons learned and project information', null, 'cd2186ab-fd90-47a1-a27e-6c776ed9401c', '2027-04-21', 10, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into projects (id, name, purpose, color, lead_id, start_date, end_date, created_by) values ('6b77167c-82c2-4cf9-9e62-32f8d6267cab', 'Open Mic — Chicago', 'One-evening performance night in the Chicago metro, Feb–April 2027 window. 200–300 attendees; needs stage, sound and lighting.', '#7c3aed', null, '2026-11-01', '2027-04-30', 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into sections (id, project_id, name, kind, position) values ('9435b367-ce1e-4119-be72-dcab59125c65', '6b77167c-82c2-4cf9-9e62-32f8d6267cab', 'Program', 'general', 0);
insert into sections (id, project_id, name, kind, position) values ('2bc6dc40-7a6e-42b8-aeed-2dbae1aec236', '6b77167c-82c2-4cf9-9e62-32f8d6267cab', 'Logistics', 'general', 1);
insert into sections (id, project_id, name, kind, position) values ('a305fe2e-c4fe-4e02-bef9-55e21d6e0609', '6b77167c-82c2-4cf9-9e62-32f8d6267cab', 'Volunteers', 'general', 2);
insert into sections (id, project_id, name, kind, position) values ('c2239bf8-521c-4806-9a61-1fe61183dfe8', '6b77167c-82c2-4cf9-9e62-32f8d6267cab', 'Media', 'general', 3);
insert into sections (id, project_id, name, kind, position) values ('2622b1d0-d3fe-4747-bb6d-9a22383efd44', '6b77167c-82c2-4cf9-9e62-32f8d6267cab', 'Finance', 'general', 4);
insert into sections (id, project_id, name, kind, position) values ('b14eef95-8179-41e6-a2c6-190232d165fd', '6b77167c-82c2-4cf9-9e62-32f8d6267cab', 'Gospel & Outreach', 'gospel', 5);
insert into sections (id, project_id, name, kind, position) values ('630f37bb-68d3-4c02-b139-bfcdaa7adc85', '6b77167c-82c2-4cf9-9e62-32f8d6267cab', 'Follow-up', 'general', 6);
insert into sections (id, project_id, name, kind, position) values ('478ee0ca-81ba-4726-a82e-0c2a21fe9df3', '6b77167c-82c2-4cf9-9e62-32f8d6267cab', 'Evaluation', 'general', 7);
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('6b77167c-82c2-4cf9-9e62-32f8d6267cab', '9435b367-ce1e-4119-be72-dcab59125c65', 'Assign a Project Lead', 'Events & Outreach Lead assigns the Project Lead who owns the whole project.', 'e07c1d40-4a96-451e-a6b1-d64a2dbce848', '2026-11-08', 0, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('6b77167c-82c2-4cf9-9e62-32f8d6267cab', '9435b367-ce1e-4119-be72-dcab59125c65', 'Write the project plan: purpose, functions, resources', 'Every project needs a clear purpose, owner, timeline, and resources. List which functions this project needs (Program, Logistics, Volunteers, Media, Finance, Gospel & Outreach, Follow-up).', 'e07c1d40-4a96-451e-a6b1-d64a2dbce848', '2026-11-15', 1, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('6b77167c-82c2-4cf9-9e62-32f8d6267cab', '9435b367-ce1e-4119-be72-dcab59125c65', 'Build the timeline and add deadlines to the master calendar', 'Project & Calendar Coordinator helps the Project Lead set dates, deadlines and meetings, and checks for conflicts with other 412 projects.', 'cd2186ab-fd90-47a1-a27e-6c776ed9401c', '2026-11-22', 2, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('6b77167c-82c2-4cf9-9e62-32f8d6267cab', 'b14eef95-8179-41e6-a2c6-190232d165fd', 'Define the Gospel purpose of this project', 'Work with the Project Lead on how the Gospel will be shared at this event.', '3866f678-aecb-45ea-aeed-1b996d5edc9f', '2026-12-01', 3, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('6b77167c-82c2-4cf9-9e62-32f8d6267cab', 'b14eef95-8179-41e6-a2c6-190232d165fd', 'Recruit Gospel, testimony, prayer and conversation volunteers', null, '3866f678-aecb-45ea-aeed-1b996d5edc9f', '2027-03-01', 4, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('6b77167c-82c2-4cf9-9e62-32f8d6267cab', 'b14eef95-8179-41e6-a2c6-190232d165fd', 'Prepare and coach the Gospel team', null, '3866f678-aecb-45ea-aeed-1b996d5edc9f', '2027-04-09', 5, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('6b77167c-82c2-4cf9-9e62-32f8d6267cab', 'b14eef95-8179-41e6-a2c6-190232d165fd', 'Confirm Gospel speaker and testimony', null, '3866f678-aecb-45ea-aeed-1b996d5edc9f', '2027-03-31', 6, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('6b77167c-82c2-4cf9-9e62-32f8d6267cab', '9435b367-ce1e-4119-be72-dcab59125c65', 'Readiness check: is every component ready?', 'Project Lead integrates everything before the event.', 'e07c1d40-4a96-451e-a6b1-d64a2dbce848', '2027-04-23', 7, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('6b77167c-82c2-4cf9-9e62-32f8d6267cab', '630f37bb-68d3-4c02-b139-bfcdaa7adc85', 'Plan immediate follow-up for new contacts', null, '3866f678-aecb-45ea-aeed-1b996d5edc9f', '2027-04-16', 8, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('6b77167c-82c2-4cf9-9e62-32f8d6267cab', '478ee0ca-81ba-4726-a82e-0c2a21fe9df3', 'Evaluate the whole project', null, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848', '2027-05-14', 9, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('6b77167c-82c2-4cf9-9e62-32f8d6267cab', '478ee0ca-81ba-4726-a82e-0c2a21fe9df3', 'Evaluate Gospel & outreach fruit', null, '3866f678-aecb-45ea-aeed-1b996d5edc9f', '2027-05-14', 10, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('6b77167c-82c2-4cf9-9e62-32f8d6267cab', '478ee0ca-81ba-4726-a82e-0c2a21fe9df3', 'Document lessons learned and project information', null, 'cd2186ab-fd90-47a1-a27e-6c776ed9401c', '2027-05-21', 11, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into projects (id, name, purpose, color, lead_id, start_date, end_date, created_by) values ('475decde-c868-419d-b719-ad4110d11ebe', 'Annual Youth Conference 2027', '412''s annual youth conference, June 2027.', '#0891b2', null, '2026-11-01', '2027-06-30', 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into sections (id, project_id, name, kind, position) values ('09176642-b7b9-4e00-9e04-7764a9707819', '475decde-c868-419d-b719-ad4110d11ebe', 'Program', 'general', 0);
insert into sections (id, project_id, name, kind, position) values ('da928122-d307-4772-a269-f7ae056633fd', '475decde-c868-419d-b719-ad4110d11ebe', 'Logistics', 'general', 1);
insert into sections (id, project_id, name, kind, position) values ('f727733b-4818-4f12-9cb3-cf8ab1673109', '475decde-c868-419d-b719-ad4110d11ebe', 'Volunteers', 'general', 2);
insert into sections (id, project_id, name, kind, position) values ('882394a3-dad7-4f07-8813-bf125b51b7f1', '475decde-c868-419d-b719-ad4110d11ebe', 'Media', 'general', 3);
insert into sections (id, project_id, name, kind, position) values ('bad7aa48-dba9-4f07-a853-668a3dfaddfc', '475decde-c868-419d-b719-ad4110d11ebe', 'Finance', 'general', 4);
insert into sections (id, project_id, name, kind, position) values ('d5027f8a-73c9-4b04-9735-6fdc4ad91635', '475decde-c868-419d-b719-ad4110d11ebe', 'Gospel & Outreach', 'gospel', 5);
insert into sections (id, project_id, name, kind, position) values ('191eb205-34e7-4da1-a50b-ac6479de141b', '475decde-c868-419d-b719-ad4110d11ebe', 'Follow-up', 'general', 6);
insert into sections (id, project_id, name, kind, position) values ('9905aa99-aeb1-4ca7-8fc7-735884d69ebd', '475decde-c868-419d-b719-ad4110d11ebe', 'Evaluation', 'general', 7);
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('475decde-c868-419d-b719-ad4110d11ebe', '09176642-b7b9-4e00-9e04-7764a9707819', 'Assign a Project Lead', 'Events & Outreach Lead assigns the Project Lead who owns the whole project.', 'e07c1d40-4a96-451e-a6b1-d64a2dbce848', '2026-11-08', 0, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('475decde-c868-419d-b719-ad4110d11ebe', '09176642-b7b9-4e00-9e04-7764a9707819', 'Write the project plan: purpose, functions, resources', 'Every project needs a clear purpose, owner, timeline, and resources. List which functions this project needs (Program, Logistics, Volunteers, Media, Finance, Gospel & Outreach, Follow-up).', 'e07c1d40-4a96-451e-a6b1-d64a2dbce848', '2026-11-15', 1, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('475decde-c868-419d-b719-ad4110d11ebe', '09176642-b7b9-4e00-9e04-7764a9707819', 'Build the timeline and add deadlines to the master calendar', 'Project & Calendar Coordinator helps the Project Lead set dates, deadlines and meetings, and checks for conflicts with other 412 projects.', 'cd2186ab-fd90-47a1-a27e-6c776ed9401c', '2026-11-22', 2, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('475decde-c868-419d-b719-ad4110d11ebe', 'd5027f8a-73c9-4b04-9735-6fdc4ad91635', 'Define the Gospel purpose of this project', 'Work with the Project Lead on how the Gospel will be shared at this event.', '3866f678-aecb-45ea-aeed-1b996d5edc9f', '2026-12-01', 3, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('475decde-c868-419d-b719-ad4110d11ebe', 'd5027f8a-73c9-4b04-9735-6fdc4ad91635', 'Recruit Gospel, testimony, prayer and conversation volunteers', null, '3866f678-aecb-45ea-aeed-1b996d5edc9f', '2027-05-01', 4, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('475decde-c868-419d-b719-ad4110d11ebe', 'd5027f8a-73c9-4b04-9735-6fdc4ad91635', 'Prepare and coach the Gospel team', null, '3866f678-aecb-45ea-aeed-1b996d5edc9f', '2027-06-09', 5, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('475decde-c868-419d-b719-ad4110d11ebe', 'd5027f8a-73c9-4b04-9735-6fdc4ad91635', 'Confirm Gospel speaker and testimony', null, '3866f678-aecb-45ea-aeed-1b996d5edc9f', '2027-05-31', 6, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('475decde-c868-419d-b719-ad4110d11ebe', '09176642-b7b9-4e00-9e04-7764a9707819', 'Readiness check: is every component ready?', 'Project Lead integrates everything before the event.', 'e07c1d40-4a96-451e-a6b1-d64a2dbce848', '2027-06-23', 7, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('475decde-c868-419d-b719-ad4110d11ebe', '191eb205-34e7-4da1-a50b-ac6479de141b', 'Plan immediate follow-up for new contacts', null, '3866f678-aecb-45ea-aeed-1b996d5edc9f', '2027-06-16', 8, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('475decde-c868-419d-b719-ad4110d11ebe', '9905aa99-aeb1-4ca7-8fc7-735884d69ebd', 'Evaluate the whole project', null, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848', '2027-07-14', 9, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('475decde-c868-419d-b719-ad4110d11ebe', '9905aa99-aeb1-4ca7-8fc7-735884d69ebd', 'Evaluate Gospel & outreach fruit', null, '3866f678-aecb-45ea-aeed-1b996d5edc9f', '2027-07-14', 10, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('475decde-c868-419d-b719-ad4110d11ebe', '9905aa99-aeb1-4ca7-8fc7-735884d69ebd', 'Document lessons learned and project information', null, 'cd2186ab-fd90-47a1-a27e-6c776ed9401c', '2027-07-21', 11, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into projects (id, name, purpose, color, lead_id, start_date, end_date, created_by) values ('9bf5b62a-b513-4fd8-bfb1-181b8044f860', '412 Podcast', 'Monthly YouTube podcast, year-round: youth questions never answered in church and basics for new believers. Batch 4–5 episodes per shoot.', '#16a34a', null, '2027-01-01', '2027-12-31', 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into sections (id, project_id, name, kind, position) values ('23ca57e0-ee50-4717-a13e-e820e2e8768d', '9bf5b62a-b513-4fd8-bfb1-181b8044f860', 'Program', 'general', 0);
insert into sections (id, project_id, name, kind, position) values ('8ab2c4d6-279f-4780-b6dc-8b4439bd0b1d', '9bf5b62a-b513-4fd8-bfb1-181b8044f860', 'Logistics', 'general', 1);
insert into sections (id, project_id, name, kind, position) values ('a7df8afa-d732-43cd-a082-7a05b1bac17a', '9bf5b62a-b513-4fd8-bfb1-181b8044f860', 'Volunteers', 'general', 2);
insert into sections (id, project_id, name, kind, position) values ('dd65a83f-c414-4608-942b-0ea71a79bbd3', '9bf5b62a-b513-4fd8-bfb1-181b8044f860', 'Media', 'general', 3);
insert into sections (id, project_id, name, kind, position) values ('8b06612a-9224-4de8-9d35-14c057d298cc', '9bf5b62a-b513-4fd8-bfb1-181b8044f860', 'Finance', 'general', 4);
insert into sections (id, project_id, name, kind, position) values ('c30baef3-fc0f-4ae9-854d-3dad1877f2d8', '9bf5b62a-b513-4fd8-bfb1-181b8044f860', 'Gospel & Outreach', 'gospel', 5);
insert into sections (id, project_id, name, kind, position) values ('9f96c0fd-b244-4883-9d98-7d2672b8ac1b', '9bf5b62a-b513-4fd8-bfb1-181b8044f860', 'Follow-up', 'general', 6);
insert into sections (id, project_id, name, kind, position) values ('232b48d8-5097-4b63-974b-592fa985e4dc', '9bf5b62a-b513-4fd8-bfb1-181b8044f860', 'Evaluation', 'general', 7);
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('9bf5b62a-b513-4fd8-bfb1-181b8044f860', '23ca57e0-ee50-4717-a13e-e820e2e8768d', 'Assign a Project Lead', null, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848', '2026-11-17', 0, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('9bf5b62a-b513-4fd8-bfb1-181b8044f860', '23ca57e0-ee50-4717-a13e-e820e2e8768d', 'Write the podcast plan: format, host, episode length', null, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848', '2026-12-02', 1, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('9bf5b62a-b513-4fd8-bfb1-181b8044f860', '8ab2c4d6-279f-4780-b6dc-8b4439bd0b1d', 'Set up production zones: East Coast, Central, West Coast (camera, sound, lighting)', null, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848', '2026-12-11', 2, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('9bf5b62a-b513-4fd8-bfb1-181b8044f860', 'dd65a83f-c414-4608-942b-0ea71a79bbd3', 'Recruit an editing / social media team for each zone', null, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848', '2026-12-11', 3, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('9bf5b62a-b513-4fd8-bfb1-181b8044f860', '23ca57e0-ee50-4717-a13e-e820e2e8768d', 'Open question collection on YouTube, the website and social media', null, 'cd2186ab-fd90-47a1-a27e-6c776ed9401c', '2026-12-18', 4, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('9bf5b62a-b513-4fd8-bfb1-181b8044f860', 'c30baef3-fc0f-4ae9-854d-3dad1877f2d8', 'Line up leaders and counseling pastors to prepare biblical answers', null, '3866f678-aecb-45ea-aeed-1b996d5edc9f', '2026-12-18', 5, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('9bf5b62a-b513-4fd8-bfb1-181b8044f860', '23ca57e0-ee50-4717-a13e-e820e2e8768d', 'Film batch 1 (episodes 1–5)', null, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848', '2027-01-08', 6, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('9bf5b62a-b513-4fd8-bfb1-181b8044f860', 'dd65a83f-c414-4608-942b-0ea71a79bbd3', 'Release episode 1', null, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848', '2027-01-31', 7, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('9bf5b62a-b513-4fd8-bfb1-181b8044f860', '23ca57e0-ee50-4717-a13e-e820e2e8768d', 'Film batch 2 (episodes 6–10)', null, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848', '2027-05-01', 8, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
insert into tasks (project_id, section_id, title, description, assignee_id, due_date, position, created_by) values ('9bf5b62a-b513-4fd8-bfb1-181b8044f860', '232b48d8-5097-4b63-974b-592fa985e4dc', 'Mid-year review: views, questions received, fruit', null, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848', '2027-06-30', 9, 'e07c1d40-4a96-451e-a6b1-d64a2dbce848');
commit;
