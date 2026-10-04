'use client';

import { motion } from 'motion/react';
import { useTranslation } from '@/lib/i18n/hooks';
import { EASE } from '@/lib/motion';
import { AmSpieltisch } from '@/components/illustrations/AmSpieltisch';

/**
 * Anmeldeseiten ohne App-Navigation (Stil D). Links die Bühne: Illustration „Am Spieltisch“, die
 * sich zeichnet, und ein Satz, wofür DuelPath da ist. Sie ist der erste Eindruck vor jedem Konto.
 * Kein „Zurück zur Startseite“: Die Startseite verlangt eine Anmeldung und führte hierher zurück.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [before, after] = t('auth.stage.headline', { word: '\u0001' }).split('\u0001');
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-5xl grid-cols-1 content-center items-center gap-8 px-4 py-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:px-8">
      <section className="flex flex-col items-center text-center lg:items-start lg:text-left">
        <span className="font-display text-3xl leading-none">{t('common.appName')}</span>
        <AmSpieltisch
          title={t('start.illustration')}
          animated
          className="mt-6 h-auto w-full max-w-[200px] lg:max-w-[380px]"
        />
        <p className="mt-6 text-balance font-display text-[32px] leading-[1.1] lg:text-[44px]">
          {before}
          <span className="relative inline-block italic text-opponent">
            {t('auth.stage.word')}
            <svg
              aria-hidden
              viewBox="0 0 140 14"
              fill="none"
              preserveAspectRatio="none"
              className="absolute -bottom-2 left-0 h-3 w-full overflow-visible"
            >
              <motion.path
                d="M 3 8 C 34 3 80 2 137 5 M 14 12 C 50 9 92 9 128 10"
                stroke="var(--opponent)"
                strokeWidth={2.2}
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                // Nachdem sich die Illustration gezeichnet hat
                transition={{ duration: 0.5, delay: 1.6, ease: EASE.ink }}
              />
            </svg>
          </span>
          {after}
        </p>
        <p className="mt-4 max-w-md text-text-muted max-lg:hidden">{t('auth.stage.text')}</p>
      </section>
      <div className="w-full max-w-md justify-self-center lg:justify-self-end">{children}</div>
    </main>
  );
}
