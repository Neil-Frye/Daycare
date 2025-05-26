const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Extract environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Create client with anon key (public permissions)
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseSchema() {
  try {
    // 1. Try to get definition/structure by selecting a single row
    console.log('Attempting to query children table structure...');
    const { data, error } = await supabase
      .from('children')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error querying children table:', error);
    } else {
      console.log('Query successful. Sample data:', data);
      
      if (data && data.length > 0) {
        console.log('Children table columns:', Object.keys(data[0]));
      } else {
        console.log('No data found in children table');
      }
    }
    
    // 2. Try inserting a test child with 'first_name' and 'last_name'
    console.log('\nTesting insert with first_name/last_name...');
    const { data: insertFirstLastResult, error: insertFirstLastError } = await supabase
      .from('children')
      .insert({
        first_name: 'Test',
        last_name: 'User',
        birth_date: '2023-01-01',
        user_id: '00000000-0000-0000-0000-000000000000' // Dummy UUID that won't conflict
      })
      .select();
      
    console.log('Insert with first_name/last_name result:', insertFirstLastError || insertFirstLastResult);
    
    // 3. Try inserting a test child with 'name'
    console.log('\nTesting insert with name...');
    const { data: insertNameResult, error: insertNameError } = await supabase
      .from('children')
      .insert({
        name: 'Test User',
        birth_date: '2023-01-01',
        user_id: '00000000-0000-0000-0000-000000000001' // Different dummy UUID
      })
      .select();
      
    console.log('Insert with name result:', insertNameError || insertNameResult);
  } catch (error) {
    console.error('Unexpected error during schema check:', error);
  }
}

// Execute the check
checkDatabaseSchema()
  .then(() => console.log('\nSchema check complete'))
  .catch(err => console.error('Fatal error:', err));
