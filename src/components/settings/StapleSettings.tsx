'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { useCardLanguage, useSettings } from '@/components/providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CardView } from '@/components/cards/CardView';
import { displayName, type ComboCard } from '@/lib/combo/cards';

/**
 * Staple-Auswahl (UX-Plan 6.8): welche Handtraps und Fallen Leiste und Stresstest nutzen,
 * in welcher Reihenfolge. Ohne eigene Auswahl gilt die Standardliste.
 */
const COLLAPSED = 8;

export function StapleSettings({ staples }: { staples: { name: string; card: ComboCard }[] }) {
  const { t } = useTranslation();
  const cardLanguage = useCardLanguage();
  const { settings, update } = useSettings();
  const all = staples.map((s) => s.name);
  const chosen = settings.staples ?? all;
  // Gewählte in ihrer Reihenfolge, danach die übrigen
  const ordered = [
    ...chosen.flatMap((name) => staples.filter((s) => s.name === name)),
    ...staples.filter((s) => !chosen.includes(s.name)),
  ];

  // Ab acht Einträgen eingeklappt, damit die Seite nicht unnötig lang wird (UI-Sweep-Plan 3.8)
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? ordered : ordered.slice(0, COLLAPSED);

  const save = (next: string[]) => update({ staples: next });
  const move = (name: string, by: number) => {
    const i = chosen.indexOf(name);
    const j = i + by;
    if (i < 0 || j < 0 || j >= chosen.length) return;
    const next = [...chosen];
    [next[i], next[j]] = [next[j], next[i]];
    save(next);
  };

  return (
    <section id="staples" className="mt-10 max-w-[720px] scroll-mt-20">
      <div className="mb-1 flex items-end gap-4">
        <h2 className="flex-1 font-display text-2xl">{t('settings.staples')}</h2>
        {settings.staples && (
          <Button variant="text" size="sm" onClick={() => update({ staples: null })}>
            {t('settings.staplesReset')}
          </Button>
        )}
      </div>
      <p className="mb-3 text-text-muted">{t('settings.staplesText')}</p>
      <ul className="flex flex-col border-t border-line">
        {shown.map((s) => {
          const on = chosen.includes(s.name);
          const index = chosen.indexOf(s.name);
          const name = displayName(s.card, cardLanguage);
          return (
            <li
              key={s.name}
              className={cn(
                'flex items-center gap-3 border-b border-line py-2',
                !on && 'text-text-subtle'
              )}
            >
              <Checkbox
                checked={on}
                aria-label={name}
                onCheckedChange={(checked) =>
                  save(checked ? [...chosen, s.name] : chosen.filter((n) => n !== s.name))
                }
              />
              <CardView image={s.card.imageSmall} label="" size="art" dimmed={!on} />
              <span className="flex-1 truncate">{name}</span>
              {on && (
                <span className="flex gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={index === 0}
                    onClick={() => move(s.name, -1)}
                    aria-label={`${name}: ${t('settings.up')}`}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={index === chosen.length - 1}
                    onClick={() => move(s.name, 1)}
                    aria-label={`${name}: ${t('settings.down')}`}
                  >
                    <ArrowDown />
                  </Button>
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {ordered.length > COLLAPSED && (
        <Button variant="text" size="sm" className="mt-2" onClick={() => setExpanded((e) => !e)}>
          {expanded ? t('settings.showLess') : t('settings.showAll', { count: ordered.length })}
        </Button>
      )}
    </section>
  );
}
