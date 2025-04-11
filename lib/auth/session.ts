import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/options'; // Import from the new location
import { type NextAuthOptions, type Session } from 'next-auth';
import { NextResponse } from 'next/server'; // Import for error response

// Custom Error class for Authentication errors
export class AuthenticationError extends Error {
  constructor(message = 'Not authenticated') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Retrieves the server session using NextAuth.
 * Throws an AuthenticationError if the user is not authenticated.
 * @returns {Promise<Session>} The authenticated user session.
 * @throws {AuthenticationError} If no session or user ID is found.
 */
export async function getUserSession(): Promise<Session> {
  // Type assertion needed because authOptions might be seen as just 'object' by getServerSession
  const session = await getServerSession(authOptions as NextAuthOptions);

  if (!session?.user?.id) {
    throw new AuthenticationError();
  }
  return session;
}

/**
 * Utility to create a standardized authentication error response.
 * @returns {NextResponse} A NextResponse object with 401 status.
 */
export function createUnauthorizedResponse(): NextResponse {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
}
