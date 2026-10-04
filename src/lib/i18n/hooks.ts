'use client';

import { useTranslation as useI18nTranslation } from 'react-i18next';
// Initialisiert i18next einmal beim ersten Import
import './config';
import { applyLanguage, parseLanguage, type Language } from '@/lib/language';

/**
 * Wrapper Hook für useTranslation mit Typisierung
 */
export function useTranslation() {
  return useI18nTranslation();
}

/**
 * Hook zum Wechseln der Sprache. Das Cookie trägt die Wahl zum Server (siehe `@/lib/language`).
 */
export function useLanguage() {
  const { i18n } = useTranslation();

  const changeLanguage = (lang: Language) => {
    void i18n.changeLanguage(lang);
    applyLanguage(lang);
  };

  return {
    currentLanguage: parseLanguage(i18n.language),
    changeLanguage,
  };
}
