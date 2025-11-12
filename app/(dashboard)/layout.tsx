import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { Navigation } from "@/components/common/Navigation";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";

/**
 * Dashboard-Layout mit Sidebar/Navigation
 * Geschützte Route: Nur für eingeloggte Nutzer
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
    <div className="min-h-screen flex flex-col">
      <header>
        <Navigation />
        <div className="container mx-auto px-4 py-2 flex justify-end">
          <LanguageSwitcher />
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}

