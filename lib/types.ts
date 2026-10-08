export type Role = "admin" | "coordinator" | "gospel" | "member";
export type TaskStatus = "todo" | "doing" | "done";
export type ProjectStatus = "planning" | "on_track" | "at_risk" | "off_track" | "done";

export interface Member {
  id: string;
  clerk_user_id: string | null;
  email: string | null;
  name: string;
  title: string | null;
  role: Role;
  image_url: string | null;
  notify_assigned: boolean;
  notify_comments: boolean;
  notify_due: boolean;
  notify_digest: boolean;
  notify_weekly: boolean;
}

export interface Project {
  id: string;
  name: string;
  purpose: string | null;
  gospel_purpose: string | null;
  color: string;
  lead_id: string | null;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  archived: boolean;
}

export interface Section {
  id: string;
  project_id: string;
  name: string;
  kind: "general" | "gospel";
  position: number;
}

export interface Task {
  id: string;
  project_id: string;
  section_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: "low" | "medium" | "high" | null;
  assignee_id: string | null;
  start_date: string | null;
  due_date: string | null;
  position: number;
  completed_at: string | null;
}

export interface Comment {
  id: string;
  task_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
}

export interface Attachment {
  id: string;
  task_id: string;
  uploader_id: string | null;
  file_name: string;
  storage_path: string;
  size_bytes: number | null;
  created_at: string;
}

export interface StatusUpdate {
  id: string;
  project_id: string;
  author_id: string | null;
  status: Exclude<ProjectStatus, "planning">;
  body: string;
  created_at: string;
}

export interface ProjectMessage {
  id: string;
  project_id: string;
  author_id: string | null;
  body: string;
  created_at: string;
}

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  coordinator: "Coordinator",
  gospel: "Gospel & Outreach",
  member: "Member",
};

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To do",
  doing: "In progress",
  done: "Done",
};

export const PROJECT_STATUS: Record<ProjectStatus, { label: string; cls: string }> = {
  planning: { label: "Planning", cls: "bg-slate-100 text-slate-700" },
  on_track: { label: "On track", cls: "bg-emerald-100 text-emerald-800" },
  at_risk: { label: "At risk", cls: "bg-amber-100 text-amber-800" },
  off_track: { label: "Off track", cls: "bg-rose-100 text-rose-800" },
  done: { label: "Complete", cls: "bg-indigo-100 text-indigo-800" },
};
