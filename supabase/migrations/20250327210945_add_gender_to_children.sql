-- Add gender column to children table
ALTER TABLE children
  ADD COLUMN gender text;

-- Update RLS policy to include new column
CREATE POLICY "Users can manage their own children with gender"
  ON children
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Drop old policy
DROP POLICY "Users can manage their own children" ON children;
