import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth/options'; // Import from the new location

// Create the handler using the options
const handler = NextAuth(authOptions);

// Export the handler for the route endpoints
export { handler as GET, handler as POST };
