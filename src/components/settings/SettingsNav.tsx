'use client';

import { useTranslation } from '@/lib/i18n/hooks';

const SECTIONS = [
  ['display', 'settings.display'],
  ['workbench', 'settings.workbench'],
  ['staples', 'settings.staples'],
  ['breakers', 'settings.breakers'],
  ['nicknames', 'settings.nicknames'],
  ['api', 'settings.api'],
] as const;

/** Abschnitte der Einstellungen als Sprungmarken, rechts neben dem Inhalt ab xl */
export function SettingsNav() {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('settings.sections')} className="sticky top-10 flex flex-col gap-1">
      {SECTIONS.map(([id, key]) => (
        <a
          key={id}
          href={`#${id}`}
          className="rounded-sm py-1 text-sm text-text-muted transition-colors hover:text-ink"
        >
          {t(key)}
        </a>
      ))}
    </nav>
  );
}
