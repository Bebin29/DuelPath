import Link from "next/link";
import { Button } from "@/components/components/ui/button";
import { ArrowLeft } from "lucide-react";

/**
 * Auth-Layout ohne Navigation (nur Logo/Back-Link)
 * Zentrierte Formulare
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 mb-8 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Zurück zur Startseite</span>
        </Link>
        {children}
      </div>
    </div>
  );
}

