'use client';

import { useSearchParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/hooks';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/components/ui/card';
import { Button } from '@/components/components/ui/button';
import Link from 'next/link';

/**
 * NextAuth Error-Seite
 *
 * Zeigt Fehlermeldungen von NextAuth an
 */
export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorMessage = (error: string | null): string => {
    switch (error) {
      case 'Configuration':
        return 'Es gibt ein Problem mit der Server-Konfiguration.';
      case 'AccessDenied':
        return 'Du hast keinen Zugriff auf diesen Account.';
      case 'Verification':
        return 'Der Verifizierungslink ist abgelaufen oder wurde bereits verwendet.';
      case 'CredentialsSignin':
        return 'Ungültige Anmeldedaten. Bitte überprüfe deine E-Mail und dein Passwort.';
      default:
        return 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Authentifizierungsfehler</CardTitle>
        <CardDescription>{getErrorMessage(error)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          {error && (
            <p>
              <strong>Fehlercode:</strong> {error}
            </p>
          )}
        </div>
        <div className="flex gap-4">
          <Link href="/auth/signin">
            <Button variant="default">Zur Anmeldung</Button>
          </Link>
          <Link href="/">
            <Button variant="outline">Zur Startseite</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
