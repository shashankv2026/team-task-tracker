-- Step 1: Create profiles table
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique
);

-- Step 2: Create projects table
create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now()
);

-- Step 3: Create project_members table
create table project_members (
  project_id uuid references projects(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  primary key (project_id, user_id)
);

-- Step 4: Create milestones table
create table milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  planned_date date,
  status text not null default 'Open' check (status in ('Open', 'Done'))
);

-- Step 5: Create tasks table
create table tasks (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references milestones(id) on delete cascade,
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  status text not null default 'Todo' check (status in ('Todo', 'In Progress', 'In Review', 'Done')),
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High')),
  planned_date date,
  assigned_to uuid references profiles(id) on delete set null
);

-- Auto-create profile when user signs up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, name, email)
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();


-- Turn on RLS for all tables
alter table profiles enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;
alter table milestones enable row level security;
alter table tasks enable row level security;

-- PROFILES policies
create policy "Anyone can read profiles"
  on profiles for select using (true);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- PROJECTS policies
create policy "See own or member projects"
  on projects for select using (
    owner_id = auth.uid() or
    exists (select 1 from project_members where project_id = id and user_id = auth.uid())
  );

create policy "Create project"
  on projects for insert with check (owner_id = auth.uid());

create policy "Owner updates project"
  on projects for update using (owner_id = auth.uid());

create policy "Owner deletes project"
  on projects for delete using (owner_id = auth.uid());

-- PROJECT_MEMBERS policies
create policy "See members of own project"
  on project_members for select using (
    user_id = auth.uid() or
    exists (select 1 from projects where id = project_id and owner_id = auth.uid())
  );

create policy "Owner adds members"
  on project_members for insert with check (
    exists (select 1 from projects where id = project_id and owner_id = auth.uid())
  );

create policy "Owner removes members"
  on project_members for delete using (
    exists (select 1 from projects where id = project_id and owner_id = auth.uid())
  );

-- MILESTONES policies
create policy "See milestones if in project"
  on milestones for select using (
    exists (select 1 from projects where id = project_id and owner_id = auth.uid()) or
    exists (select 1 from project_members where project_id = milestones.project_id and user_id = auth.uid())
  );

create policy "Owner manages milestones"
  on milestones for insert with check (
    exists (select 1 from projects where id = project_id and owner_id = auth.uid())
  );

create policy "Owner updates milestones"
  on milestones for update using (
    exists (select 1 from projects where id = project_id and owner_id = auth.uid())
  );

create policy "Owner deletes milestones"
  on milestones for delete using (
    exists (select 1 from projects where id = project_id and owner_id = auth.uid())
  );

-- TASKS policies
create policy "Owner sees all tasks"
  on tasks for select using (
    exists (select 1 from projects where id = project_id and owner_id = auth.uid())
  );

create policy "Member sees own tasks"
  on tasks for select using (
    assigned_to = auth.uid()
  );

create policy "Owner creates tasks"
  on tasks for insert with check (
    exists (select 1 from projects where id = project_id and owner_id = auth.uid())
  );

create policy "Owner updates tasks"
  on tasks for update using (
    exists (select 1 from projects where id = project_id and owner_id = auth.uid())
  );

create policy "Member updates only status"
  on tasks for update using (
    assigned_to = auth.uid()
  ) with check (
    assigned_to = auth.uid()
  );

create policy "Owner deletes tasks"
  on tasks for delete using (
    exists (select 1 from projects where id = project_id and owner_id = auth.uid())
  );