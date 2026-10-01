'use client';

import { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useCardLanguage } from '@/components/providers/SettingsProvider';
import { CardView } from '@/components/cards/CardView';
import { CardPreview } from '@/components/cards/CardPreview';
import { displayName, toComboCard } from '@/lib/combo/cards';
import type { DeckViewCard } from '@/server/actions/deck-view.actions';

type ApiCard = Parameters<typeof toComboCard>[0] & {
  banTcg?: string | null;
  passcode?: string | null;
  archetype?: string | null;
};

const toDeckCard = (row: ApiCard): DeckViewCard => ({
  ...toComboCard(row),
  banTcg: row.banTcg ?? null,
  passcode: row.passcode ?? null,
  archetype: row.archetype ?? null,
});

/**
 * Kartensuche neben dem Deck (UI-Plan 7.5.5): Spitznamen und Kürzel wie im Rest der App.
 * Klick legt die Karte in Main bzw. Extra Deck, Umschalt+Klick ins Side Deck.
 */
export function CardSearchPanel({
  onAdd,
  hint,
  label,
  side = false,
}: {
  onAdd: (card: DeckViewCard, side: boolean) => void;
  /** Eigener Knopf „Side“ je Treffer, für Touch-Geräte ohne Umschalttaste */
  side?: boolean;
  /** Hinweis unter dem Feld; null blendet ihn aus */
  hint?: string | null;
  label?: string;
}) {
  const { t } = useTranslation();
  const cardLanguage = useCardLanguage();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DeckViewCard[]>([]);
  const debounced = useDebounce(query.trim(), 250);

  useEffect(() => {
    if (debounced.length < 2) return;
    const controller = new AbortController();
    fetch(`/api/cards?name=${encodeURIComponent(debounced)}&limit=24`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data: { cards?: ApiCard[] }) => setResults((data.cards ?? []).map(toDeckCard)))
      .catch(() => {});
    return () => controller.abort();
  }, [debounced]);

  const visible = debounced.length >= 2 ? results : [];

  return (
    <section aria-label={label ?? t('decks.search')} className="flex min-h-0 flex-col gap-3">
      <label className="flex h-9 items-center gap-2 rounded-md border border-line bg-surface-1 px-2.5 focus-within:border-line-strong pointer-coarse:h-10">
        <Search className="size-3.5 text-text-subtle" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('decks.searchPlaceholder')}
          aria-label={label ?? t('decks.search')}
          className="min-w-0 flex-1 self-stretch bg-transparent text-sm outline-none placeholder:text-text-subtle pointer-coarse:text-base"
        />
      </label>
      {hint !== null && (
        <p className="font-mono text-2xs text-text-subtle">
          <span className="pointer-coarse:hidden">{hint ?? t('decks.searchHint')}</span>
          <span className="hidden pointer-coarse:inline">{hint ?? t('decks.searchHintTouch')}</span>
        </p>
      )}
      <ul className="flex min-h-0 flex-col overflow-y-auto">
        {visible.map((card) => {
          const name = displayName(card, cardLanguage);
          return (
            <li key={card.id} className="group flex items-center gap-1">
              <CardPreview card={card}>
                <button
                  type="button"
                  onClick={(e) => onAdd(card, e.shiftKey)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 rounded-sm px-1.5 py-1 text-left hover:bg-surface-3/60 pointer-coarse:py-1.5"
                >
                  <CardView image={card.imageSmall} label="" size="xs" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{name}</span>
                    <span className="block truncate font-mono text-2xs text-text-subtle">
                      {card.type}
                      {card.banTcg && ` · ${t(`preview.ban.${card.banTcg}`)}`}
                    </span>
                  </span>
                  <Plus className="size-3.5 text-text-subtle" />
                </button>
              </CardPreview>
              {/* Side ohne Umschalttaste, etwa auf Touch-Geräten */}
              {side && (
                <button
                  type="button"
                  onClick={() => onAdd(card, true)}
                  aria-label={t('decks.addToSide', { name })}
                  className="h-7 shrink-0 rounded-sm border border-line px-2 font-mono text-2xs text-text-muted opacity-0 transition-opacity hover:text-ink focus-visible:opacity-100 group-hover:opacity-100 pointer-coarse:h-10 pointer-coarse:opacity-100"
                >
                  {t('decks.section.SIDE')}
                </button>
              )}
            </li>
          );
        })}
        {debounced.length >= 2 && visible.length === 0 && (
          <li className="px-1.5 text-sm text-text-subtle">{t('combo.noResults')}</li>
        )}
      </ul>
    </section>
  );
}
