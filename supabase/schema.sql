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
