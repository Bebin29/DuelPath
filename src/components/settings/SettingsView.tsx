'use client';

import { useLanguage, useTranslation } from '@/lib/i18n/hooks';
import { useSettings } from '@/components/providers/SettingsProvider';
import { Segmented } from '@/components/ui/segmented';
import type { CardLanguage } from '@/lib/settings';
import type { Theme } from '@/lib/theme';

function Row({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-6 border-b border-line py-4">
      <div className="flex-1">
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 text-text-muted">{text}</p>
      </div>
      {children}
    </div>
  );
}

/** Einstellungen (UI-Plan 7.5.6): eine Seite, Änderungen gelten sofort */
export function SettingsView() {
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage } = useLanguage();
  const { settings, update } = useSettings();

  return (
    <div className="flex flex-col">
      <header className="pb-8">
        <h1 className="font-display text-[40px] leading-none">{t('settings.title')}</h1>
        <p className="mt-2 text-text-muted">{t('settings.subtitle')}</p>
      </header>
      <section className="max-w-[720px]">
        <h2 className="mb-1 font-display text-2xl">{t('settings.display')}</h2>
        <Row title={t('settings.theme')} text={t('settings.themeText')}>
          <Segmented<Theme>
            label={t('settings.theme')}
            value={settings.theme}
            onChange={(theme) => update({ theme })}
            options={[
              { value: 'dark', label: t('settings.dark') },
              { value: 'light', label: t('settings.light') },
            ]}
          />
        </Row>
        <Row title={t('settings.uiLanguage')} text={t('settings.uiLanguageText')}>
          <Segmented<'de' | 'en'>
            label={t('settings.uiLanguage')}
            value={currentLanguage === 'en' ? 'en' : 'de'}
            onChange={changeLanguage}
            options={[
              { value: 'de', label: 'Deutsch' },
              { value: 'en', label: 'English' },
            ]}
          />
        </Row>
        <Row title={t('settings.cardLanguage')} text={t('settings.cardLanguageText')}>
          <Segmented<CardLanguage>
            label={t('settings.cardLanguage')}
            value={settings.cardLanguage}
            onChange={(cardLanguage) => update({ cardLanguage })}
            options={[
              { value: 'en', label: 'English' },
              { value: 'de', label: 'Deutsch' },
            ]}
          />
        </Row>
      </section>
    </div>
  );
}
