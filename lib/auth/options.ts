import { type NextAuthOptions, type Account, type Session, type User } from 'next-auth';
import { type JWT } from 'next-auth/jwt';
import GoogleProvider from 'next-auth/providers/google';

// Check for environment variables
if (!process.env.GOOGLE_CLIENT_ID) {
  throw new Error('Missing environment variable GOOGLE_CLIENT_ID');
}
if (!process.env.GOOGLE_CLIENT_SECRET) { // Corrected variable name
  throw new Error('Missing environment variable GOOGLE_CLIENT_SECRET');
}
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('Missing environment variable NEXTAUTH_SECRET');
}

// Define the authentication options
export const authOptions: NextAuthOptions = {
  debug: true,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET, // Corrected variable name
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/gmail.readonly',
          access_type: 'offline',
          prompt: 'consent',
          // Note: redirect_uri might need adjustment depending on deployment environment
          redirect_uri: process.env.NODE_ENV === 'production'
            ? process.env.NEXTAUTH_URL + '/api/auth/callback/google' // Use NEXTAUTH_URL in production
            : 'http://localhost:3000/api/auth/callback/google', // Localhost for development
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  },
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  callbacks: {
    async jwt({ token, account }: { token: JWT; account: Account | null }): Promise<JWT> {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at ? account.expires_at * 1000 : undefined;
        // Clear previous error on successful sign-in
        delete token.error;
      }

      // Check if the token is expired or nearing expiration (e.g., within 60 seconds)
      if (token.expiresAt && Date.now() >= (token.expiresAt as number) - 60 * 1000) {
        if (!token.refreshToken) {
          console.error('No refresh token available, cannot refresh.');
          token.error = 'NoRefreshTokenError';
          return token;
        }

        console.log('Access token expired or nearing expiration, attempting refresh...');
        try {
          const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              client_id: process.env.GOOGLE_CLIENT_ID!,
              client_secret: process.env.GOOGLE_CLIENT_SECRET!,
              refresh_token: token.refreshToken as string,
              grant_type: 'refresh_token',
            }),
          });

          const refreshedTokens = await response.json();

          if (!response.ok) {
            console.error('Error refreshing access token:', refreshedTokens);
            token.error = refreshedTokens.error || 'RefreshAccessTokenError';
            // Potentially clear accessToken and expiresAt if refresh fails critically
            // delete token.accessToken;
            // delete token.expiresAt; 
            return token; // Return token with error, session callback will handle it
          }

          console.log('Access token refreshed successfully.');
          token.accessToken = refreshedTokens.access_token;
          token.expiresAt = Date.now() + refreshedTokens.expires_in * 1000;
          // Update refresh token if Google sends a new one (rare for Google, but good practice)
          token.refreshToken = refreshedTokens.refresh_token ?? token.refreshToken;
          delete token.error; // Clear any previous error

        } catch (error) {
          console.error('Error during token refresh request:', error);
          token.error = 'RefreshAccessTokenRequestFailed';
          return token;
        }
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }): Promise<Session> {
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken as string | undefined;
      session.error = token.error as string | undefined; // Ensure type compatibility
      // Add user ID from token to session
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};
