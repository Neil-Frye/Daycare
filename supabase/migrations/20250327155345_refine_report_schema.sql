/*
  # Refine Daily Report Schema

  1. Modify `daily_reports` table:
     - Remove event-specific columns (`category`, `type`, `duration`, `time`).
     - Add `teacher_notes` (text).
     - Add `gmail_message_id` (text, unique) to prevent duplicates.
     - Add `child_name_from_report` (text) for verification.
     - Add `report_date_from_report` (text) for verification.

  2. Create new tables for specific events:
     - `naps`
     - `meals`
     - `bathroom_events`
     - `activities`
     - `photos`

  3. Update RLS policies as needed.
*/

-- Modify daily_reports table
ALTER TABLE daily_reports
  DROP COLUMN category,
  DROP COLUMN type,
  DROP COLUMN duration,
  DROP COLUMN time,
  DROP COLUMN notes, -- Assuming teacher_notes replaces this
  ADD COLUMN teacher_notes text,
  ADD COLUMN gmail_message_id text UNIQUE, -- Ensure we don't process the same email twice
  ADD COLUMN child_name_from_report text,
  ADD COLUMN report_date_from_report text;

-- Update RLS policy for daily_reports (if needed, check existing policy logic)
-- The existing policy seems fine as it relies on the child_id relationship.

-- Create naps table
CREATE TABLE naps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
  start_time time, -- Store as time without timezone
  end_time time,   -- Store as time without timezone
  duration_text text, -- Store the original text like "1 hr 41 mins"
  created_at timestamptz DEFAULT now()
);
ALTER TABLE naps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage naps for their children's reports"
  ON naps
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM daily_reports dr JOIN children c ON dr.child_id = c.id
      WHERE dr.id = naps.report_id AND c.user_id = auth.uid()
    )
  );
CREATE INDEX idx_naps_report_id ON naps(report_id);

-- Create meals table
CREATE TABLE meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
  meal_time time, -- Store as time without timezone
  food_description text,
  details text, -- Store the full original details string
  initials text[], -- Store initials as an array of text
  created_at timestamptz DEFAULT now()
);
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage meals for their children's reports"
  ON meals
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM daily_reports dr JOIN children c ON dr.child_id = c.id
      WHERE dr.id = meals.report_id AND c.user_id = auth.uid()
    )
  );
CREATE INDEX idx_meals_report_id ON meals(report_id);

-- Create bathroom_events table
CREATE TABLE bathroom_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
  event_time time, -- Store as time without timezone
  event_type text, -- e.g., 'diaper'
  status text, -- e.g., 'Wet, BM'
  initials text[], -- Store initials as an array of text
  created_at timestamptz DEFAULT now()
);
ALTER TABLE bathroom_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage bathroom events for their children's reports"
  ON bathroom_events
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM daily_reports dr JOIN children c ON dr.child_id = c.id
      WHERE dr.id = bathroom_events.report_id AND c.user_id = auth.uid()
    )
  );
CREATE INDEX idx_bathroom_events_report_id ON bathroom_events(report_id);

-- Create activities table
CREATE TABLE activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
  description text,
  -- Consider adding tags/goals later if parsing becomes more sophisticated
  created_at timestamptz DEFAULT now()
);
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage activities for their children's reports"
  ON activities
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM daily_reports dr JOIN children c ON dr.child_id = c.id
      WHERE dr.id = activities.report_id AND c.user_id = auth.uid()
    )
  );
CREATE INDEX idx_activities_report_id ON activities(report_id);

-- Create photos table
CREATE TABLE photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage photos for their children's reports"
  ON photos
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM daily_reports dr JOIN children c ON dr.child_id = c.id
      WHERE dr.id = photos.report_id AND c.user_id = auth.uid()
    )
  );
CREATE INDEX idx_photos_report_id ON photos(report_id);
