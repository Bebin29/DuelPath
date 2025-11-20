'use client';

import React from 'react';
import { useTranslation as useI18nTranslation } from 'react-i18next';
import i18n from './config';

/**
 * Wrapper Hook für useTranslation mit Typisierung
 */
export function useTranslation() {
  return useI18nTranslation();
}

/**
 * Hook zum Wechseln der Sprache
 */
export function useLanguage() {
  const { i18n } = useTranslation();

  const changeLanguage = (lang: 'de' | 'en') => {
    i18n.changeLanguage(lang);
    // Sprache im localStorage speichern für Persistenz
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lang);
      // Initialisiere i18n mit gespeicherter Sprache beim ersten Laden
      if (i18n.language !== lang) {
        i18n.changeLanguage(lang);
      }
    }
  };

  // Beim ersten Laden: Sprache aus localStorage laden
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('language') as 'de' | 'en' | null;
      if (savedLanguage && savedLanguage !== i18n.language) {
        i18n.changeLanguage(savedLanguage);
      }
    }
  }, []);

  return {
    currentLanguage: i18n.language as 'de' | 'en',
    changeLanguage,
  };
}
