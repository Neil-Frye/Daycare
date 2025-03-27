-- Step 1: Create enum type for invite status (with error handling)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invite_status') THEN
    CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'declined');
  END IF;
END$$;

-- Step 2: Create photos table if not exists
CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL,
  date DATE NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE
);

-- Step 3: Create index for photos if not exists
CREATE INDEX IF NOT EXISTS idx_photos_child_date ON photos(child_id, date);

-- Step 4: Create invites table if not exists
CREATE TABLE IF NOT EXISTS invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL,
  inviter_id UUID NOT NULL,
  invitee_email TEXT NOT NULL,
  status invite_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
  FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Step 5: Create indexes for invites if not exists
CREATE INDEX IF NOT EXISTS idx_invites_child_status ON invites(child_id, status);
CREATE INDEX IF NOT EXISTS idx_invites_invitee_email ON invites(invitee_email);
