'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { useSettings } from '@/components/providers/SettingsProvider';
import { Button } from '@/components/ui/button';
import { NICKNAMES } from '@/lib/cards/nicknames';
import { CardSearchPanel } from '@/components/decks/CardSearchPanel';
import { Input } from '@/components/ui/input';

/**
 * Spitznamen-Pflege (UX-Plan 8 und 17, UX-6): eigene Kürzel für Suche und Befehlszeile.
 * Die gepflegte Liste steht zum Nachschlagen darunter; eigene Einträge gehen vor.
 */
export function NicknameSettings() {
  const { t } = useTranslation();
  const { settings, update } = useSettings();
  const [alias, setAlias] = useState('');
  const own = settings.nicknames;
  const builtIn = Object.entries(NICKNAMES);

  const add = (card: string) => {
    const key = alias.trim();
    if (!key) return;
    update({
      nicknames: [
        ...own.filter((n) => !(n.alias.toLowerCase() === key.toLowerCase() && n.card === card)),
        { alias: key, card },
      ],
    });
    setAlias('');
  };

  return (
    <section id="nicknames" className="mt-10 max-w-[720px] scroll-mt-20">
      <h2 className="mb-1 font-display text-2xl">{t('settings.nicknames')}</h2>
      <p className="mb-3 text-text-muted">{t('settings.nicknamesText')}</p>

      {own.length > 0 && (
        <ul className="mb-4 flex flex-col border-t border-line">
          {own.map((n) => (
            <li
              key={`${n.alias}:${n.card}`}
              className="flex h-10 items-center gap-3 border-b border-line"
            >
              <span className="w-24 shrink-0 truncate font-mono text-sm sm:w-32">{n.alias}</span>
              <span className="flex-1 truncate text-sm text-text-muted">{n.card}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t('settings.removeNickname', { alias: n.alias })}
                onClick={() => update({ nicknames: own.filter((x) => x !== n) })}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-4 rounded-lg border border-line p-4 sm:grid-cols-[180px_minmax(0,1fr)]">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-text-muted">{t('settings.alias')}</span>
          <Input
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            maxLength={30}
            placeholder={t('settings.aliasPlaceholder')}
            className="font-mono"
          />
        </label>
        <div className="flex max-h-72 flex-col">
          <span className="mb-1.5 text-xs text-text-muted">{t('settings.aliasCard')}</span>
          <CardSearchPanel
            label={t('settings.aliasCard')}
            hint={alias.trim() ? null : t('settings.aliasFirst')}
            onAdd={(card) => add(card.name)}
          />
        </div>
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer text-sm text-text-muted">
          {t('settings.builtInNicknames', { count: builtIn.length })}
        </summary>
        <ul className="mt-2 grid gap-x-6 text-sm sm:grid-cols-2">
          {builtIn.map(([key, names]) => (
            <li key={key} className="flex gap-3 border-b border-line py-1">
              <span className="w-24 font-mono">{key}</span>
              <span className="truncate text-text-muted">{names.join(', ')}</span>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
