'use client';

import { useEffect, useState } from 'react';
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
  // Ein neues Rendern des Layouts (router.refresh() nach einem Wechsel in einem anderen Tab)
  // bringt die Sprache aus dem Cookie mit; sonst stünde lang="en" über deutschem Text
  useEffect(() => {
    if (instance.language !== language) void instance.changeLanguage(language);
  }, [instance, language]);
  return <I18nextProvider i18n={instance}>{children}</I18nextProvider>;
}
