'use client';

import { TriangleAlert } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { useCardLanguage } from '@/components/providers/SettingsProvider';
import { missingFromDeck } from '@/lib/deck/deck-check';
import type { LibraryCard, LibraryEntry } from '@/lib/combo/library';
import { NewComboButton } from '@/components/library/NewComboButton';
import { ComboListItem } from '@/components/library/ComboListItem';

/**
 * Combos des Decks mit Deck-Abgleich (UX-Plan 7.4): Welche Karten aus Starthand und Lines
 * sind nicht mehr oder seltener im Deck? Nichts wird geändert, die Line bleibt Dokumentation.
 */
export function DeckCombosTab({
  deckId,
  deckName,
  combos,
  cards,
  counts,
}: {
  deckId: string;
  deckName: string;
  combos: LibraryEntry[];
  cards: Record<string, LibraryCard>;
  /** Kopien je Karte in Main und Extra Deck */
  counts: Map<string, number>;
}) {
  const { t } = useTranslation();
  const cardLanguage = useCardLanguage();
  const nameOf = (id: string) =>
    (cardLanguage === 'de' && cards[id]?.nameDe) || cards[id]?.name || id;
  const checked = combos.map((c) => ({ combo: c, missing: missingFromDeck(c.stats, counts) }));
  const affected = checked.filter((c) => c.missing.length > 0).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <p className="min-w-0 flex-1 text-text-muted">
          {affected > 0 ? (
            <span className="flex items-center gap-1.5 text-warning">
              <TriangleAlert className="size-4" />
              {t('decks.affected', { count: affected })}
            </span>
          ) : (
            t('decks.combosCount', { count: combos.length })
          )}
        </p>
        <NewComboButton decks={[{ id: deckId, name: deckName }]} />
      </div>
      {combos.length === 0 ? (
        <p className="border-t border-line pt-4 text-text-muted">{t('decks.noCombos')}</p>
      ) : (
        <ul className="flex flex-col border-t border-line">
          {checked.map(({ combo, missing }) => (
            <ComboListItem key={combo.id} combo={combo} cards={cards} showDeck={false}>
              {missing.length > 0 && (
                <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-warning">
                  {missing.map((m) => (
                    <span key={m.cardId}>
                      {t('decks.missingCard', {
                        name: nameOf(m.cardId),
                        have: m.have,
                        need: m.need,
                      })}
                    </span>
                  ))}
                </p>
              )}
            </ComboListItem>
          ))}
        </ul>
      )}
    </div>
  );
}
