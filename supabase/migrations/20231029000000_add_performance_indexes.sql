BEGIN;

-- daily_reports
-- For querying reports for a specific child, often ordered by date
CREATE INDEX IF NOT EXISTS idx_daily_reports_child_id_report_date ON public.daily_reports(child_id, report_date DESC);
-- For ensuring raw_email_id is unique and for quick lookups
CREATE UNIQUE INDEX IF NOT EXISTS uidx_daily_reports_raw_email_id ON public.daily_reports(raw_email_id);

-- meals
-- For querying meals for a specific child, ordered by time
CREATE INDEX IF NOT EXISTS idx_meals_child_id_meal_time ON public.meals(child_id, meal_time DESC);
-- Index on daily_report_id is likely created by FK constraint, but can be explicit if needed:
-- CREATE INDEX IF NOT EXISTS idx_meals_daily_report_id ON public.meals(daily_report_id);

-- activities
-- For querying activities for a specific child, ordered by time
CREATE INDEX IF NOT EXISTS idx_activities_child_id_activity_time ON public.activities(child_id, activity_time DESC);
-- Index on daily_report_id is likely created by FK constraint.

-- naps (assuming 'naps' table and columns 'child_id', 'start_time')
-- For querying naps for a specific child, ordered by time
CREATE INDEX IF NOT EXISTS idx_naps_child_id_start_time ON public.naps(child_id, start_time DESC);
-- Index on report_id (FK to daily_reports) is likely created by FK constraint.

-- bathroom_events (assuming 'bathroom_events' table and columns 'child_id', 'event_time')
-- For querying bathroom events for a specific child, ordered by time
CREATE INDEX IF NOT EXISTS idx_bathroom_events_child_id_event_time ON public.bathroom_events(child_id, event_time DESC);
-- Index on report_id (FK to daily_reports) is likely created by FK constraint.

-- photos
-- For querying photos for a specific child, often ordered by creation date
CREATE INDEX IF NOT EXISTS idx_photos_child_id_created_at ON public.photos(child_id, created_at DESC);
-- Index on daily_report_id is likely created by FK constraint.

-- calendar_events
-- For querying calendar events for a specific child within time ranges
CREATE INDEX IF NOT EXISTS idx_calendar_events_child_id_start_time_end_time ON public.calendar_events(child_id, start_time, end_time);
-- Index on linked_report_id is likely created by FK constraint.

-- invites
-- For looking up invites by the invitee's email
CREATE INDEX IF NOT EXISTS idx_invites_invitee_email ON public.invites(invitee_email);
-- Indexes on child_id and inviter_user_id are likely created by FK constraints.
-- Explicitly:
CREATE INDEX IF NOT EXISTS idx_invites_child_id ON public.invites(child_id);
CREATE INDEX IF NOT EXISTS idx_invites_inviter_user_id ON public.invites(inviter_user_id);


-- child_parent
-- Indexes on user_id and child_id are likely created by FK constraints.
-- Explicitly:
CREATE INDEX IF NOT EXISTS idx_child_parent_user_id ON public.child_parent(user_id);
CREATE INDEX IF NOT EXISTS idx_child_parent_child_id ON public.child_parent(child_id);

-- Note: user_daycare_providers(user_id) index was created in its own migration (20231027000000).

-- For foreign key columns like children.user_id, daily_reports.child_id, etc.,
-- PostgreSQL automatically creates an index when the foreign key constraint is defined.
-- The explicit indexes above are primarily for composite keys or specific ordering needs.

COMMIT;
