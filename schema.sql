-- TABLES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null
);
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now()
);
create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (project_id, user_id)
);
create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  planned_date date,
  status text not null default 'Open' check (status in ('Open','Done'))
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.milestones(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  status text not null default 'Todo' check (status in ('Todo','In Progress','In Review','Done')),
  priority text not null default 'Medium' check (priority in ('Low','Medium','High')),
  planned_date date,
  assigned_to uuid references public.profiles(id) on delete set null
);

-- PROFILE TRIGGER
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)), new.email)
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- HELPER FUNCTIONS
create or replace function public.is_project_member(pid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from project_members where project_id = pid and user_id = auth.uid());
$$;
create or replace function public.is_member_user(pid uuid, uid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from project_members where project_id = pid and user_id = uid);
$$;

-- RLS
alter table profiles enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;
alter table milestones enable row level security;
alter table tasks enable row level security;

create policy profiles_select on profiles for select using (true);
create policy profiles_update on profiles for update using (auth.uid() = id);

create policy projects_select on projects for select to authenticated
  using (owner_id = auth.uid() or public.is_project_member(id));
create policy projects_insert on projects for insert with check (owner_id = auth.uid());
create policy projects_update on projects for update using (owner_id = auth.uid());
create policy projects_delete on projects for delete using (owner_id = auth.uid());

create policy pm_select on project_members for select using (true);
create policy pm_insert on project_members for insert
  with check (project_id in (select id from projects where owner_id = auth.uid()));
create policy pm_delete on project_members for delete
  using (project_id in (select id from projects where owner_id = auth.uid()));

create policy milestones_select on milestones for select
  using (project_id in (select id from projects where owner_id = auth.uid())
      or project_id in (select project_id from project_members where user_id = auth.uid()));
create policy milestones_insert on milestones for insert
  with check (project_id in (select id from projects where owner_id = auth.uid()));
create policy milestones_update on milestones for update
  using (project_id in (select id from projects where owner_id = auth.uid()));
create policy milestones_delete on milestones for delete
  using (project_id in (select id from projects where owner_id = auth.uid()));

create policy tasks_select_owner on tasks for select
  using (project_id in (select id from projects where owner_id = auth.uid()));
create policy tasks_select_member on tasks for select
  using (assigned_to = auth.uid());
create policy tasks_insert on tasks for insert to authenticated
  with check (
    exists (select 1 from projects where id = project_id and owner_id = auth.uid())
    and (assigned_to is null or public.is_member_user(project_id, assigned_to)));
create policy tasks_update_owner on tasks for update to authenticated
  using (exists (select 1 from projects where id = project_id and owner_id = auth.uid()))
  with check (
    exists (select 1 from projects where id = project_id and owner_id = auth.uid())
    and (assigned_to is null or public.is_member_user(project_id, assigned_to)));
create policy tasks_update_member on tasks for update
  using (assigned_to = auth.uid()) with check (assigned_to = auth.uid());
create policy tasks_delete on tasks for delete
  using (project_id in (select id from projects where owner_id = auth.uid()));

-- MEMBER CAN CHANGE ONLY STATUS
create or replace function public.enforce_member_status_only()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from projects where id = old.project_id and owner_id = auth.uid()) then
    return new;
  end if;
  if new.id is distinct from old.id
     or new.project_id is distinct from old.project_id
     or new.milestone_id is distinct from old.milestone_id
     or new.title is distinct from old.title
     or new.priority is distinct from old.priority
     or new.planned_date is distinct from old.planned_date
     or new.assigned_to is distinct from old.assigned_to then
    raise exception 'Members can only change the status of a task';
  end if;
  return new;
end; $$;
create trigger tasks_member_status_only before update on tasks
for each row execute function public.enforce_member_status_only();