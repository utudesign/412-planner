import type { Member, Project, Section, Task } from "./types";

/**
 * Lanes from the team structure doc:
 *  - Admin (Events & Outreach Lead): owns the whole system and the Project Leads.
 *  - Coordinator (Project & Calendar): keeps every project organized → edits all projects.
 *  - Gospel (Gospel & Outreach Coordinator): owns Gospel & Outreach sections in every project.
 *  - Project Lead: owns one project completely.
 *  - Everyone: can view all, add tasks, comment, and update tasks assigned to them.
 */
export const isManager = (me: Member) => me.role === "admin" || me.role === "coordinator";

export const canManageProject = (me: Member, p: Pick<Project, "lead_id">) =>
  isManager(me) || p.lead_id === me.id;

export const canEditTask = (
  me: Member,
  p: Pick<Project, "lead_id">,
  t: Pick<Task, "assignee_id">,
  section?: Pick<Section, "kind"> | null,
) =>
  canManageProject(me, p) ||
  t.assignee_id === me.id ||
  (me.role === "gospel" && section?.kind === "gospel");

export const canDeleteTask = (me: Member, p: Pick<Project, "lead_id">) => canManageProject(me, p);
