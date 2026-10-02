'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useTranslation } from '@/lib/i18n/hooks';
import { Button } from '@/components/ui/button';
import { AuthCard, AuthError, AuthField } from '@/components/auth/AuthCard';

/** Anmelden mit E-Mail und Passwort */
function SignInForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const registered = useSearchParams().get('registered') === 'true';
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (!email || !password) {
      setError(t('auth.errors.missing'));
      setIsLoading(false);
      return;
    }

    try {
      const result = await signIn('credentials', { email, password, redirect: false });
      if (result?.error) {
        setError(t('auth.errors.invalidCredentials'));
        setIsLoading(false);
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (error) {
      console.error('Sign in error:', error);
      setError(t('auth.errors.generic'));
      setIsLoading(false);
    }
  }

  return (
    <AuthCard
      title={t('auth.signIn')}
      text={t('auth.signInText')}
      footer={
        <>
          {t('auth.noAccount')}{' '}
          <Link href="/auth/signup" className="text-ink underline-offset-4 hover:underline">
            {t('auth.signUp')}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {registered && !error && (
          <p role="status" className="text-sm text-self">
            {t('auth.registered')}
          </p>
        )}
        {error && <AuthError>{error}</AuthError>}
        <AuthField
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          label={t('auth.email')}
          placeholder={t('auth.emailPlaceholder')}
          aria-invalid={error ? 'true' : 'false'}
        />
        <AuthField
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          label={t('auth.password')}
          placeholder="••••••••"
          aria-invalid={error ? 'true' : 'false'}
        />
        <Button type="submit" size="lg" className="mt-2 w-full" disabled={isLoading}>
          {isLoading ? t('common.loading') : t('auth.signIn')}
        </Button>
      </form>
    </AuthCard>
  );
}

/** useSearchParams braucht beim statischen Rendern eine Suspense-Grenze */
export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
