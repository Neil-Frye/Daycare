import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/supabase/types'; // Assuming your generated types are here

// Custom Error class for Not Found errors
export class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

// Custom Error class for Authorization errors (e.g., access denied)
export class AuthorizationError extends Error {
  constructor(message = 'Access denied') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Verifies that a child record belongs to the specified user.
 * Throws NotFoundError if the child doesn't exist.
 * Throws AuthorizationError if the child does not belong to the user.
 * Throws the original Supabase error for other database issues.
 *
 * @param {SupabaseClient<Database>} supabase - The Supabase client instance.
 * @param {string} childId - The ID of the child to verify.
 * @param {string} userId - The ID of the user requesting access.
 * @returns {Promise<void>} Resolves if verification is successful.
 * @throws {NotFoundError | AuthorizationError | Error} Throws specific errors on failure.
 */
export async function verifyChildOwnership(
  supabase: SupabaseClient<Database>,
  childId: string,
  userId: string
): Promise<void> {
  const { data: childCheck, error: childCheckError } = await supabase
    .from('children')
    .select('id, user_id', { count: 'exact', head: true }) // More efficient check
    .eq('id', childId)
    .single(); // Use single to expect one row or null

  if (childCheckError) {
    // Handle specific Supabase errors if needed, e.g., PostgREST error codes
    if (childCheckError.code === 'PGRST116') { // PGRST116: Row not found
        throw new NotFoundError(`Child with ID ${childId} not found.`);
    }
    // Re-throw other Supabase errors
    console.error('Supabase error during child ownership check:', childCheckError);
    throw childCheckError;
  }

  if (!childCheck) {
      // Should ideally be caught by PGRST116, but as a fallback
      throw new NotFoundError(`Child with ID ${childId} not found.`);
  }

  if (childCheck.user_id !== userId) {
    throw new AuthorizationError(`User does not have access to child ID ${childId}.`);
  }

  // If we reach here, the child exists and belongs to the user.
}
