'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/hooks';
import { Button } from '@/components/ui/button';
import { AuthCard } from '@/components/auth/AuthCard';

const KNOWN = ['Configuration', 'AccessDenied', 'Verification', 'CredentialsSignin'];

/** Fehler von NextAuth mit verständlicher Meldung und dem Weg zurück */
function AuthErrorContent() {
  const { t } = useTranslation();
  const error = useSearchParams().get('error');
  const message = t(`auth.errors.${error && KNOWN.includes(error) ? error : 'generic'}`);

  return (
    <AuthCard title={t('auth.errorTitle')} text={message}>
      {error && (
        <p className="mb-4 font-mono text-xs text-text-subtle">
          {t('auth.errorCode', { code: error })}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/auth/signin">{t('auth.toSignIn')}</Link>
        </Button>
        <Button asChild variant="line">
          <Link href="/">{t('auth.toHome')}</Link>
        </Button>
      </div>
    </AuthCard>
  );
}

/** useSearchParams braucht beim statischen Rendern eine Suspense-Grenze */
export default function AuthErrorPage() {
  return (
    <Suspense>
      <AuthErrorContent />
    </Suspense>
  );
}
