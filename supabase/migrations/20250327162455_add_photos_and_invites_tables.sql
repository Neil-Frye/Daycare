-- Create enum type for invite status
CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'declined');

-- Create photos table
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for photos by child and date
CREATE INDEX idx_photos_child_date ON photos(child_id, date);

-- Create invites table
CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  status invite_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for invites by child and status
CREATE INDEX idx_invites_child_status ON invites(child_id, status);

-- Create index for invites by invitee email
CREATE INDEX idx_invites_invitee_email ON invites(invitee_email);
