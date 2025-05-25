import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

// Create a Supabase client with the service role key
// This client will bypass Row Level Security (RLS) policies
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
