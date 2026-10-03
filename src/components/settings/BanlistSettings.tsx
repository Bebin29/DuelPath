'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { useCardLanguage } from '@/components/providers/SettingsProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardView } from '@/components/cards/CardView';
import { SaveIndicator, type SaveStatus } from '@/components/ui/save-indicator';
import { CardSearchPanel } from '@/components/decks/CardSearchPanel';
import { displayName } from '@/lib/combo/cards';
import { BAN_STATUS, toIsoDate, type BanStatus, type BanlistView } from '@/lib/deck/banlist';
import {
  deleteNextBanlist,
  saveNextBanlist,
  setCurrentBanlistDate,
  type BanlistCardView,
} from '@/server/actions/banlist.actions';

interface NextDoc {
  name: string;
  effectiveOn: string;
  cards: BanlistCardView[];
}

/**
 * Banlist-Pflege (Lücke L5): der Stand der aktuellen Liste lässt sich nachtragen,
 * und daneben steht eine zweite Liste für die angekündigten Änderungen. Der
 * Deck-Check schaltet zwischen beiden um.
 */
export function BanlistSettings({
  current,
  next,
}: {
  current: BanlistView | null;
  next: NextDoc | null;
}) {
  const { t } = useTranslation();
  const [currentDate, setCurrentDate] = useState(current?.effectiveOn ?? '');
  const [doc, setDoc] = useState<NextDoc | null>(next);
  const [status, setStatus] = useState<SaveStatus>('saved');

  // Autosave wie auf der Deckseite, kurz nach der letzten Änderung
  const firstDate = useRef(true);
  useEffect(() => {
    if (firstDate.current) {
      firstDate.current = false;
      return;
    }
    const timer = setTimeout(async () => {
      setStatus('saving');
      const result = await setCurrentBanlistDate(currentDate);
      setStatus(result.error ? 'error' : 'saved');
    }, 700);
    return () => clearTimeout(timer);
  }, [currentDate]);

  const firstDoc = useRef(true);
  useEffect(() => {
    if (firstDoc.current) {
      firstDoc.current = false;
      return;
    }
    if (!doc) return;
    const timer = setTimeout(async () => {
      setStatus('saving');
      const result = await saveNextBanlist({
        name: doc.name,
        effectiveOn: doc.effectiveOn,
        changes: doc.cards.map((c) => ({ cardId: c.cardId, status: c.status })),
      });
      setStatus(result.error ? 'error' : 'saved');
    }, 700);
    return () => clearTimeout(timer);
  }, [doc]);

  const create = () =>
    setDoc({ name: t('settings.banlistNextName'), effectiveOn: toIsoDate(new Date()), cards: [] });
  const remove = async () => {
    setDoc(null);
    await deleteNextBanlist();
  };

  return (
    <section id="banlist" className="mt-10 max-w-[720px] scroll-mt-20">
      <div className="mb-1 flex items-end gap-4">
        <h2 className="flex-1 font-display text-2xl">{t('settings.banlist')}</h2>
        <SaveIndicator status={status} />
      </div>
      <p className="mb-3 text-text-muted">{t('settings.banlistText')}</p>

      <label className="flex flex-wrap items-center gap-3 border-y border-line py-3">
        <span className="flex-1 text-sm">{t('settings.banlistCurrent')}</span>
        <Input
          type="date"
          value={currentDate}
          onChange={(e) => setCurrentDate(e.target.value)}
          className="w-44"
          aria-label={t('settings.banlistDate')}
        />
      </label>

      {!doc ? (
        <Button variant="text" size="sm" className="mt-3" onClick={create}>
          {t('settings.banlistAddNext')}
        </Button>
      ) : (
        <div className="mt-4 rounded-lg border border-line p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-40 flex-1 flex-col gap-1.5">
              <span className="text-xs text-text-muted">{t('settings.banlistName')}</span>
              <Input
                value={doc.name}
                maxLength={60}
                onChange={(e) => setDoc({ ...doc, name: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-text-muted">{t('settings.banlistDate')}</span>
              <Input
                type="date"
                value={doc.effectiveOn}
                onChange={(e) => setDoc({ ...doc, effectiveOn: e.target.value })}
                className="w-44"
              />
            </label>
            <Button variant="text" size="sm" onClick={remove}>
              {t('settings.banlistRemoveNext')}
            </Button>
          </div>

          <ul className="mt-4 flex flex-col border-t border-line">
            {doc.cards.map((card) => (
              <BanlistRow
                key={card.cardId}
                card={card}
                onStatus={(status) =>
                  setDoc({
                    ...doc,
                    cards: doc.cards.map((c) => (c.cardId === card.cardId ? { ...c, status } : c)),
                  })
                }
                onRemove={() =>
                  setDoc({ ...doc, cards: doc.cards.filter((c) => c.cardId !== card.cardId) })
                }
              />
            ))}
          </ul>
          {doc.cards.length === 0 && (
            <p className="py-2 text-sm text-text-subtle">{t('settings.banlistEmpty')}</p>
          )}

          <div className="mt-4 flex max-h-72 flex-col">
            <CardSearchPanel
              label={t('settings.banlistAddCard')}
              hint={t('settings.banlistAddHint')}
              onAdd={(card) =>
                setDoc((d) =>
                  !d || d.cards.some((c) => c.cardId === card.id)
                    ? d
                    : {
                        ...d,
                        cards: [
                          ...d.cards,
                          {
                            cardId: card.id,
                            name: card.name,
                            nameDe: card.nameDe,
                            imageSmall: card.imageSmall,
                            banTcg: card.banTcg,
                            status: 'Limited',
                          },
                        ],
                      }
                )
              }
            />
          </div>
        </div>
      )}
    </section>
  );
}

/** Eine Karte der nächsten Liste: links der heutige Stand, rechts der künftige */
function BanlistRow({
  card,
  onStatus,
  onRemove,
}: {
  card: BanlistCardView;
  onStatus: (status: BanStatus) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const cardLanguage = useCardLanguage();
  const name = displayName(card, cardLanguage);
  return (
    <li className="flex items-center gap-3 border-b border-line py-2">
      <CardView image={card.imageSmall} label="" size="art" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{name}</span>
        <span className="block truncate font-mono text-2xs text-text-subtle">
          {t(`preview.ban.${card.banTcg ?? 'Unlimited'}`)}
        </span>
      </span>
      <select
        value={card.status}
        onChange={(e) => onStatus(e.target.value as BanStatus)}
        aria-label={t('settings.banlistStatus', { name })}
        className="h-9 rounded-md border border-line bg-surface-1 px-2 text-sm text-ink outline-none hover:border-line-strong focus-visible:border-line-strong pointer-coarse:h-10"
      >
        {BAN_STATUS.map((status) => (
          <option key={status} value={status}>
            {t(`preview.ban.${status}`)}
          </option>
        ))}
      </select>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('settings.banlistRemoveCard', { name })}
        onClick={onRemove}
      >
        <X />
      </Button>
    </li>
  );
}
