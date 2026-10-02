'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/hooks';
import { signUpAction } from '@/server/actions/auth';
import { Button } from '@/components/ui/button';
import { AuthCard, AuthError, AuthField } from '@/components/auth/AuthCard';

/** Registrieren; danach geht es zur Anmeldung */
export default function SignUpPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);
    setError(null);

    const result = await signUpAction(formData);

    if (result?.error) {
      setError(result.error);
      setIsLoading(false);
    } else if (result?.success) {
      router.push('/auth/signin?registered=true');
    }
  }

  const invalid = error ? 'true' : 'false';
  return (
    <AuthCard
      title={t('auth.signUp')}
      text={t('auth.signUpText')}
      footer={
        <>
          {t('auth.hasAccount')}{' '}
          <Link href="/auth/signin" className="text-ink underline-offset-4 hover:underline">
            {t('auth.signIn')}
          </Link>
        </>
      }
    >
      <form action={handleSubmit} className="flex flex-col gap-4">
        {error && <AuthError>{error}</AuthError>}
        <AuthField
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          label={t('auth.name')}
          placeholder={t('auth.namePlaceholder')}
          aria-invalid={invalid}
        />
        <AuthField
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          label={t('auth.email')}
          placeholder={t('auth.emailPlaceholder')}
          aria-invalid={invalid}
        />
        <AuthField
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          label={t('auth.password')}
          placeholder={t('auth.passwordMin')}
          aria-invalid={invalid}
        />
        <AuthField
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          label={t('auth.confirmPassword')}
          placeholder={t('auth.passwordRepeat')}
          aria-invalid={invalid}
        />
        <Button type="submit" size="lg" className="mt-2 w-full" disabled={isLoading}>
          {isLoading ? t('common.loading') : t('auth.signUp')}
        </Button>
      </form>
    </AuthCard>
  );
}
