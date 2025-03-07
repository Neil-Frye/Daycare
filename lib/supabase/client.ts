import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

const isProd = process.env.NEXT_PUBLIC_ENV === 'production';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Missing environment variable NEXT_PUBLIC_SUPABASE_URL');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Missing environment variable NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Seed test data if we're in the test environment
if (!isProd) {
  const seedTestData = async () => {
    // Clear existing test data
    await supabase.from('children').delete().neq('id', '0');
    await supabase.from('daily_reports').delete().neq('id', '0');
    await supabase.from('daycare_events').delete().neq('id', '0');

    // Insert test children
    await supabase.from('children').insert([
      {
        id: 'test-child-1',
        name: 'Emma Thompson',
        birth_date: '2021-03-15',
        user_id: 'test-user-1',
      },
      {
        id: 'test-child-2',
        name: 'Liam Parker',
        birth_date: '2020-08-22',
        user_id: 'test-user-1',
      },
    ]);

    // Insert test daily reports
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    await supabase.from('daily_reports').insert([
      {
        child_id: 'test-child-1',
        date: today.toISOString().split('T')[0],
        category: 'Nap',
        type: 'Morning Nap',
        duration: '90',
        time: '10:30',
        notes: 'Slept well',
      },
      {
        child_id: 'test-child-1',
        date: today.toISOString().split('T')[0],
        category: 'Meal',
        type: 'Lunch',
        time: '12:00',
        notes: 'Ate all vegetables',
      },
      {
        child_id: 'test-child-2',
        date: lastWeek.toISOString().split('T')[0],
        category: 'Activity',
        type: 'Art',
        time: '14:00',
        notes: 'Painted a beautiful picture',
      },
    ]);

    // Insert test daycare events
    await supabase.from('daycare_events').insert([
      {
        center_name: 'Sunshine Daycare',
        event_date: '2024-04-01',
        event_type: 'Holiday',
        description: 'Easter Celebration',
      },
      {
        center_name: 'Sunshine Daycare',
        event_date: '2024-04-15',
        event_type: 'Special Theme',
        description: 'Spring Garden Week',
      },
    ]);
  };

  seedTestData().catch(console.error);
}