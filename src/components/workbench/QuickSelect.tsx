'use client';

import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { useTranslation } from '@/lib/i18n/hooks';
import { useCardLanguage } from '@/components/providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { CardView } from '@/components/cards/CardView';
import { displayName, type ComboCard } from '@/lib/combo/cards';
import type { GameState, PlacedCard, Zone } from '@/lib/combo/state';

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
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const all = useMemo(() => {
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
      });
  }, [state]);

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    const named = (c: PlacedCard) => {
      const card = cards.get(c.cardId);
      return [card?.name, card?.nameDe].some((n) => n?.toLowerCase().includes(q));
    };
    return (q ? all.filter(named) : all).slice(0, 8);
  }, [all, query, cards]);

  const pick = (c: PlacedCard | undefined) => c && onPick(c.instanceId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute bottom-16 left-1/2 z-40 w-96 -translate-x-1/2 rounded-lg border border-line bg-surface-2 shadow-[0_18px_40px_rgb(0_0_0/0.45)]"
    >
      <input
        autoFocus
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onBlur={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
          else if (e.key === 'Enter') pick(hits[active]);
          else if (e.key === 'ArrowDown') setActive((i) => Math.min(i + 1, hits.length - 1));
          else if (e.key === 'ArrowUp') setActive((i) => Math.max(i - 1, 0));
          else return;
          e.preventDefault();
        }}
        placeholder={t('workbench.quickSelect')}
        aria-label={t('workbench.quickSelect')}
        role="combobox"
        aria-expanded
        aria-controls="quick-select-list"
        className="w-full border-b border-line bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-text-subtle"
      />
      <ul id="quick-select-list" role="listbox" className="flex flex-col p-1">
        {hits.map((c, i) => {
          const card = cards.get(c.cardId);
          const name = displayName(card, cardLanguage);
          return (
            <li
              key={c.instanceId}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(c);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-sm',
                i === active && 'bg-ink/7'
              )}
            >
              <CardView image={card?.imageSmall} label={name} size="art" />
              <span className="flex-1 truncate">{name}</span>
              <span className="font-mono text-2xs text-text-subtle">
                {t(`combo.zones.${c.zone}`)}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-line px-3 py-1.5 font-mono text-2xs text-text-subtle">
        {t('workbench.quickSelectHint')}
      </p>
    </motion.div>
  );
}
