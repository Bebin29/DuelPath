'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/hooks';
import { Button } from '@/components/ui/button';
import { StatusPage } from '@/components/error/StatusPage';

/** 404 in Stil D statt der Standardseite von Next */
export default function NotFound() {
  const { t } = useTranslation();
  return (
    <StatusPage
      appName={t('common.appName')}
      code="404"
      title={t('error.notFound.title')}
      text={t('error.notFound.text')}
      actions={
        <>
          <Button asChild>
            <Link href="/">{t('error.home')}</Link>
          </Button>
          <Button asChild variant="line">
            <Link href="/combos">{t('navigation.combos')}</Link>
          </Button>
        </>
      }
    />
  );
}
