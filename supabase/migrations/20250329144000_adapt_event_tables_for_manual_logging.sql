/*
  # Adapt Event Tables for Manual Logging

  Modify existing event tables (`naps`, `meals`, `bathroom_events`, `activities`)
  to support both email-parsed data (linked to `daily_reports`) and
  manually entered data (linked directly to `children`).

  Changes:
  1. Add nullable `child_id` column referencing `children`.
  2. Make `report_id` nullable.
  3. Add `source` column ('email' or 'manual').
  4. Change time columns from `time` to `timestamptz`.
  5. Add `notes` text column where missing.
  6. Adapt `bathroom_events` structure for unified types.
  7. Make email-specific fields nullable (`duration_text`, `initials`, `details`).
  8. Update RLS policies.
*/

BEGIN;

-- Add source column with default for existing data
ALTER TABLE naps ADD COLUMN source text NOT NULL DEFAULT 'email';
ALTER TABLE meals ADD COLUMN source text NOT NULL DEFAULT 'email';
ALTER TABLE bathroom_events ADD COLUMN source text NOT NULL DEFAULT 'email';
ALTER TABLE activities ADD COLUMN source text NOT NULL DEFAULT 'email';

-- Add child_id column (nullable)
ALTER TABLE naps ADD COLUMN child_id uuid REFERENCES children(id) ON DELETE SET NULL;
ALTER TABLE meals ADD COLUMN child_id uuid REFERENCES children(id) ON DELETE SET NULL;
ALTER TABLE bathroom_events ADD COLUMN child_id uuid REFERENCES children(id) ON DELETE SET NULL;
ALTER TABLE activities ADD COLUMN child_id uuid REFERENCES children(id) ON DELETE SET NULL;

-- Make report_id nullable
ALTER TABLE naps ALTER COLUMN report_id DROP NOT NULL;
ALTER TABLE meals ALTER COLUMN report_id DROP NOT NULL;
ALTER TABLE bathroom_events ALTER COLUMN report_id DROP NOT NULL;
ALTER TABLE activities ALTER COLUMN report_id DROP NOT NULL;

-- Add notes columns
ALTER TABLE naps ADD COLUMN notes text;
ALTER TABLE meals ADD COLUMN notes text; -- Keep 'details' for original email text
ALTER TABLE bathroom_events ADD COLUMN notes text;
ALTER TABLE activities ADD COLUMN notes text;

-- Change time columns to timestamptz
-- Note: This requires careful handling if existing data needs conversion.
-- Assuming manual entries need full timestamp, and email entries might only have time.
-- We'll store NULL date part for existing email entries for now, or associate with report date later if needed.
ALTER TABLE naps ALTER COLUMN start_time TYPE timestamptz USING (null::date + start_time);
ALTER TABLE naps ALTER COLUMN end_time TYPE timestamptz USING (null::date + end_time);
ALTER TABLE meals ALTER COLUMN meal_time TYPE timestamptz USING (null::date + meal_time);
ALTER TABLE bathroom_events ALTER COLUMN event_time TYPE timestamptz USING (null::date + event_time);
-- Add time column for activities (was missing)
ALTER TABLE activities ADD COLUMN time timestamptz;

-- Adapt bathroom_events structure
ALTER TABLE bathroom_events RENAME COLUMN event_type TO legacy_event_type;
ALTER TABLE bathroom_events ALTER COLUMN legacy_event_type DROP NOT NULL; -- Make nullable if needed
ALTER TABLE bathroom_events RENAME COLUMN status TO type;
ALTER TABLE bathroom_events ALTER COLUMN type SET DATA TYPE text; -- Ensure it's text
-- Add constraint for allowed types
ALTER TABLE bathroom_events ADD CONSTRAINT bathroom_event_type_check CHECK (type IN ('wet', 'dirty', 'dry', 'potty_attempt'));
-- Potential data migration (example - adjust based on actual 'status' values):
-- UPDATE bathroom_events SET type = 'wet' WHERE status ILIKE '%wet%';
-- UPDATE bathroom_events SET type = 'dirty' WHERE status ILIKE '%bm%'; -- etc.

-- Make email-specific fields nullable
ALTER TABLE naps ALTER COLUMN duration_text DROP NOT NULL;
ALTER TABLE meals ALTER COLUMN initials DROP NOT NULL;
ALTER TABLE meals ALTER COLUMN details DROP NOT NULL;
ALTER TABLE bathroom_events ALTER COLUMN initials DROP NOT NULL;

-- Add check constraint: ensure either report_id or child_id is set, based on source
ALTER TABLE naps ADD CONSTRAINT check_nap_source CHECK (
  (source = 'email' AND report_id IS NOT NULL AND child_id IS NULL) OR
  (source = 'manual' AND report_id IS NULL AND child_id IS NOT NULL)
);
ALTER TABLE meals ADD CONSTRAINT check_meal_source CHECK (
  (source = 'email' AND report_id IS NOT NULL AND child_id IS NULL) OR
  (source = 'manual' AND report_id IS NULL AND child_id IS NOT NULL)
);
ALTER TABLE bathroom_events ADD CONSTRAINT check_bathroom_event_source CHECK (
  (source = 'email' AND report_id IS NOT NULL AND child_id IS NULL) OR
  (source = 'manual' AND report_id IS NULL AND child_id IS NOT NULL)
);
ALTER TABLE activities ADD CONSTRAINT check_activity_source CHECK (
  (source = 'email' AND report_id IS NOT NULL AND child_id IS NULL) OR
  (source = 'manual' AND report_id IS NULL AND child_id IS NOT NULL)
);

-- Update RLS Policies

-- Naps
DROP POLICY "Users can manage naps for their children's reports" ON naps;
CREATE POLICY "Users can manage naps for their children"
  ON naps
  FOR ALL
  TO authenticated
  USING (
    (source = 'manual' AND child_id IN (SELECT id FROM children WHERE user_id = auth.uid())) OR
    (source = 'email' AND report_id IN (SELECT dr.id FROM daily_reports dr JOIN children c ON dr.child_id = c.id WHERE c.user_id = auth.uid()))
  );

-- Meals
DROP POLICY "Users can manage meals for their children's reports" ON meals;
CREATE POLICY "Users can manage meals for their children"
  ON meals
  FOR ALL
  TO authenticated
  USING (
    (source = 'manual' AND child_id IN (SELECT id FROM children WHERE user_id = auth.uid())) OR
    (source = 'email' AND report_id IN (SELECT dr.id FROM daily_reports dr JOIN children c ON dr.child_id = c.id WHERE c.user_id = auth.uid()))
  );

-- Bathroom Events
DROP POLICY "Users can manage bathroom events for their children's reports" ON bathroom_events;
CREATE POLICY "Users can manage bathroom events for their children"
  ON bathroom_events
  FOR ALL
  TO authenticated
  USING (
    (source = 'manual' AND child_id IN (SELECT id FROM children WHERE user_id = auth.uid())) OR
    (source = 'email' AND report_id IN (SELECT dr.id FROM daily_reports dr JOIN children c ON dr.child_id = c.id WHERE c.user_id = auth.uid()))
  );

-- Activities
DROP POLICY "Users can manage activities for their children's reports" ON activities;
CREATE POLICY "Users can manage activities for their children"
  ON activities
  FOR ALL
  TO authenticated
  USING (
    (source = 'manual' AND child_id IN (SELECT id FROM children WHERE user_id = auth.uid())) OR
    (source = 'email' AND report_id IN (SELECT dr.id FROM daily_reports dr JOIN children c ON dr.child_id = c.id WHERE c.user_id = auth.uid()))
  );

COMMIT;
