# 412 Planner

Private, Asana-style project planner for 412 Ministry teams, served at **plan.ministry412.com** and linked from the main Wix/Squarespace site.

**Stack:** Next.js 16 (App Router) · Clerk (invite-only accounts) · Supabase (Postgres + Storage) · Vercel

## What's in it

| Area | What it does |
|---|---|
| **Home** | Greeting, your stats, project cards, and your next tasks |
| **Inbox** | Comments on your tasks, new assignments, project messages and status updates (last 30 days) |
| **My tasks** | Your tasks bucketed: Overdue / Today / Next 7 days / Later / No date |
| **Projects** | All projects as cards, plus "Create project" |
| **Portfolios** | Every project's status, lead, dates, % complete and late tasks in one table |
| **Timeline** | Master Gantt of all projects, with an optional view of all open tasks too |
| **Gospel & Outreach** | Every project's Gospel purpose and Gospel-lane tasks |
| **Team** | Admin adds people, emails and roles; accounts link on first sign-in |

**Project tabs**

| Tab | What it does |
|---|---|
| Overview | Description, Gospel purpose, project roles, status updates (On track / At risk / Off track), key dates, coming up |
| List | Tasks by section, "+ Add task", "+ Add section", check off |
| Board | Drag-and-drop To do / In progress / Done |
| Timeline | Gantt by section with a today line |
| Dashboard | Total / completed / incomplete / overdue, tasks by section, status donut, by assignee, next 8 weeks |
| Calendar | Month grid; multi-day tasks span as bars |
| Files | Every attachment in the project |
| Messages | Project-wide conversation |

### Email notifications & reminders

| Email | When | Who gets it |
|---|---|---|
| **Task assigned** | Right away | The new assignee. A project created from the template sends **one** "you were assigned N tasks" email per person. |
| **New comment** | Right away | Everyone following the task: assignee, creator, and earlier commenters (not the person who wrote it) |
| **Daily reminder** | Every day at ~7 AM ET | Anyone with tasks overdue, due today, or due tomorrow, plus the rest of the week if "week-ahead" is on. Nothing is sent if they have nothing due. |
| **Monday summary** | Mondays at ~8 AM ET | Admins and the Coordinator (all projects); each Project Lead (their projects) |

Each member can switch these on and off under **Notifications** (`/settings`). Every email has a settings link. Scheduled emails are logged in `notification_log`, so a cron that runs twice never double-sends.

Clicking any task opens the **task drawer**: assignee, status, dates, section, priority, description, comments, and file attachments (up to 25 MB, private).

### Roles (from the "412 Events and Outreach team" doc)

| Role | Who | Can |
|---|---|---|
| Admin | Events & Outreach Lead (Tuguldur) | Everything: team, projects, assigning Project Leads |
| Coordinator | Project & Calendar Coordinator (Tsenguun) | Edit every project, task and timeline |
| Gospel & Outreach | Gospel & Outreach Coordinator (Nomin) | Edit Gospel & Outreach sections and Gospel purpose in every project |
| Project Lead | Assigned per project (e.g. Tamiraa → Good News Cup) | Edit everything in their project |
| Member | Everyone else | View all, add tasks, comment, attach files, update tasks assigned to them |

New projects can use the **412 template**: the 8 sections plus starter tasks for each step of the team's project lifecycle (assign lead → project plan → timeline → Gospel purpose → recruit/prepare Gospel team → readiness check → follow-up → evaluation), auto-assigned and dated from the event date.

---

## Deploy (about 30–45 min)

### 1. Supabase
1. Create a project at supabase.com (free tier is fine). Region: **East US**.
2. **SQL Editor** → paste `supabase/schema.sql` → Run. This creates the tables and the private `attachments` bucket.
3. **Project Settings → API**: copy the URL, the `anon` key, and the `service_role` key.

### 2. Clerk
1. Create an application at dashboard.clerk.com named "412 Planner". Enable Email (and Google if you want).
2. **Configure → Restrictions → Sign-up mode: Restricted**. Only invited people can create accounts.
3. Copy the publishable key and secret key.
4. Before going live: create a **Production** instance and add the domain `plan.ministry412.com` (Clerk will show the DNS records it needs; send them to the domain owner along with the Vercel CNAME).

### 3. Local run and seed
```bash
cp .env.example .env.local     # fill in the keys
npm install
npm run seed                   # adds Tuguldur, Tsenguun, Nomin, Tamiraa + the 4 projects for 2027
npm run dev                    # http://localhost:3000
```

### 4. Vercel
1. Push this folder to GitHub (e.g. `utudesign/412-planner`) → **vercel.com → Add New → Project → Import**.
2. **Framework Preset: Next.js** (auto-detected). Build command `next build`, output default. Node 20+.
3. **Environment Variables**: add everything from `.env.example` (Production + Preview).
4. Deploy. Test on the `*.vercel.app` URL first.
5. **Settings → Domains → Add** `plan.ministry412.com`. Vercel shows the CNAME to add.

> **Stripe:** not used. The planner has no payments, so there's no webhook to configure. If donations or event registration are added later, add the Stripe webhook endpoint in Vercel at that point.

### 5. Email (Resend)
1. Sign up at resend.com → **Domains → Add domain** `ministry412.com`. Resend lists 2–3 DNS records (SPF + DKIM, sometimes an MX on a `send` subdomain). Add them to the DNS request below.
2. **API Keys → Create** → put it in `RESEND_API_KEY` on Vercel.
3. On Vercel, also set `EMAIL_FROM` (e.g. `412 Planner <planner@ministry412.com>`), `APP_URL=https://plan.ministry412.com`, and `CRON_SECRET` (any long random string).
4. The cron jobs are defined in `vercel.json` and register automatically on deploy:
   - `/api/cron/daily` at `0 11 * * *` UTC = **7 AM EDT / 6 AM EST**
   - `/api/cron/weekly` at `0 12 * * 1` UTC = **8 AM EDT / 7 AM EST Monday**

   Vercel cron runs in UTC, so times shift an hour when Daylight Saving ends (Nov 1, 2026). On the Hobby plan, Vercel may run a daily job anytime within that hour.
5. Test after deploy: `curl -H "Authorization: Bearer $CRON_SECRET" https://plan.ministry412.com/api/cron/daily` returns `{sent, skipped, failed}`.

Locally with no `RESEND_API_KEY`, emails are only logged. Set `EMAIL_OUTBOX_DIR=./outbox` to save them as .html files you can open.

### 6. DNS (whoever controls ministry412.com): send this as one request
| Type | Name | Value | For |
|---|---|---|---|
| CNAME | `plan` | `cname.vercel-dns.com` (use the exact value Vercel shows) | The planner site |
| CNAME ×N | as shown by Clerk Production | as shown by Clerk | Sign-in |
| TXT / MX / CNAME | as shown by Resend | as shown by Resend | Email delivery (SPF/DKIM) |

### 7. Link it from the website
- **Wix:** Edit site → Menus → Add item → Link → Web address `https://plan.ministry412.com` → open in **new tab** → label "Team Login".
- **Squarespace:** Pages → Main/Footer navigation → **+** → Link → `https://plan.ministry412.com` → "Team Login".

### 8. Invite people
1. In the planner, **Team** → add each person's email and role (or fix the seeded rows).
2. In Clerk → **Users → Invite** the same email. When they accept and sign in, their account links to their row, along with all tasks already assigned to them.

---

## Notes
- All database access goes through server actions using the service-role key. Permissions are enforced in `lib/perm.ts`. The browser only talks to Supabase to upload files, using one-time signed URLs.
- Dates are date-only and display in US Eastern Time. Comment timestamps show ET.
- The site is `noindex`, and every route except `/sign-in` requires login.
- Not built yet: @mentions, recurring tasks (e.g. a monthly podcast episode), task dependencies, subtasks.
