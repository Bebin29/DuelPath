'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { useCardLanguage, useSettings } from '@/components/providers/SettingsProvider';
import { Button } from '@/components/ui/button';
import { CardView } from '@/components/cards/CardView';
import { CardSearchPanel } from '@/components/decks/CardSearchPanel';
import { displayName, type ComboCard } from '@/lib/combo/cards';
import { DEFAULT_BREAKERS } from '@/lib/deck/roles';

/**
 * Boardbreaker-Pflege (Deckbau-Plan 3.2 und Entscheidungen): welche Karten der Rollen-Vorschlag
 * als Breaker erkennt. Ohne eigene Liste gilt die Standardliste; Kaijus erkennt die App immer.
 */
const COLLAPSED = 8;

export function BreakerSettings({ cards }: { cards: Record<string, ComboCard> }) {
  const { t } = useTranslation();
  const cardLanguage = useCardLanguage();
  const { settings, update } = useSettings();
  const chosen = settings.breakers ?? DEFAULT_BREAKERS;

  // Ab acht Einträgen eingeklappt, damit die Seite nicht unnötig lang wird (UI-Sweep-Plan 3.8)
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? chosen : chosen.slice(0, COLLAPSED);
  // Ohne Neuladen kennt die Seite frisch hinzugefügte Karten nur aus der Suche
  const [added, setAdded] = useState<Record<string, ComboCard>>({});

  const add = (card: ComboCard) => {
    setAdded((prev) => ({ ...prev, [card.name]: card }));
    if (chosen.includes(card.name)) return;
    update({ breakers: [...chosen, card.name] });
  };

  return (
    <section id="breakers" className="mt-10 max-w-[720px] scroll-mt-20">
      <div className="mb-1 flex items-end gap-4">
        <h2 className="flex-1 font-display text-2xl">{t('settings.breakers')}</h2>
        {settings.breakers && (
          <Button variant="text" size="sm" onClick={() => update({ breakers: null })}>
            {t('settings.breakersReset')}
          </Button>
        )}
      </div>
      <p className="mb-3 text-text-muted">{t('settings.breakersText')}</p>

      {chosen.length > 0 ? (
        <ul className="flex flex-col border-t border-line">
          {shown.map((name) => {
            const card = added[name] ?? cards[name];
            return (
              <li key={name} className="flex items-center gap-3 border-b border-line py-2">
                <CardView image={card?.imageSmall ?? null} label="" size="art" />
                <span className="flex-1 truncate text-sm">
                  {card ? displayName(card, cardLanguage) : name}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('settings.removeBreaker', { name })}
                  onClick={() => update({ breakers: chosen.filter((n) => n !== name) })}
                >
                  <X />
                </Button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-sm text-text-subtle">{t('settings.breakersEmpty')}</p>
      )}
      {chosen.length > COLLAPSED && (
        <Button variant="text" size="sm" className="mt-2" onClick={() => setExpanded((e) => !e)}>
          {expanded ? t('settings.showLess') : t('settings.showAll', { count: chosen.length })}
        </Button>
      )}

      <div className="mt-4 flex max-h-72 flex-col rounded-lg border border-line p-4">
        <span className="mb-1.5 text-xs text-text-muted">{t('settings.breakerAdd')}</span>
        <CardSearchPanel
          label={t('settings.breakerAdd')}
          hint={t('settings.breakerAddHint')}
          onAdd={add}
        />
      </div>
    </section>
  );
}
