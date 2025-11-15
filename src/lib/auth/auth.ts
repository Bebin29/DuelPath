import NextAuth from "next-auth";
import { authConfig } from "./config";

/**
 * NextAuth auth() helper für Server Components und API Routes
 * 
 * Wrapper um NextAuth für einfache Session-Prüfung in Server Components
 */
export const { auth, handlers, signIn, signOut } = NextAuth(authConfig);




