-- SNPro — Project Overview & Knowledge Hub — initial schema
-- Run via: supabase db push  (or paste into Supabase SQL editor)

create type app_role       as enum ('admin', 'engineer', 'viewer');
create type project_status as enum ('future', 'in_progress', 'completed');
create type doc_category   as enum ('contract', 'engineering', 'report');

-- ── Users & Roles ─────────────────────────────
create table profiles (
  id         uuid primary key references auth.users on delete cascade,
  full_name  text not null,
  role       app_role not null default 'viewer',
  avatar_url text,
  created_at timestamptz default now()
);

-- helper: current user's role (used by RLS)
create or replace function my_role() returns app_role
  language sql stable security definer set search_path = public as
$$ select role from profiles where id = auth.uid() $$;

-- ── Projects ──────────────────────────────────
create table projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  contract_no text,
  status      project_status not null default 'future',
  start_date  date,
  end_date    date,
  description text,
  created_by  uuid references profiles(id),
  created_at  timestamptz default now(),
  search_tsv  tsvector generated always as (
                to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(contract_no,''))
              ) stored
);
create index projects_search_idx on projects using gin(search_tsv);

create table project_members (
  project_id uuid references projects on delete cascade,
  user_id    uuid references profiles on delete cascade,
  primary key (project_id, user_id)
);

-- ── Tab 1: Tasks + Dependency (Gantt) ─────────
create table tasks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects on delete cascade,
  parent_id   uuid references tasks(id) on delete cascade,
  name        text not null,
  assignee_id uuid references profiles(id),
  start_date  date,
  end_date    date,
  progress    smallint not null default 0 check (progress between 0 and 100),
  sort_order  int default 0
);
create table task_dependencies (
  predecessor_id uuid references tasks on delete cascade,
  successor_id   uuid references tasks on delete cascade,
  primary key (predecessor_id, successor_id)
);

-- ── Tab 2: Documents + Versioning ─────────────
create table documents (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects on delete cascade,
  category   doc_category not null,
  title      text not null,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
create table document_versions (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references documents on delete cascade,
  version      int not null,
  storage_path text not null,
  file_type    text,
  size_bytes   bigint,
  uploaded_by  uuid references profiles(id),
  uploaded_at  timestamptz default now(),
  unique (document_id, version)
);

-- ── Tab 3: Troubleshooting (Before/After) ─────
create table troubleshooting_cases (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references projects on delete cascade,
  title         text not null,
  problem_desc  text,
  symptoms      text,
  before_images text[],
  solution_desc text,
  parts_used    text,
  after_images  text[],
  tags          text[],
  created_by    uuid references profiles(id),
  created_at    timestamptz default now(),
  search_tsv    tsvector generated always as (
                  to_tsvector('simple',
                    coalesce(title,'')||' '||coalesce(problem_desc,'')||' '||
                    coalesce(solution_desc,'')||' '||array_to_string(tags,' '))
                ) stored
);
create index cases_search_idx on troubleshooting_cases using gin(search_tsv);

-- ── Tab 4: Comments + Activity Log ────────────
create table comments (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects on delete cascade,
  author_id  uuid references profiles(id),
  body       text not null,
  mentions   uuid[],
  created_at timestamptz default now()
);
create table activity_log (
  id         bigserial primary key,
  project_id uuid references projects on delete cascade,
  actor_id   uuid references profiles(id),
  action     text not null,
  entity     text,
  entity_id  uuid,
  created_at timestamptz default now()
);

-- ── RBAC via RLS ──────────────────────────────
-- viewer: read all. engineer: write content. admin: everything incl. projects/tasks.
alter table profiles              enable row level security;
alter table projects              enable row level security;
alter table tasks                 enable row level security;
alter table documents             enable row level security;
alter table document_versions     enable row level security;
alter table troubleshooting_cases enable row level security;
alter table comments              enable row level security;
alter table activity_log          enable row level security;

-- everyone authenticated can read
create policy read_all on projects              for select using (auth.role() = 'authenticated');
create policy read_all on tasks                 for select using (auth.role() = 'authenticated');
create policy read_all on documents             for select using (auth.role() = 'authenticated');
create policy read_all on document_versions     for select using (auth.role() = 'authenticated');
create policy read_all on troubleshooting_cases for select using (auth.role() = 'authenticated');
create policy read_all on comments              for select using (auth.role() = 'authenticated');
create policy read_all on activity_log          for select using (auth.role() = 'authenticated');
create policy read_all on profiles              for select using (auth.role() = 'authenticated');

-- admin-only structural tables (projects, tasks)
create policy admin_write on projects for all using (my_role() = 'admin') with check (my_role() = 'admin');
create policy admin_write on tasks    for all using (my_role() = 'admin') with check (my_role() = 'admin');

-- engineer + admin can write content
create policy eng_write on documents             for all using (my_role() in ('admin','engineer')) with check (my_role() in ('admin','engineer'));
create policy eng_write on document_versions     for all using (my_role() in ('admin','engineer')) with check (my_role() in ('admin','engineer'));
create policy eng_write on troubleshooting_cases for all using (my_role() in ('admin','engineer')) with check (my_role() in ('admin','engineer'));
create policy eng_write on comments              for all using (my_role() in ('admin','engineer')) with check (my_role() in ('admin','engineer'));

-- users manage own profile; admin manages all
create policy own_profile on profiles for update using (id = auth.uid() or my_role() = 'admin');

-- ── auto-create profile on signup ─────────────
create or replace function handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as
$$ begin
  insert into profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();
