# Team Task Tracker

A mini Jira built with React, Vite and Supabase. Owners create projects,
milestones and tasks and manage the team. Members see only their own tasks and
can change only the status.

## Setup
1. Clone the repo and run `npm install`
2. Create a Supabase project
3. Run `supabase/schema.sql` in the Supabase SQL Editor
4. In Supabase, Authentication, Email: turn off "Confirm email" for testing
5. Copy `.env.example` to `.env` and fill in your project URL and anon key
6. Run `npm run dev`

## Prompts I gave Claude and how they helped
1. "[your first prompt, e.g. the master prompt]" - [how it helped]
2. "[a prompt where you pasted your policies and asked why members saw no projects]" - [how it helped]
3. "[optional third prompt]" - [how it helped]

## Something I changed or fixed
Members saw "No projects yet" even though they were saved in project_members.
I exported my policies and found that projects_select only allowed
owner_id = auth.uid(). I changed it to also allow project members, using a
security definer function so the policies do not recurse.

## Test results (logged in as a member)
| Check | Result |
|---|---|
| I can see only my own tasks | Pass. The board shows only my task. |
| I cannot change the priority of my task | Pass. API call returned 400, "Members can only change the status of a task". |
| I cannot change the status of another member's task | Pass. API call returned no error and 0 rows (data: []), status unchanged. |

These API checks were run from the browser console with the Supabase client.

## Not finished
- The owner "cannot assign to a non-member" rule is in the database, but I did
  not test it directly through the API. It was only checked that normal assignment works.
- profiles_select and pm_select allow any logged-in user to read all profiles
  and member lists. This should be restricted.
- Members are added by the frontend (profiles lookup plus insert) instead of a
  database function.
- No drag and drop, and no UI to edit or delete tasks.