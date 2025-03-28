import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { Database } from './types'
import { cookies } from 'next/headers'

export const supabase = createRouteHandlerClient<Database>({ cookies })
