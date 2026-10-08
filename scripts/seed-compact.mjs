// Emits a compact seed (one DO block) that computes ids/dates in Postgres.
import { SECTIONS, STARTER_TASKS, PODCAST_TASKS, SEED_MEMBERS, SEED_PROJECTS } from "../lib/template.mjs";
const T = (list) => list.map((t) => [t.section, t.title, t.owner, t.anchor, t.offset, t.onlyIfNoLead ? 1 : 0, t.description ?? null]);
const data = {
  m: SEED_MEMBERS.map((x) => [x.key, x.name, x.title, x.role]),
  s: SECTIONS.map((x) => [x.name, x.kind]),
  p: SEED_PROJECTS.map((x) => [x.name, x.purpose, x.color, x.lead, x.start, x.end, x.tasks ?? "event"]),
  t: { event: T(STARTER_TASKS), podcast: T(PODCAST_TASKS) },
};
const json = JSON.stringify(data).replace(/'/g, "''");
process.stdout.write(`do $$
declare j jsonb := '${json}'; mid jsonb := '{}'; x jsonb; p jsonb; t jsonb; pid uuid; lead uuid; sid jsonb; i int; who uuid; anchor date;
begin
for x in select * from jsonb_array_elements(j->'m') loop
  insert into members(name,title,role) values (x->>1,x->>2,x->>3) returning jsonb_set(mid,array[x->>0],to_jsonb(id)) into mid;
end loop;
for p in select * from jsonb_array_elements(j->'p') loop
  lead := case when p->>3 is null then null else (mid->>(p->>3))::uuid end;
  insert into projects(name,purpose,color,lead_id,start_date,end_date,created_by)
    values (p->>0,p->>1,p->>2,lead,(p->>4)::date,(p->>5)::date,(mid->>'tuguldur')::uuid) returning id into pid;
  sid := '{}'; i := 0;
  for x in select * from jsonb_array_elements(j->'s') loop
    insert into sections(project_id,name,kind,position) values (pid,x->>0,x->>1,i) returning jsonb_set(sid,array[x->>0],to_jsonb(id)) into sid; i := i+1;
  end loop;
  i := 0;
  for t in select * from jsonb_array_elements(j->'t'->(p->>6)) loop
    continue when (t->>5)='1' and lead is not null;
    who := case t->>2 when 'lead' then coalesce(lead,(mid->>'tuguldur')::uuid) when 'admin' then (mid->>'tuguldur')::uuid
      when 'coordinator' then (mid->>'tsenguun')::uuid when 'gospel' then (mid->>'nomin')::uuid end;
    anchor := case when t->>3='start' then (p->>4)::date else (p->>5)::date end;
    insert into tasks(project_id,section_id,title,description,assignee_id,due_date,position,created_by)
      values (pid,(sid->>(t->>0))::uuid,t->>1,t->>6,who,anchor+(t->>4)::int,i,(mid->>'tuguldur')::uuid);
    i := i+1;
  end loop;
end loop;
end $$;
`);
