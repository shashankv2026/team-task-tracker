# Design Notes

## Tables
- profiles (id, name, email): one row per user, created by a trigger on signup
- projects (id, name, owner_id, created_at)
- project_members (project_id, user_id): composite primary key
- milestones (id, project_id, title, planned_date, status)
- tasks (id, milestone_id, project_id, title, status, priority, planned_date, assigned_to)

## 1. A task is not assigned to anyone. Who can see it?
Only the project owner. The tasks SELECT policies allow the project owner, or a
user whose id equals assigned_to. For an unassigned task assigned_to is NULL,
so the member check is never true.

## 2. How is a member limited to changing only the status?
An RLS policy lets a member update only rows assigned to them, but RLS cannot
limit columns. So a BEFORE UPDATE trigger compares the old and new row and
raises an error if the user is not the owner and any column other than status changed.

## 3. How is the owner stopped from assigning to a non-member?
The owner's INSERT and UPDATE policies on tasks have a WITH CHECK: assigned_to
must be NULL, or that user must exist in project_members for the same project.
Otherwise the database rejects the write.

## 4. If someone skips the UI and calls the API directly, what stops them?
Every API request carries the user's login token, and Postgres applies RLS to
every row. Tasks of other people are never returned, and the trigger and policies
reject disallowed writes. The anon key is public by design, and the service_role
key is never used in the frontend.