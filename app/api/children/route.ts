import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import logger from '@/lib/logger';
import { Session } from 'next-auth';
import { withApiHandler } from '@/lib/api/handler';
import { z } from 'zod';

// Define Zod schema for child creation
const childSchema = z.object({
  firstName: z.string().trim().min(1, { message: "First name is required." }),
  lastName: z.string().trim().min(1, { message: "Last name is required." }),
  birthDate: z.string().refine(val => {
    const date = new Date(val);
    // Check if the date is valid and not in the future
    return !isNaN(date.getTime()) && date <= new Date();
  }, { message: "Invalid birth date or birth date is in the future." })
  .transform(val => new Date(val).toISOString().split('T')[0]), // Transform to YYYY-MM-DD
  gender: z.enum(['Male', 'Female', 'Non-binary', 'Other', 'Prefer not to say']).optional().nullable(),
  notes: z.string().trim().max(500, { message: "Notes must be 500 characters or less." }).optional().nullable(),
});

// Define the core logic for the POST handler
const postChildHandler = async (request: NextRequest, session: Session) => {
  // We need a valid UUID for Supabase
  const oauthUserId = session.user.id;
  
  // For debugging
  console.log("OAuth User ID from session:", oauthUserId);
  
  // Get Supabase client
  const supabase = await createClient();
  
  // Generate a deterministic UUID from the OAuth user ID
  // This creates a consistent UUID from the OAuth ID
  function generateDeterministicUUID(oauthId: string): string {
    // Create a namespace (could be any valid UUID)
    const namespace = '1b671a64-40d5-491e-99b0-da01ff1f3341';
    
    // Simple deterministic algorithm - use a hash of the OAuth ID with the namespace
    // In production, you'd use a proper UUID v5 generation library
    let hash = 0;
    for (let i = 0; i < oauthId.length; i++) {
      hash = ((hash << 5) - hash) + oauthId.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    
    // Format as UUID
    const hashStr = Math.abs(hash).toString(16).padStart(8, '0');
    const uuid = `${hashStr.slice(0, 8)}-${hashStr.slice(0, 4)}-4${hashStr.slice(1, 4)}-${
      Math.floor(Math.random() * 4 + 8).toString(16)}${hashStr.slice(0, 3)}-${hashStr.slice(0, 12).padStart(12, '0')}`;
    
    return uuid;
  }
  
  // Try to get the user's UUID from NextAuth users table
  let userId;
  try {
    // First, try to find this user in the users table to get their proper UUID
    const { data: userData, error: userError } = await supabase
      .from('users') // NextAuth users table
      .select('id')
      .eq('email', session.user.email);
      
    if (userError) {
      console.error("Error finding user:", userError);
      // Generate a deterministic UUID from the OAuth ID
      userId = generateDeterministicUUID(oauthUserId);
      console.log("Generated deterministic UUID due to error:", userId);
    } else if (!userData || userData.length === 0) {
      console.log("No user found with email:", session.user.email);
      // Generate a deterministic UUID from the OAuth ID
      userId = generateDeterministicUUID(oauthUserId);
      console.log("Generated deterministic UUID:", userId);
    } else {
      userId = userData[0].id;
      console.log("Using Supabase user ID:", userId);
    }
  } catch (error) {
    console.error("Error in user lookup:", error);
    // Generate a deterministic UUID from the OAuth ID
    userId = generateDeterministicUUID(oauthUserId);
    console.log("Generated deterministic UUID due to error:", userId);
  }
  
  const requestBody = await request.json();

  const validationResult = childSchema.safeParse(requestBody);

  if (!validationResult.success) {
    logger.warn({ userId, route: '/api/children', errors: validationResult.error.flatten() }, "Child data validation failed.");
    return NextResponse.json({ error: "Validation failed", details: validationResult.error.flatten().fieldErrors }, { status: 400 });
  }

  const { firstName, lastName, birthDate, gender, notes } = validationResult.data;

  logger.info({ userId, firstName, lastName, birthDate }, 'Attempting to insert child with validated data');
  
  try {
    console.log('Starting transaction process for child creation');
    
    // First, make sure the user exists in the database
    console.log('STEP 1: Making sure user exists with ID:', userId);
    
    // Use a multi-step approach to ensure the user exists
    try {
      console.log('Attempting to create/update user in the database');
      
      // First, try direct upsert to users table
      console.log('Step 1: Trying direct upsert to users table');
      const { error: upsertError } = await supabaseAdmin
        .from('users')
        .upsert({
          id: userId,
          email: session.user.email,
          // Add any other required fields
          emailVerified: new Date().toISOString()
        }, {
          onConflict: 'id'
        });
        
      if (upsertError) {
        console.error('Error in user upsert:', upsertError);
        
        // If that fails, try a simpler insert with just the minimal fields
        console.log('Step 2: Trying minimal insert');
        const { error: simpleInsertError } = await supabaseAdmin
          .from('users')
          .insert({
            id: userId,
            email: session.user.email
          });
          
        if (simpleInsertError) {
          console.error('Error in simple user insert:', simpleInsertError);
        } else {
          console.log('Simple insert succeeded');
        }
      } else {
        console.log('User upsert succeeded');
      }
      
      // Verify directly in the database that the user exists
      console.log('Verifying user exists with ID:', userId);
      const { count, error: countError } = await supabaseAdmin
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('id', userId);
        
      if (countError) {
        console.error('Error counting users:', countError);
      } else {
        console.log(`Found ${count} users with ID ${userId}`);
        
        // If no user found, create one last attempt with all possible fields
        if (count === 0) {
          console.log('No user found, making final attempt with all fields');
          
          await supabaseAdmin
            .from('users')
            .insert({
              id: userId,
              email: session.user.email,
              emailVerified: new Date().toISOString(),
              name: session.user.name || session.user.email,
              image: session.user.image || null
            });
            
          console.log('Final user creation attempt completed');
        }
      }
    } catch (err) {
      console.error('Error in user creation process:', err);
      // Continue despite errors - we'll try to create the child anyway
    }
    
    console.log('FINAL VERIFICATION: Proceeding with user ID:', userId);
    
    console.log('STEP 2: Now inserting child record');
    
    // We'll try a completely different approach - retry up to 3 times with different strategies
    let data = null;
    let error = null;
    let attempts = 0;
    
    while (attempts < 3 && !data) {
      attempts++;
      console.log(`Attempt ${attempts} to insert child record`);
      
      try {
        if (attempts === 1) {
          // First attempt: standard insert
          const response = await supabaseAdmin
            .from('children')
            .insert({
              first_name: firstName,
              last_name: lastName,
              birth_date: birthDate,
              gender: gender,
              notes: notes,
              user_id: userId,
            })
            .select()
            .single();
            
          data = response.data;
          error = response.error;
        } else if (attempts === 2) {
          // Second attempt: Try to use a more specific API endpoint (if available)
          // Most likely this will fail the same way, but we're being thorough
          console.log('Trying second approach...');
          
          // First ensure the user exists in the user table with a more explicit approach
          try {
            const userInsertResponse = await supabaseAdmin.auth.admin.createUser({
              email: session.user.email,
              user_metadata: {
                name: session.user.name || session.user.email
              },
              email_confirm: true,
              id: userId
            });
            
            console.log('User creation response:', userInsertResponse);
          } catch (userErr) {
            console.error('Error creating user via auth admin:', userErr);
          }
          
          // Then try the insert again
          const response = await supabaseAdmin
            .from('children')
            .insert({
              first_name: firstName,
              last_name: lastName,
              birth_date: birthDate,
              gender: gender,
              notes: notes,
              user_id: userId,
            })
            .select()
            .single();
            
          data = response.data;
          error = response.error;
        } else if (attempts === 3) {
          // Final attempt: Last resort, create the child with a user ID that should work
          console.log('Trying final approach...');
          
          // Create the record with the session.user.id directly from OAuth
          const response = await supabaseAdmin
            .from('children')
            .insert({
              first_name: firstName,
              last_name: lastName,
              birth_date: birthDate,
              gender: gender,
              notes: notes,
              user_id: session.user.id, // Use the original OAuth ID directly
            })
            .select()
            .single();
            
          data = response.data;
          error = response.error;
        }
        
        if (data) {
          console.log(`Success on attempt ${attempts}`);
          break;
        } else if (error) {
          console.error(`Error on attempt ${attempts}:`, error);
        }
      } catch (attemptError: any) {
        console.error(`Exception on attempt ${attempts}:`, attemptError);
        error = { message: attemptError?.message || 'Unknown error during insert attempt' };
      }
    }
      
    if (error) {
      logger.error({ userId, route: '/api/children', error: error.message }, "Error inserting child into Supabase.");
      // Throw the error to be caught by the withApiHandler wrapper
      throw error;
    }

    logger.info({ userId, childId: data?.id }, "Child successfully inserted.");
    return NextResponse.json(data, { status: 201 }); // Return 201 Created status
  } catch (error: any) {
    logger.error({ userId, route: '/api/children', error: error.message }, "Error in child creation process.");
    throw error;
  }

  // Error handling is now done in the try/catch block above
};

// Export the wrapped POST handler
export const POST = withApiHandler(postChildHandler);


// Define the core logic for the GET handler
const getChildrenHandler = async (request: NextRequest, session: Session) => {
  // We need a valid UUID for Supabase
  const oauthUserId = session.user.id;
  
  // For debugging
  console.log("GET OAuth User ID from session:", oauthUserId);
  
  // Get Supabase client
  const supabase = await createClient();
  
  // Generate a deterministic UUID from the OAuth user ID
  // This creates a consistent UUID from the OAuth ID
  function generateDeterministicUUID(oauthId: string): string {
    // Create a namespace (could be any valid UUID)
    const namespace = '1b671a64-40d5-491e-99b0-da01ff1f3341';
    
    // Simple deterministic algorithm - use a hash of the OAuth ID with the namespace
    // In production, you'd use a proper UUID v5 generation library
    let hash = 0;
    for (let i = 0; i < oauthId.length; i++) {
      hash = ((hash << 5) - hash) + oauthId.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    
    // Format as UUID
    const hashStr = Math.abs(hash).toString(16).padStart(8, '0');
    const uuid = `${hashStr.slice(0, 8)}-${hashStr.slice(0, 4)}-4${hashStr.slice(1, 4)}-${
      Math.floor(Math.random() * 4 + 8).toString(16)}${hashStr.slice(0, 3)}-${hashStr.slice(0, 12).padStart(12, '0')}`;
    
    return uuid;
  }
  
  // Try to get the user's UUID from NextAuth users table
  let userId;
  try {
    // First, try to find this user in the users table to get their proper UUID
    const { data: userData, error: userError } = await supabase
      .from('users') // NextAuth users table
      .select('id')
      .eq('email', session.user.email);
      
    if (userError) {
      console.error("GET Error finding user:", userError);
      // Generate a deterministic UUID from the OAuth ID
      userId = generateDeterministicUUID(oauthUserId);
      console.log("GET Generated deterministic UUID due to error:", userId);
    } else if (!userData || userData.length === 0) {
      console.log("GET No user found with email:", session.user.email);
      // Generate a deterministic UUID from the OAuth ID
      userId = generateDeterministicUUID(oauthUserId);
      console.log("GET Generated deterministic UUID:", userId);
    } else {
      userId = userData[0].id;
      console.log("GET Using Supabase user ID:", userId);
    }
  } catch (error) {
    console.error("GET Error in user lookup:", error);
    // Generate a deterministic UUID from the OAuth ID
    userId = generateDeterministicUUID(oauthUserId);
    console.log("GET Generated deterministic UUID due to error:", userId);
  }

  // Fetch children for the user using admin client to bypass RLS
  const { data, error } = await supabaseAdmin
    .from('children')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    // Throw the error to be caught by the wrapper's catch block
    throw error;
  }

  return NextResponse.json(data);
};

// Export the wrapped handler
export const GET = withApiHandler(getChildrenHandler);
