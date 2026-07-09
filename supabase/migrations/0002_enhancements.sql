-- 0002: project detail fields + task photos

alter table projects
  add column if not exists client       text,
  add column if not exists location     text,
  add column if not exists budget       numeric,
  add column if not exists budget_actual numeric;

alter table tasks
  add column if not exists photos text[] default '{}';

-- allow engineers to update tasks (progress, reorder, rename)
create policy if not exists eng_write_tasks on tasks
  for all using (my_role() in ('admin','engineer'))
  with check (my_role() in ('admin','engineer'));

-- activity_log: actors can insert their own rows
create policy if not exists self_log on activity_log
  for insert with check (actor_id = auth.uid());
