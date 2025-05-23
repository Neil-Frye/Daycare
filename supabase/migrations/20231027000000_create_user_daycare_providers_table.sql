-- Create the user_daycare_providers table
CREATE TABLE public.user_daycare_providers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider_name TEXT NOT NULL,
    report_sender_email TEXT NOT NULL,
    parser_strategy TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add comments to the table and columns
COMMENT ON TABLE public.user_daycare_providers IS 'Stores daycare provider configurations for users, linking them to specific sender emails and parsing strategies.';
COMMENT ON COLUMN public.user_daycare_providers.id IS 'Unique identifier for the daycare provider configuration.';
COMMENT ON COLUMN public.user_daycare_providers.user_id IS 'Foreign key referencing the user who owns this configuration.';
COMMENT ON COLUMN public.user_daycare_providers.provider_name IS 'User-defined name for the daycare provider (e.g., "Tadpoles", "My Child''s Montessori").';
COMMENT ON COLUMN public.user_daycare_providers.report_sender_email IS 'The email address from which daycare reports are sent (e.g., "notifications@tadpoles.com").';
COMMENT ON COLUMN public.user_daycare_providers.parser_strategy IS 'Identifier for the parsing strategy to be used for reports from this provider (e.g., "tadpoles_v1").';
COMMENT ON COLUMN public.user_daycare_providers.created_at IS 'Timestamp of when the configuration was created.';
COMMENT ON COLUMN public.user_daycare_providers.updated_at IS 'Timestamp of when the configuration was last updated.';

-- Enable Row Level Security
ALTER TABLE public.user_daycare_providers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow users to select their own provider configurations"
ON public.user_daycare_providers
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Allow users to insert their own provider configurations"
ON public.user_daycare_providers
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own provider configurations"
ON public.user_daycare_providers
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own provider configurations"
ON public.user_daycare_providers
FOR DELETE
USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_user_daycare_providers_user_id ON public.user_daycare_providers(user_id);
CREATE UNIQUE INDEX idx_user_daycare_providers_user_id_report_sender_email ON public.user_daycare_providers(user_id, report_sender_email);

-- Function to update updated_at timestamp (optional, but good practice)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row update
CREATE TRIGGER on_user_daycare_providers_updated_at
BEFORE UPDATE ON public.user_daycare_providers
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
