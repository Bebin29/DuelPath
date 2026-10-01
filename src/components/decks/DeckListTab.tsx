'use client';

import { useState } from 'react';
import { ArrowLeftRight, Minus, Plus } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { useCardLanguage } from '@/components/providers/SettingsProvider';
import { Segmented } from '@/components/ui/segmented';
import { CardView } from '@/components/cards/CardView';
import { displayName } from '@/lib/combo/cards';
import { sectionCount, sectionFor, type Section } from '@/lib/deck/deck-rules';
import type { DeckViewCard, DeckViewEntry } from '@/server/actions/deck-view.actions';
import { CardSearchPanel } from './CardSearchPanel';
import { CardTile, TileAction } from './CardTile';

const GROUPS: { key: string; test: (type: string) => boolean }[] = [
  { key: 'monster', test: (type) => /Monster/.test(type) },
  { key: 'spell', test: (type) => /Spell/.test(type) },
  { key: 'trap', test: (type) => /Trap/.test(type) },
];

/**
 * Deckliste (UI-Plan 7.5.4): Main, Extra und Side als Bildraster in Größe lg mit Anzahl,
 * für Jonas umschaltbar auf eine kompakte Textliste. Rechts die Suche zum Hinzufügen.
 */
export function DeckListTab({
  entries,
  cards,
  onAdd,
  onChange,
  onMove,
  onOpenCard,
}: {
  entries: DeckViewEntry[];
  cards: Map<string, DeckViewCard>;
  onAdd: (card: DeckViewCard, side: boolean) => void;
  onChange: (cardId: string, section: Section, delta: number) => void;
  onMove: (cardId: string, from: Section, to: Section) => void;
  onOpenCard: (cardId: string) => void;
}) {
  const { t } = useTranslation();
  const cardLanguage = useCardLanguage();
  const [view, setView] = useState<'grid' | 'list'>('grid');

  const bySection = (section: Section) =>
    entries
      .filter((e) => e.section === section && cards.has(e.cardId))
      .sort((a, b) =>
        displayName(cards.get(a.cardId), cardLanguage).localeCompare(
          displayName(cards.get(b.cardId), cardLanguage)
        )
      );

  const actions = (e: DeckViewEntry) => {
    const card = cards.get(e.cardId)!;
    const other: Section = e.section === 'SIDE' ? sectionFor(card.type) : 'SIDE';
    return (
      <>
        <TileAction label={t('decks.less')} onClick={() => onChange(e.cardId, e.section, -1)}>
          <Minus />
        </TileAction>
        <TileAction label={t('decks.more')} onClick={() => onChange(e.cardId, e.section, 1)}>
          <Plus />
        </TileAction>
        <TileAction
          label={t('decks.moveTo', { section: t(`decks.section.${other}`) })}
          onClick={() => onMove(e.cardId, e.section, other)}
        >
          <ArrowLeftRight />
        </TileAction>
      </>
    );
  };

  const grid = (list: DeckViewEntry[]) => (
    <ul className="grid grid-cols-[repeat(auto-fill,120px)] gap-x-4 gap-y-4">
      {list.map((e) => (
        <li key={`${e.section}:${e.cardId}`}>
          <CardTile
            card={cards.get(e.cardId)!}
            quantity={e.quantity}
            onClick={() => onOpenCard(e.cardId)}
            actions={actions(e)}
          />
        </li>
      ))}
    </ul>
  );

  const rows = (list: DeckViewEntry[]) => (
    <ul className="flex flex-col">
      {list.map((e) => {
        const card = cards.get(e.cardId)!;
        return (
          <li
            key={`${e.section}:${e.cardId}`}
            className="flex h-9 items-center gap-2.5 border-b border-line text-sm"
          >
            <span className="w-6 font-mono text-xs text-text-muted">{e.quantity}×</span>
            <CardView image={card.imageSmall} label="" size="art" />
            <button
              type="button"
              onClick={() => onOpenCard(e.cardId)}
              className="min-w-0 flex-1 truncate text-left hover:underline"
            >
              {displayName(card, cardLanguage)}
            </button>
            <span className="font-mono text-2xs text-text-subtle">{card.type}</span>
            <span className="flex gap-0.5">{actions(e)}</span>
          </li>
        );
      })}
    </ul>
  );

  const section = (key: Section) => {
    const list = bySection(key);
    const count = sectionCount(entries, key);
    const body = view === 'grid' ? grid : rows;
    return (
      <section key={key} aria-label={t(`decks.section.${key}`)} className="flex flex-col gap-3">
        <h2 className="flex items-baseline gap-2 border-b border-line pb-1.5">
          <span className="font-display text-2xl">{t(`decks.section.${key}`)}</span>
          <span className="font-mono text-xs text-text-subtle">{count}</span>
        </h2>
        {list.length === 0 ? (
          <p className="text-sm text-text-subtle">{t(`decks.empty.${key}`)}</p>
        ) : key === 'MAIN' ? (
          GROUPS.map((g) => {
            const part = list.filter((e) => g.test(cards.get(e.cardId)!.type));
            if (!part.length) return null;
            return (
              <div key={g.key} className="flex flex-col gap-2">
                <h3 className="font-mono text-2xs text-text-subtle">
                  {t(`decks.group.${g.key}`)} · {part.reduce((n, e) => n + e.quantity, 0)}
                </h3>
                {body(part)}
              </div>
            );
          })
        ) : (
          body(list)
        )}
      </section>
    );
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_300px] gap-8">
      <div className="flex min-w-0 flex-col gap-8">
        <div className="flex justify-end">
          <Segmented<'grid' | 'list'>
            label={t('decks.view')}
            value={view}
            onChange={setView}
            options={[
              { value: 'grid', label: t('decks.grid') },
              { value: 'list', label: t('decks.list') },
            ]}
          />
        </div>
        {(['MAIN', 'EXTRA', 'SIDE'] as const).map(section)}
      </div>
      <aside className="sticky top-6 flex max-h-[calc(100dvh-3rem)] flex-col self-start">
        <CardSearchPanel onAdd={onAdd} />
      </aside>
    </div>
  );
}
