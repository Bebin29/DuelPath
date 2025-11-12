import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";

/**
 * NextAuth API Route Handler
 * 
 * Handles all authentication requests (sign in, sign out, etc.)
 */
const handler = NextAuth(authConfig);

export { handler as GET, handler as POST };


