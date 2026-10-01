'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shuffle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { useCardLanguage } from '@/components/providers/SettingsProvider';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { CardView } from '@/components/cards/CardView';
import { displayName } from '@/lib/combo/cards';
import { containsHand, drawHand, expandDeck, suggestTitle } from '@/lib/deck/hand-tester';
import type { LibraryEntry } from '@/lib/combo/library';
import type { DeckViewCard, DeckViewEntry } from '@/server/actions/deck-view.actions';
import { createCombo } from '@/server/actions/combo.actions';
import { CardTile } from './CardTile';
import { CardSearchPanel } from './CardSearchPanel';
import { Segmented } from '@/components/ui/segmented';

const MAX_HAND = 6;
type OppZone = 'MONSTER' | 'SPELL_TRAP' | 'FIELD';
const oppZoneOf = (type: string, race?: string | null): OppZone =>
  /Monster/.test(type)
    ? 'MONSTER'
    : /Spell/.test(type) && race === 'Field'
      ? 'FIELD'
      : 'SPELL_TRAP';

/**
 * Neue Combo (UX-Plan 7.1, UI-Plan 7.5.3): Deck als Bildraster, Starter aus vorhandenen Combos
 * zuerst. Klick legt eine Kopie auf die Hand, oben steht die Hand mit Zähler, Enter startet.
 */
export function StartHandPicker({
  deck,
  combos,
  handtraps,
}: {
  deck: { id: string; name: string; entries: DeckViewEntry[]; cards: DeckViewCard[] };
  combos: LibraryEntry[];
  handtraps: string[];
}) {
  const { t } = useTranslation();
  const cardLanguage = useCardLanguage();
  const router = useRouter();
  const cards = useMemo(() => new Map(deck.cards.map((c) => [c.id, c])), [deck.cards]);
  const main = deck.entries.filter((e) => e.section === 'MAIN' && cards.has(e.cardId));
  const [hand, setHand] = useState<string[]>([]);
  const [title, setTitle] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [going, setGoing] = useState<'first' | 'second'>('first');
  const [opponent, setOpponent] = useState<DeckViewCard[]>([]);

  const count = (id: string) => hand.filter((h) => h === id).length;
  const toggle = (e: DeckViewEntry) =>
    setHand((h) =>
      h.filter((x) => x === e.cardId).length < e.quantity && h.length < MAX_HAND
        ? [...h, e.cardId]
        : h.filter((x) => x !== e.cardId)
    );
  const removeAt = (i: number) => setHand((h) => h.filter((_, k) => k !== i));
  const suggested = suggestTitle(hand.map((id) => displayName(cards.get(id), 'en')));
  const shownTitle = title ?? suggested;
  const duplicate = hand.length
    ? combos.find(
        (c) => c.stats.startHand.length === hand.length && containsHand(hand, c.stats.startHand)
      )
    : undefined;

  const start = async () => {
    if (!hand.length || busy) return;
    setBusy(true);
    const result = await createCombo(
      shownTitle || t('library.untitled'),
      deck.id,
      hand,
      going === 'second'
        ? opponent.map((c) => ({ cardId: c.id, zone: oppZoneOf(c.type, c.race) }))
        : []
    );
    if (result.data) router.push(`/combos/${result.data.id}`);
    else setBusy(false);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target instanceof HTMLElement ? e.target : null;
      if (e.key !== 'Enter' || el?.closest('button, input, textarea')) return;
      e.preventDefault();
      void start();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Starter aus vorhandenen Combos, dann Handtraps, dann nach Kartentyp
  const starterIds = new Set(combos.flatMap((c) => c.stats.required));
  const handtrapIds = new Set(handtraps);
  const groups: { key: string; list: DeckViewEntry[] }[] = [
    { key: 'starter', list: main.filter((e) => starterIds.has(e.cardId)) },
    {
      key: 'handtrap',
      list: main.filter((e) => !starterIds.has(e.cardId) && handtrapIds.has(e.cardId)),
    },
    ...(['monster', 'spell', 'trap'] as const).map((key) => ({
      key,
      list: main.filter(
        (e) =>
          !starterIds.has(e.cardId) &&
          !handtrapIds.has(e.cardId) &&
          new RegExp(key, 'i').test(cards.get(e.cardId)!.type)
      ),
    })),
  ].filter((g) => g.list.length > 0);

  const counter =
    hand.length === 0
      ? t('newCombo.empty')
      : hand.length <= 3
        ? `${hand.length}-Card`
        : t('newCombo.cards', { count: hand.length });

  return (
    <div className="flex flex-col gap-6 pb-24">
      <header>
        <p className="font-mono text-2xs text-text-subtle">{deck.name}</p>
        <h1 className="font-display text-[40px] leading-none">{t('newCombo.title')}</h1>
        <p className="mt-2 text-text-muted">{t('newCombo.text')}</p>
        <Segmented<'first' | 'second'>
          className="mt-4"
          label={t('decks.going')}
          value={going}
          onChange={setGoing}
          options={[
            { value: 'first', label: t('decks.first') },
            { value: 'second', label: t('decks.second') },
          ]}
        />
      </header>

      {going === 'second' && (
        <section className="grid grid-cols-[minmax(0,1fr)_300px] gap-6 rounded-lg border border-opponent/40 p-4">
          <div className="flex flex-col gap-2">
            <h2 className="font-display text-xl text-opponent">{t('newCombo.opponentBoard')}</h2>
            <p className="text-sm text-text-muted">{t('newCombo.opponentText')}</p>
            <ul className="flex flex-wrap gap-2">
              {opponent.map((c, i) => (
                <li key={`${c.id}-${i}`} className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setOpponent((o) => o.filter((_, k) => k !== i))}
                    aria-label={`${displayName(c, cardLanguage)}: ${t('newCombo.remove')}`}
                  >
                    <CardView
                      image={c.imageSmall}
                      label=""
                      size="sm"
                      faceDown={oppZoneOf(c.type, c.race) === 'MONSTER' ? undefined : 'self'}
                    />
                  </button>
                  <span className="font-mono text-[9.5px] text-text-subtle">
                    {t(`combo.zones.${oppZoneOf(c.type, c.race)}`)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <CardSearchPanel
            label={t('newCombo.opponentBoard')}
            hint={t('newCombo.opponentHint')}
            onAdd={(card) => setOpponent((o) => (o.length < 11 ? [...o, card] : o))}
          />
        </section>
      )}

      {groups.map((g) => (
        <section key={g.key} className="flex flex-col gap-3">
          <h2 className="border-b border-line pb-1.5 font-display text-xl">
            {t(`newCombo.group.${g.key}`)}
          </h2>
          <ul className="grid grid-cols-[repeat(auto-fill,120px)] gap-x-4 gap-y-4">
            {g.list.map((e) => (
              <li key={e.cardId}>
                <CardTile
                  card={cards.get(e.cardId)!}
                  quantity={e.quantity}
                  selected={count(e.cardId) > 0}
                  label={t('newCombo.toHand')}
                  onClick={() => toggle(e)}
                  footer={
                    count(e.cardId) > 0 && (
                      <span className="font-mono text-2xs text-primary">
                        {t('newCombo.inHand', { count: count(e.cardId) })}
                      </span>
                    )
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* Starthand-Leiste bleibt unten sichtbar, mit Titel und „Los“ */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface-1/95 backdrop-blur-[2px]">
        <div className="mx-auto flex h-20 max-w-[1280px] items-center gap-4 px-8">
          <span className="w-24 font-mono text-xs text-text-muted">{counter}</span>
          <ul
            className="flex min-w-0 flex-1 items-center gap-1.5"
            aria-label={t('workbench.startHand')}
          >
            {hand.map((id, i) => (
              <li key={`${id}-${i}`}>
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  aria-label={`${displayName(cards.get(id), cardLanguage)}: ${t('newCombo.remove')}`}
                >
                  <CardView image={cards.get(id)?.imageSmall} label="" size="sm" />
                </button>
              </li>
            ))}
          </ul>
          {duplicate && (
            <Link
              href={`/combos/${duplicate.id}`}
              className="max-w-60 truncate text-xs text-warning underline"
            >
              {t('newCombo.exists', { title: duplicate.title })}
            </Link>
          )}
          <input
            value={shownTitle}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void start()}
            placeholder={t('library.untitled')}
            aria-label={t('combo.titlePlaceholder')}
            className="h-8 w-56 rounded-md border border-line bg-transparent px-2.5 text-sm outline-none focus:border-line-strong"
          />
          <Button
            variant="line"
            onClick={() => {
              setHand(drawHand(expandDeck(main), going === 'second' ? 6 : 5));
              setTitle(null);
            }}
          >
            <Shuffle />
            {t('newCombo.random')}
          </Button>
          <Button onClick={start} disabled={!hand.length || busy}>
            {t('newCombo.go')} <Kbd>⏎</Kbd>
          </Button>
        </div>
      </div>
    </div>
  );
}
