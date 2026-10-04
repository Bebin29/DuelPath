import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import deTranslations from '../../../messages/de.json';
import enTranslations from '../../../messages/en.json';

/**
 * i18n Konfiguration für DuelPath
 *
 * Unterstützt Deutsch und Englisch
 */
i18n.use(initReactI18next).init({
  resources: {
    de: {
      translation: deTranslations,
    },
    en: {
      translation: enTranslations,
    },
  },
  lng: 'de', // Standardsprache; je Anfrage klont der I18nProvider mit der Sprache aus dem Cookie
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // React escaped bereits
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;
