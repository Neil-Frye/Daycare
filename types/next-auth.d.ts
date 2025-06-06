import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  /**
   * Extends the built-in session types
   */
  interface Session {
    accessToken?: string;
    refreshToken?: string;
    error?: string;
    // Add user ID to the session user object
    user: {
      id?: string; // Add the id property
    } & DefaultSession['user']; // Extend the default user type
  }
}

declare module 'next-auth/jwt' {
  /**
   * Extends the built-in JWT types
   */
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    error?: string;
  }
}
