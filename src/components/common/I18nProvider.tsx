"use client";

import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n/config";

/**
 * i18n Provider für Client Components
 * 
 * Wrapper um I18nextProvider für die Verwendung in Client Components
 */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}






