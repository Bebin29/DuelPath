'use client';

import { useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { useCardLanguage } from '@/components/providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { CardSearchBox } from '@/components/combo/CardSearchBox';
import { displayName, type ComboCard } from '@/lib/combo/cards';
import { drawFromDeck, startStateFromDeck } from '@/lib/combo/deck';
import { newInstanceId } from '@/lib/combo/tree';
import type { Player, StartState, Zone } from '@/lib/combo/state';
import { getDeckForCombo } from '@/server/actions/combo.actions';

/** Zonen, in die man Karten für den Start legt; Deck und Extra füllt „Deck laden“ */
const ADD_ZONES: Zone[] = ['HAND', 'MONSTER', 'SPELL_TRAP', 'FIELD', 'GY', 'BANISHED'];
/** Reihenfolge der Gruppen: erst die eigene Hand, dann das Gegnerboard */
const ORDER: [Player, Zone][] = [
  ['self', 'HAND'],
  ['self', 'MONSTER'],
  ['self', 'SPELL_TRAP'],
  ['self', 'FIELD'],
  ['self', 'GY'],
  ['self', 'BANISHED'],
  ['opponent', 'HAND'],
  ['opponent', 'MONSTER'],
  ['opponent', 'SPELL_TRAP'],
  ['opponent', 'FIELD'],
  ['opponent', 'GY'],
  ['opponent', 'BANISHED'],
];
const DRAW_COLLAPSED = 8;

/**
 * Startzustand im Inspector (UI-Sweep-Plan, Phase 3): Karten je Seite und Zone gruppiert mit
 * Anzahl statt einer Zeile pro Kopie, Ziehen aus dem Deck mit Suche, Hinzufügen über
 * Seite und Zone als Auswahl. Eigenes Deck und Extra Deck erscheinen nur als Zahl.
 */
export function StartStatePanel({
  startState,
  cards,
  deckId,
  onChange,
  onRegisterCard,
}: {
  startState: StartState;
  cards: Map<string, ComboCard>;
  deckId: string | null;
  onChange: (next: StartState) => void;
  onRegisterCard: (card: ComboCard) => void;
}) {
  const { t } = useTranslation();
  const cardLanguage = useCardLanguage();
  const [player, setPlayer] = useState<Player>('self');
  const [zone, setZone] = useState<Zone>('HAND');
  const [drawQuery, setDrawQuery] = useState('');
  const [drawAll, setDrawAll] = useState(false);
  const [deckError, setDeckError] = useState<string | null>(null);
  const name = (cardId: string) => displayName(cards.get(cardId), cardLanguage);

  const loadDeck = async () => {
    if (!deckId) return;
    const result = await getDeckForCombo(deckId);
    if (!result.data) return setDeckError(result.error ?? null);
    setDeckError(null);
    result.data.cards.forEach(onRegisterCard);
    onChange(startStateFromDeck(startState, result.data.entries));
  };

  const { groups, deckCounts, piles } = useMemo(() => {
    const groups = new Map<string, Map<string, string[]>>();
    const deckCounts = new Map<string, number>();
    const piles = { DECK: 0, EXTRA: 0 };
    for (const c of startState.cards) {
      if (c.owner === 'self' && (c.zone === 'DECK' || c.zone === 'EXTRA')) {
        piles[c.zone]++;
        if (c.zone === 'DECK') deckCounts.set(c.cardId, (deckCounts.get(c.cardId) ?? 0) + 1);
        continue;
      }
      const key = `${c.owner}:${c.zone}`;
      const byCard = groups.get(key) ?? new Map<string, string[]>();
      byCard.set(c.cardId, [...(byCard.get(c.cardId) ?? []), c.instanceId]);
      groups.set(key, byCard);
    }
    return { groups, deckCounts, piles };
  }, [startState]);

  const drawable = [...deckCounts]
    .map(([cardId, count]) => ({ cardId, count, label: name(cardId) }))
    .filter((d) => d.label.toLowerCase().includes(drawQuery.trim().toLowerCase()))
    .sort((a, b) => a.label.localeCompare(b.label));
  const shownDraw = drawAll || drawQuery ? drawable : drawable.slice(0, DRAW_COLLAPSED);

  const removeOne = (instanceId: string) =>
    onChange({ cards: startState.cards.filter((c) => c.instanceId !== instanceId) });
  const add = (card: ComboCard) => {
    onRegisterCard(card);
    onChange({
      cards: [
        ...startState.cards,
        {
          instanceId: newInstanceId(card.id),
          cardId: card.id,
          owner: player,
          zone,
          ...(zone === 'MONSTER' && { position: 'ATK' as const }),
          // Fallen und Zauber des Gegnerboards liegen in der Regel verdeckt
          ...(zone === 'SPELL_TRAP' && { position: 'SET' as const }),
        },
      ],
    });
  };

  return (
    <div className="flex flex-col gap-5 text-sm">
      <p className="text-xs text-text-muted">{t('combo.startEditor.hint')}</p>

      {/* Was schon im Startzustand liegt, je Seite und Zone */}
      <section aria-label={t('workbench.start.current')} className="flex flex-col gap-3">
        {ORDER.filter(([p, z]) => groups.has(`${p}:${z}`)).map(([p, z]) => {
          const byCard = groups.get(`${p}:${z}`)!;
          const total = [...byCard.values()].reduce((n, ids) => n + ids.length, 0);
          return (
            <div key={`${p}:${z}`} className="flex flex-col gap-1.5">
              <h3
                className={cn(
                  'flex items-center gap-1.5 font-mono text-2xs',
                  p === 'opponent' ? 'text-opponent' : 'text-self'
                )}
              >
                {t(`combo.players.${p}`)} · {t(`combo.zones.${z}`)}
                <span className="text-text-subtle">{total}</span>
              </h3>
              <ul className="flex flex-wrap gap-1">
                {[...byCard].map(([cardId, ids]) => (
                  <li
                    key={cardId}
                    className="flex h-7 items-center gap-1 rounded-sm border border-line bg-surface-2 pl-2 text-xs"
                  >
                    <span className="max-w-44 truncate">{name(cardId)}</span>
                    {ids.length > 1 && (
                      <span className="font-mono text-2xs text-text-subtle">×{ids.length}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeOne(ids[ids.length - 1])}
                      aria-label={t('workbench.start.removeOne', { name: name(cardId) })}
                      className="grid h-full w-6 place-items-center text-text-subtle hover:text-ink"
                    >
                      <X className="size-3" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {(piles.DECK > 0 || piles.EXTRA > 0) && (
          <p className="font-mono text-2xs text-text-subtle">
            {t('combo.zones.DECK')} {piles.DECK} · {t('combo.zones.EXTRA')} {piles.EXTRA}
          </p>
        )}
      </section>

      {/* Aus dem Deck auf die Hand */}
      {deckId && (
        <section aria-label={t('combo.deck.draw')} className="flex flex-col gap-2">
          <h3 className="font-display text-base">{t('combo.deck.draw').replace(/:$/, '')}</h3>
          <Button size="sm" variant="line" className="self-start" onClick={loadDeck}>
            {t('combo.deck.load')}
          </Button>
          {deckError && <p className="text-xs text-opponent">{deckError}</p>}
          {deckCounts.size > DRAW_COLLAPSED && (
            <input
              value={drawQuery}
              onChange={(e) => setDrawQuery(e.target.value)}
              placeholder={t('workbench.start.filterDeck')}
              aria-label={t('workbench.start.filterDeck')}
              className="h-8 rounded-md border border-line bg-surface-1 px-2.5 text-sm outline-none placeholder:text-text-subtle focus:border-line-strong"
            />
          )}
          <ul className="flex flex-wrap gap-1">
            {shownDraw.map((d) => (
              <li key={d.cardId}>
                <button
                  type="button"
                  onClick={() => onChange(drawFromDeck(startState, d.cardId))}
                  className="flex h-7 items-center gap-1 rounded-sm border border-line px-2 text-xs hover:border-line-strong hover:bg-surface-3"
                >
                  <Plus className="size-3 text-text-subtle" />
                  <span className="max-w-44 truncate">{d.label}</span>
                  <span className="font-mono text-2xs text-text-subtle">{d.count}</span>
                </button>
              </li>
            ))}
          </ul>
          {!drawQuery && drawable.length > DRAW_COLLAPSED && (
            <Button
              variant="text"
              size="sm"
              className="self-start"
              onClick={() => setDrawAll((a) => !a)}
            >
              {drawAll ? t('settings.showLess') : t('settings.showAll', { count: drawable.length })}
            </Button>
          )}
        </section>
      )}

      {/* Beliebige Karte dazulegen, etwa fürs Gegnerboard */}
      <section aria-label={t('combo.startEditor.add')} className="flex flex-col gap-2">
        <h3 className="font-display text-base">{t('combo.startEditor.add')}</h3>
        <Segmented<Player>
          label={t('workbench.start.side')}
          value={player}
          onChange={setPlayer}
          options={[
            { value: 'self', label: t('combo.players.self') },
            { value: 'opponent', label: t('combo.players.opponent') },
          ]}
        />
        <div
          role="radiogroup"
          aria-label={t('workbench.start.zone')}
          className="flex flex-wrap gap-1"
        >
          {ADD_ZONES.map((z) => (
            <button
              key={z}
              type="button"
              role="radio"
              aria-checked={zone === z}
              onClick={() => setZone(z)}
              className={cn(
                'h-7 rounded-sm border px-2 text-xs transition-colors duration-(--motion-fast)',
                zone === z
                  ? 'border-ink bg-ink text-on-primary'
                  : 'border-line text-text-muted hover:border-line-strong'
              )}
            >
              {t(`combo.zones.${z}`)}
            </button>
          ))}
        </div>
        <CardSearchBox onPick={add} />
      </section>
    </div>
  );
}
