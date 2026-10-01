'use client';

import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { useCardLanguage } from '@/components/providers/SettingsProvider';
import { relativeTime } from '@/lib/utils/relative-time';
import { missingFromDeck } from '@/lib/deck/deck-check';
import type { LibraryCard, LibraryEntry } from '@/lib/combo/library';
import { NewComboButton } from '@/components/library/NewComboButton';
import { StartHandStrip } from '@/components/library/StartHandStrip';
import { StatusChip } from '@/components/library/StatusChip';

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
  const { t, i18n } = useTranslation();
  const cardLanguage = useCardLanguage();
  const nameOf = (id: string) =>
    (cardLanguage === 'de' && cards[id]?.nameDe) || cards[id]?.name || id;
  const checked = combos.map((c) => ({ combo: c, missing: missingFromDeck(c.stats, counts) }));
  const affected = checked.filter((c) => c.missing.length > 0).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-4">
        <p className="flex-1 text-text-muted">
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
            <li key={combo.id} className="flex items-center gap-4 border-b border-line py-3">
              <StartHandStrip cardIds={combo.stats.startHand} cards={cards} />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/combos/${combo.id}`}
                  className="block truncate font-display text-lg leading-tight hover:underline"
                >
                  {combo.title}
                </Link>
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
              </div>
              <span className="font-mono text-xs text-text-muted">
                {t('start.lines', { count: combo.stats.lines })}
              </span>
              <span className="w-8 text-right font-display text-xl leading-none">
                {combo.stats.endboard ?? ''}
              </span>
              <StatusChip status={combo.status} />
              <span className="w-24 text-right font-mono text-xs text-text-muted">
                {relativeTime(new Date(combo.updatedAt), new Date(), i18n.language)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
