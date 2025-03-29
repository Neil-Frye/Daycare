/*
  # Initial Schema Setup for Daycare Analytics

  1. New Tables
    - `children`
      - `id` (uuid, primary key)
      - `name` (text)
      - `birth_date` (date)
      - `created_at` (timestamp)
      - `user_id` (uuid, foreign key to auth.users)
    
    - `daily_reports`
      - `id` (uuid, primary key)
      - `child_id` (uuid, foreign key to children)
      - `date` (date)
      - `category` (text)
      - `type` (text)
      - `duration` (interval)
      - `time` (time)
      - `notes` (text)
      - `created_at` (timestamp)
    
    - `daycare_events`
      - `id` (uuid, primary key)
      - `center_name` (text)
      - `event_date` (date)
      - `event_type` (text)
      - `description` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for viewing daycare events (public read)
*/

-- Create children table
CREATE TABLE children (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  birth_date date NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE children ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own children"
  ON children
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create daily_reports table
CREATE TABLE daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id),
  date date NOT NULL,
  category text NOT NULL,
  type text NOT NULL,
  duration interval,
  time time NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage reports for their children"
  ON daily_reports
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM children
      WHERE children.id = daily_reports.child_id
      AND children.user_id = auth.uid()
    )
  );

-- Create daycare_events table
CREATE TABLE daycare_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_name text NOT NULL,
  event_date date NOT NULL,
  event_type text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE daycare_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view daycare events"
  ON daycare_events
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage daycare events"
  ON daycare_events
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.role = 'admin'
    )
  );

-- Create indexes for better query performance
CREATE INDEX idx_children_user_id ON children(user_id);
CREATE INDEX idx_daily_reports_child_id ON daily_reports(child_id);
CREATE INDEX idx_daily_reports_date ON daily_reports(date);
CREATE INDEX idx_daycare_events_date ON daycare_events(event_date);
