'use client'

import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs'
import { Database } from './types'

const supabase = createBrowserSupabaseClient<Database>()

export default supabase
