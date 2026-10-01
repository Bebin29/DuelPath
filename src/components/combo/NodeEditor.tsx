'use client';

import { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/lib/i18n/hooks';
import { useCardLanguage } from '@/components/providers/SettingsProvider';
import { cn } from '@/lib/utils';
import type {
  CardMove,
  ComboNodeData,
  GameState,
  Negation,
  NodeKind,
  Player,
  StartState,
  Zone,
} from '@/lib/combo/state';
import { displayName, type ComboCard } from '@/lib/combo/cards';
import { newInstanceId } from '@/lib/combo/tree';
import type { Staple } from '@/lib/combo/reactions';
import { getDeckForCombo, type StapleCard } from '@/server/actions/combo.actions';
import { drawFromDeck, startStateFromDeck } from '@/lib/combo/deck';
import { CardSearchBox } from './CardSearchBox';

export type MoveTarget = 'costMoves' | 'resolveMoves';

const CHILD_KINDS: NodeKind[] = ['ACTION', 'ACTIVATE', 'OPPONENT', 'RESOLVE', 'END'];
const QUICK: { key: string; to: Zone }[] = [
  { key: 'toHand', to: 'HAND' },
  { key: 'summon', to: 'MONSTER' },
  { key: 'toField', to: 'SPELL_TRAP' },
  { key: 'toGy', to: 'GY' },
  { key: 'banish', to: 'BANISHED' },
  { key: 'toDeck', to: 'DECK' },
];
const START_ZONES: Zone[] = [
  'HAND',
  'MONSTER',
  'SPELL_TRAP',
  'FIELD',
  'GY',
  'BANISHED',
  'DECK',
  'EXTRA',
];

const selectClass = 'h-9 w-full rounded-md border bg-background px-2 text-sm';

interface NodeEditorProps {
  node: ComboNodeData;
  /** Zustand vor dem Knoten (Auswahl von Karten und Negierungszielen) */
  before: GameState;
  /** Zustand nach dem Knoten (Ausgangszone für neue Bewegungen) */
  after: GameState;
  ancestors: ComboNodeData[];
  cards: Map<string, ComboCard>;
  moveTarget: MoveTarget;
  onMoveTargetChange: (target: MoveTarget) => void;
  onChange: (patch: Partial<ComboNodeData>) => void;
  onAddChild: (kind: NodeKind) => void;
  onDelete: () => void;
  onRegisterCard: (card: ComboCard) => void;
  staples: StapleCard[];
  onReact: (card: ComboCard, staple: Staple | null) => void;
}

export function NodeEditor(props: NodeEditorProps) {
  const { node, before, after, ancestors, cards, onChange } = props;
  const { t } = useTranslation();
  const cardLanguage = useCardLanguage();
  const [pick, setPick] = useState('');
  const name = (cardId?: string | null) =>
    displayName(cardId ? cards.get(cardId) : undefined, cardLanguage);

  const target: MoveTarget = node.kind === 'ACTIVATE' ? props.moveTarget : 'resolveMoves';
  const addMove = (move: CardMove) => onChange({ [target]: [...(node[target] ?? []), move] });
  const moveCard = (instanceId: string, to: Zone) => {
    const card = after.cards[instanceId];
    if (card) addMove({ instanceId, cardId: card.cardId, from: card.zone, to });
  };

  // Aktivierbare Karten des Spielers: alles außer Deck und Extra Deck
  const activatable = Object.values(before.cards).filter(
    (c) =>
      c.zone !== 'DECK' &&
      c.zone !== 'EXTRA' &&
      (['MONSTER', 'SPELL_TRAP', 'FIELD'].includes(c.zone) ? c.controller : c.owner) === node.player
  );
  // Instanz, die erst durch diesen Knoten entsteht (Reaktion aus der Schnellauswahl), trotzdem anzeigen
  const own = node.instanceId ? after.cards[node.instanceId] : undefined;
  if (own && !activatable.some((c) => c.instanceId === own.instanceId)) activatable.push(own);
  const card = node.cardId ? cards.get(node.cardId) : undefined;

  const negationOptions: { value: string; label: string }[] = [
    ...before.chain.flatMap((link) => [
      {
        value: `ACTIVATION|${link.nodeId}`,
        label: t('combo.negation.ACTIVATION', { name: name(link.cardId) }),
      },
      {
        value: `EFFECT|${link.nodeId}`,
        label: t('combo.negation.EFFECT', { name: name(link.cardId) }),
      },
    ]),
    ...Object.values(before.cards)
      .filter((c) => c.zone === 'MONSTER' && c.position !== 'SET' && c.controller !== node.player)
      .map((c) => ({
        value: `CARD|${c.instanceId}`,
        label: t('combo.negation.CARD', { name: name(c.cardId) }),
      })),
    ...ancestors
      .filter((a) => a.action === 'NORMAL_SUMMON' || a.action === 'SPECIAL_SUMMON')
      .slice(-3)
      .map((a) => ({
        value: `SUMMON|${a.id}`,
        label: t('combo.negation.SUMMON', {
          name: name(a.resolveMoves?.find((m) => m.to === 'MONSTER')?.cardId),
        }),
      })),
  ];
  const negationValue = node.negates
    ? `${node.negates.type}|${'nodeId' in node.negates ? node.negates.nodeId : 'instanceId' in node.negates ? node.negates.instanceId : node.negates.cardId}`
    : '';
  const setNegation = (value: string) => {
    if (!value) return onChange({ negates: null });
    const [type, ref] = value.split('|');
    const negates = (
      type === 'CARD' ? { type, instanceId: ref } : { type, nodeId: ref }
    ) as Negation;
    onChange({ negates });
  };

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{t(`combo.kind.${node.kind}`)}</h2>
        <Button variant="ghost" size="sm" onClick={props.onDelete} title={t('combo.deleteNode')}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">{t('combo.player')}</span>
          <select
            className={selectClass}
            value={node.player}
            onChange={(e) => onChange({ player: e.target.value as Player })}
          >
            <option value="self">{t('combo.players.self')}</option>
            <option value="opponent">{t('combo.players.opponent')}</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">{t('combo.edgeLabel')}</span>
          <Input
            value={node.edgeLabel ?? ''}
            onChange={(e) => onChange({ edgeLabel: e.target.value || null })}
          />
        </label>
      </div>

      {node.kind === 'ACTION' && (
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">{t('combo.action.label')}</span>
          <select
            className={selectClass}
            value={node.action ?? 'OTHER'}
            onChange={(e) => onChange({ action: e.target.value as ComboNodeData['action'] })}
          >
            {(['NORMAL_SUMMON', 'SPECIAL_SUMMON', 'SET', 'OTHER'] as const).map((a) => (
              <option key={a} value={a}>
                {t(`combo.action.${a}`)}
              </option>
            ))}
          </select>
        </label>
      )}

      {node.kind === 'ACTIVATE' && (
        <>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">{t('combo.card')}</span>
            <select
              className={selectClass}
              value={node.instanceId ?? ''}
              onChange={(e) => {
                const instance = before.cards[e.target.value];
                const data = instance ? cards.get(instance.cardId) : undefined;
                const first = data?.effects.findIndex((fx) => fx.activated) ?? -1;
                onChange({
                  instanceId: instance?.instanceId ?? null,
                  cardId: instance?.cardId ?? null,
                  effectIndex: first >= 0 ? first : 0,
                });
              }}
            >
              <option value="">…</option>
              {activatable.map((c) => (
                <option key={c.instanceId} value={c.instanceId}>
                  {name(c.cardId)} ({t(`combo.zones.${c.zone}`)})
                </option>
              ))}
            </select>
          </label>

          {card && card.effects.length > 0 && (
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">{t('combo.effect')}</span>
              <select
                className={selectClass}
                value={node.effectIndex ?? 0}
                onChange={(e) => onChange({ effectIndex: Number(e.target.value) })}
              >
                {card.effects.map((fx) => (
                  <option key={fx.index} value={fx.index}>
                    {fx.index + 1}. {fx.opt ? `[${fx.opt.kind} OPT] ` : ''}
                    {fx.text.slice(0, 90)}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">{t('combo.negates')}</span>
              <select
                className={selectClass}
                value={negationValue}
                onChange={(e) => setNegation(e.target.value)}
              >
                <option value="">{t('combo.none')}</option>
                {negationOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">{t('combo.opt.label')}</span>
              <select
                className={selectClass}
                value={node.optOverride == null ? '' : String(node.optOverride)}
                onChange={(e) =>
                  onChange({
                    optOverride: e.target.value === '' ? null : e.target.value === 'true',
                  })
                }
              >
                <option value="">{t('combo.opt.auto')}</option>
                <option value="true">{t('combo.opt.counts')}</option>
                <option value="false">{t('combo.opt.free')}</option>
              </select>
            </label>
          </div>
        </>
      )}

      {(node.kind === 'ACTION' || node.kind === 'ACTIVATE') && (
        <div className="space-y-2 rounded-md border p-2">
          {node.kind === 'ACTIVATE' && (
            <div className="flex gap-1">
              {(['costMoves', 'resolveMoves'] as const).map((key) => (
                <Button
                  key={key}
                  size="sm"
                  variant={target === key ? 'default' : 'outline'}
                  onClick={() => props.onMoveTargetChange(key)}
                >
                  {t(key === 'costMoves' ? 'combo.moves.cost' : 'combo.moves.resolve')}
                </Button>
              ))}
            </div>
          )}
          <MoveList
            moves={node[target] ?? []}
            name={(m) => name(m.cardId ?? after.cards[m.instanceId]?.cardId)}
            zoneLabel={(z) => t(`combo.zones.${z}`)}
            onRemove={(i) => onChange({ [target]: (node[target] ?? []).filter((_, j) => j !== i) })}
          />
          <p className="text-xs text-muted-foreground">{t('combo.moves.hint')}</p>
          <div className="flex gap-1">
            <select className={selectClass} value={pick} onChange={(e) => setPick(e.target.value)}>
              <option value="">{t('combo.card')} …</option>
              {Object.values(after.cards).map((c) => (
                <option key={c.instanceId} value={c.instanceId}>
                  {name(c.cardId)} ({t(`combo.zones.${c.zone}`)})
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-1">
            {QUICK.map((q) => (
              <Button
                key={q.key}
                size="sm"
                variant="secondary"
                disabled={!pick}
                onClick={() => moveCard(pick, q.to)}
              >
                {t(`combo.quick.${q.key}`)}
              </Button>
            ))}
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">{t('combo.moves.fromDeck')}</span>
            <CardSearchBox
              onPick={(picked) => {
                props.onRegisterCard(picked);
                addMove({
                  instanceId: newInstanceId(picked.id),
                  cardId: picked.id,
                  owner: node.player,
                  from: 'DECK',
                  to: 'HAND',
                });
              }}
            />
          </div>
        </div>
      )}

      {node.kind === 'OPPONENT' && (
        <ReactionPicker
          title={t('combo.reactions.opponent')}
          staples={props.staples.filter((s) => s.staple.side === 'opponent')}
          onReact={props.onReact}
        />
      )}
      {node.kind === 'ACTIVATE' && node.player === 'opponent' && (
        <ReactionPicker
          title={t('combo.reactions.answer')}
          staples={props.staples.filter((s) => s.staple.side === 'self')}
          onReact={props.onReact}
        />
      )}

      <AddChildButtons onAdd={props.onAddChild} />
    </div>
  );
}

/** Schnellauswahl gängiger Reaktionen plus freie Kartensuche */
function ReactionPicker({
  title,
  staples,
  onReact,
}: {
  title: string;
  staples: StapleCard[];
  onReact: (card: ComboCard, staple: Staple | null) => void;
}) {
  const { t } = useTranslation();
  const cardLanguage = useCardLanguage();
  return (
    <div className="space-y-2 rounded-md border border-red-300 p-2">
      <span className="text-xs font-semibold">{title}</span>
      <div className="grid grid-cols-2 gap-1">
        {staples.map(({ card, staple }) => (
          <button
            key={card.id}
            type="button"
            onClick={() => onReact(card, staple)}
            className="flex items-center gap-1 rounded border bg-card p-1 text-left text-xs hover:bg-accent"
          >
            {card.imageSmall && (
              // eslint-disable-next-line @next/next/no-img-element -- kleine Vorschau aus dem lokalen Bild-Cache
              <img src={card.imageSmall} alt="" className="h-8 w-6 shrink-0 object-cover" />
            )}
            <span className="truncate">{displayName(card, cardLanguage)}</span>
          </button>
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{t('combo.reactions.other')}</span>
      <CardSearchBox onPick={(card) => onReact(card, null)} />
    </div>
  );
}

export function StartStateEditor({
  startState,
  cards,
  onChange,
  onAddChild,
  onRegisterCard,
  deckId,
}: {
  startState: StartState;
  cards: Map<string, ComboCard>;
  onChange: (next: StartState) => void;
  onAddChild: (kind: NodeKind) => void;
  onRegisterCard: (card: ComboCard) => void;
  deckId: string | null;
}) {
  const { t } = useTranslation();
  const cardLanguage = useCardLanguage();
  const [player, setPlayer] = useState<Player>('self');
  const [zone, setZone] = useState<Zone>('HAND');
  const [deckError, setDeckError] = useState<string | null>(null);

  const loadDeck = async () => {
    if (!deckId) return;
    const result = await getDeckForCombo(deckId);
    if (!result.data) return setDeckError(result.error ?? null);
    setDeckError(null);
    result.data.cards.forEach(onRegisterCard);
    onChange(startStateFromDeck(startState, result.data.entries));
  };

  // Eigenes Deck im Startzustand, je Karte gezählt: daraus wird die Starthand gezogen
  const deckCounts = new Map<string, number>();
  for (const c of startState.cards) {
    if (c.owner === 'self' && c.zone === 'DECK') {
      deckCounts.set(c.cardId, (deckCounts.get(c.cardId) ?? 0) + 1);
    }
  }

  return (
    <div className="space-y-3 text-sm">
      <h2 className="font-semibold">{t('combo.start')}</h2>
      <p className="text-xs text-muted-foreground">{t('combo.startEditor.hint')}</p>
      {deckId && (
        <div className="space-y-2 rounded-md border p-2">
          <Button size="sm" variant="outline" onClick={loadDeck}>
            {t('combo.deck.load')}
          </Button>
          {deckError && <p className="text-xs text-destructive">{deckError}</p>}
          {deckCounts.size > 0 && (
            <>
              <span className="block text-xs text-muted-foreground">{t('combo.deck.draw')}</span>
              <div className="flex flex-wrap gap-1">
                {[...deckCounts].map(([cardId, count]) => (
                  <Button
                    key={cardId}
                    size="sm"
                    variant="secondary"
                    onClick={() => onChange(drawFromDeck(startState, cardId))}
                  >
                    {displayName(cards.get(cardId), cardLanguage)} ×{count}
                  </Button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <select
          className={selectClass}
          value={player}
          onChange={(e) => setPlayer(e.target.value as Player)}
        >
          <option value="self">{t('combo.players.self')}</option>
          <option value="opponent">{t('combo.players.opponent')}</option>
        </select>
        <select
          className={selectClass}
          value={zone}
          onChange={(e) => setZone(e.target.value as Zone)}
        >
          {START_ZONES.map((z) => (
            <option key={z} value={z}>
              {t(`combo.zones.${z}`)}
            </option>
          ))}
        </select>
      </div>
      <CardSearchBox
        onPick={(card) => {
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
        }}
      />
      <ul className="space-y-1">
        {startState.cards.map((c) => (
          <li key={c.instanceId} className="flex items-center justify-between gap-2">
            <span className="truncate">
              {displayName(cards.get(c.cardId), cardLanguage)}
              <span className="text-muted-foreground">
                {' '}
                · {t(`combo.players.${c.owner}`)} · {t(`combo.zones.${c.zone}`)}
              </span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                onChange({ cards: startState.cards.filter((x) => x.instanceId !== c.instanceId) })
              }
            >
              <X className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
      <AddChildButtons onAdd={onAddChild} />
    </div>
  );
}

function MoveList({
  moves,
  name,
  zoneLabel,
  onRemove,
}: {
  moves: CardMove[];
  name: (m: CardMove) => string;
  zoneLabel: (z: Zone) => string;
  onRemove: (index: number) => void;
}) {
  if (moves.length === 0) return null;
  return (
    <ul className="space-y-1">
      {moves.map((m, i) => (
        <li key={`${m.instanceId}-${i}`} className="flex items-center justify-between gap-2">
          <span className="truncate">
            {name(m)}: {zoneLabel(m.from)} → {zoneLabel(m.to)}
          </span>
          <Button variant="ghost" size="sm" onClick={() => onRemove(i)}>
            <X className="h-4 w-4" />
          </Button>
        </li>
      ))}
    </ul>
  );
}

function AddChildButtons({ onAdd }: { onAdd: (kind: NodeKind) => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-1 border-t pt-2">
      <span className="text-xs text-muted-foreground">{t('combo.addChild')}</span>
      <div className="flex flex-wrap gap-1">
        {CHILD_KINDS.map((kind) => (
          <Button
            key={kind}
            size="sm"
            variant="outline"
            className={cn(kind === 'OPPONENT' && 'border-red-400')}
            onClick={() => onAdd(kind)}
          >
            {t(`combo.kind.${kind}`)}
          </Button>
        ))}
      </div>
    </div>
  );
}
