import { type NextAuthOptions, type Account, type Session, type User } from 'next-auth';
import { type JWT } from 'next-auth/jwt';
import GoogleProvider from 'next-auth/providers/google';

// Check for environment variables
if (!process.env.GOOGLE_CLIENT_ID) {
  throw new Error('Missing environment variable GOOGLE_CLIENT_ID');
}
if (!process.env.GOOGLE_SECRET_ID) {
  throw new Error('Missing environment variable GOOGLE_SECRET_ID');
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
      clientSecret: process.env.GOOGLE_SECRET_ID,
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

      // TODO: Implement token refresh logic here
      // Example placeholder: Check if token is expired
      // if (token.expiresAt && Date.now() >= token.expiresAt) {
      //   console.log("Access token expired, attempting refresh...");
      //   // Call refresh function
      //   // return refreshAccessToken(token); // Implement this function
      // }

      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }): Promise<Session> {
      session.accessToken = token.accessToken;
      session.error = token.error;
      // Add user ID from token to session
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};
