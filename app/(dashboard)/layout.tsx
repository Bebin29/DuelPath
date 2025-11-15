import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";

/**
 * Dashboard-Layout
 * Geschützte Route: Nur für eingeloggte Nutzer
 * 
 * Navigation wird im Root-Layout gerendert, daher hier nicht mehr nötig
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Prüfe Session - NextAuth v5
  const session = await auth();

  if (!session) {
    redirect("/auth/signin");
  }

  return (
    <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
  );
}

