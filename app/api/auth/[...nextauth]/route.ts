import { handlers } from '@/lib/auth/auth';

/**
 * NextAuth API Route Handler
 *
 * Handles all authentication requests (sign in, sign out, etc.)
 */
export const { GET, POST } = handlers;
