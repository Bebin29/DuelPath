'use client';

import { useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n/config';
import type { Language } from '@/lib/language';

/**
 * i18n Provider für Client Components
 *
 * Eigene Instanz je Anfrage mit der Sprache aus dem Cookie: Die globale Instanz teilt sich der
 * Server über alle Anfragen, ein Sprachwechsel dort träfe fremde Renderings.
 */
export function I18nProvider({
  language,
  children,
}: {
  language: Language;
  children: React.ReactNode;
}) {
  const [instance] = useState(() => i18n.cloneInstance({ lng: language }));
  return <I18nextProvider i18n={instance}>{children}</I18nextProvider>;
}
