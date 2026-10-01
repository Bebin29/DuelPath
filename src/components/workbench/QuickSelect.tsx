'use client';

import { useMemo } from 'react';
import { useTranslation } from '@/lib/i18n/hooks';
import { useCardLanguage } from '@/components/providers/SettingsProvider';
import { displayName, type ComboCard } from '@/lib/combo/cards';
import type { GameState, Zone } from '@/lib/combo/state';
import { PickList, type PickItem } from './PickList';

/** Reihenfolge der Treffer: was man meistens meint, zuerst */
const ZONE_ORDER: Zone[] = [
  'HAND',
  'MONSTER',
  'SPELL_TRAP',
  'FIELD',
  'GY',
  'BANISHED',
  'EXTRA',
  'DECK',
];

/**
 * Schnellauswahl (UX-Plan 9): „/“ öffnet, Name tippen, Enter öffnet das Aktionsmenü der Karte.
 * Aus Deck und Extra Deck steht jede Karte nur einmal in der Liste.
 */
export function QuickSelect({
  state,
  cards,
  onPick,
  onClose,
}: {
  state: GameState;
  cards: Map<string, ComboCard>;
  onPick: (instanceId: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const cardLanguage = useCardLanguage();

  const items = useMemo((): PickItem[] => {
    const seen = new Set<string>();
    return Object.values(state.cards)
      .filter((c) => c.owner === 'self' || c.controller === 'self')
      .sort((a, b) => ZONE_ORDER.indexOf(a.zone) - ZONE_ORDER.indexOf(b.zone))
      .filter((c) => {
        if (c.zone !== 'DECK' && c.zone !== 'EXTRA') return true;
        const key = `${c.zone}:${c.cardId}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((c) => {
        const card = cards.get(c.cardId);
        return {
          id: c.instanceId,
          label: displayName(card, cardLanguage),
          image: card?.imageSmall,
          hint: t(`combo.zones.${c.zone}`),
          keywords: [card?.name, card?.nameDe].filter((n): n is string => Boolean(n)),
        };
      });
  }, [state, cards, cardLanguage, t]);

  return (
    <PickList
      items={items}
      max={8}
      placeholder={t('workbench.quickSelect')}
      hint={t('workbench.quickSelectHint')}
      onPick={onPick}
      onClose={onClose}
    />
  );
}
