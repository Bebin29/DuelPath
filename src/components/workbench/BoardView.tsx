'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useTranslation } from '@/lib/i18n/hooks';
import { useCardLanguage } from '@/components/providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { CardView } from '@/components/cards/CardView';
import { boardOf, EMZ_LEFT, EMZ_RIGHT } from '@/lib/combo/board';
import { displayName, type ComboCard } from '@/lib/combo/cards';
import type { GameState, PlacedCard, Player, Zone } from '@/lib/combo/state';

export interface BoardMove {
  instanceId: string;
  zone: Zone;
  player: Player;
  slot?: number;
}

interface BoardViewProps {
  state: GameState;
  cards: Map<string, ComboCard>;
  /** Karten, die seit dem vorigen Schritt neu in ihrer Zone liegen (UX-Plan 4.7) */
  changed: Set<string>;
  inspectedId: string | null;
  onInspect: (instanceId: string | null) => void;
  onMove?: (move: BoardMove) => void;
}

const dropId = (player: Player, zone: Zone, slot?: number) =>
  slot === undefined ? `${player}:${zone}` : `${player}:${zone}:${slot}`;

/**
 * Spielfeld nach UI-Plan 6.3: Gegner um 180 Grad gedreht oben, eigene Seite unten,
 * Extra Monster Zones in der Mitte, Stapel außen, Hände oben und unten, Chain rechts.
 */
export function BoardView({
  state,
  cards,
  changed,
  inspectedId,
  onInspect,
  onMove,
}: BoardViewProps) {
  const { t } = useTranslation();
  const cardLanguage = useCardLanguage();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );
  const me = boardOf(state, 'self');
  const opp = boardOf(state, 'opponent');

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || !onMove) return;
    const [player, zone, slot] = String(over.id).split(':');
    onMove({
      instanceId: String(active.id),
      player: player as Player,
      zone: zone as Zone,
      slot: slot === undefined ? undefined : Number(slot),
    });
  };

  const cell = (
    player: Player,
    zone: Zone,
    card: PlacedCard | null,
    label: string,
    slot?: number
  ) => (
    <ZoneCell
      key={dropId(player, zone, slot)}
      id={dropId(player, zone, slot)}
      label={label}
      short={
        zone === 'MONSTER'
          ? slot !== undefined && slot >= EMZ_LEFT
            ? 'EMZ'
            : 'MZ'
          : zone === 'SPELL_TRAP'
            ? slot === 0 || slot === 4
              ? 'P S/T'
              : 'S/T'
            : label
      }
      card={card}
      cards={cards}
      changed={changed}
      inspectedId={inspectedId}
      onInspect={onInspect}
      draggable={Boolean(onMove)}
    />
  );
  const pile = (player: Player, zone: Zone, list: PlacedCard[], label: string) => (
    <PileCell
      key={dropId(player, zone)}
      id={dropId(player, zone)}
      label={label}
      list={list}
      cards={cards}
      faceDown={zone === 'DECK' || zone === 'EXTRA'}
      onInspect={onInspect}
    />
  );
  const mz = t('combo.zones.MONSTER');
  const st = t('combo.zones.SPELL_TRAP');
  // Der Gegner sitzt gegenüber: seine Zone 0 liegt aus unserer Sicht rechts
  const mirrored = <T,>(row: T[]) => row.map((c, i) => ({ c, i })).reverse();
  const emzOf = (slot: number) =>
    (slot === EMZ_LEFT ? me.extraMonsters[0] : me.extraMonsters[1]) ??
    (slot === EMZ_LEFT ? opp.extraMonsters[1] : opp.extraMonsters[0]);

  return (
    <DndContext id="workbench-board" sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex h-full items-center justify-center gap-6 overflow-auto bg-felt p-6">
        <div className="flex flex-col items-center gap-3">
          <SideLabel player="opponent" label={t('workbench.opponent')}>
            <Hand
              player="opponent"
              list={opp.hand}
              cards={cards}
              changed={changed}
              onInspect={onInspect}
              draggable={Boolean(onMove)}
            />
          </SideLabel>

          <div className="grid grid-cols-7 gap-1.5">
            {pile('opponent', 'DECK', opp.deck, t('workbench.deck'))}
            {mirrored(opp.spellTraps).map(({ c, i }) =>
              cell('opponent', 'SPELL_TRAP', c, `${st} ${i + 1}`, i)
            )}
            {pile('opponent', 'EXTRA', opp.extra, t('workbench.extra'))}

            {pile('opponent', 'GY', opp.gy, t('workbench.gy'))}
            {mirrored(opp.monsters).map(({ c, i }) =>
              cell('opponent', 'MONSTER', c, `${mz} ${i + 1}`, i)
            )}
            {cell('opponent', 'FIELD', opp.field, t('workbench.fieldZone'))}

            {pile('opponent', 'BANISHED', opp.banished, t('workbench.banished'))}
            <span />
            {cell('self', 'MONSTER', emzOf(EMZ_LEFT), `${t('workbench.emz')} 1`, EMZ_LEFT)}
            <span />
            {cell('self', 'MONSTER', emzOf(EMZ_RIGHT), `${t('workbench.emz')} 2`, EMZ_RIGHT)}
            <span />
            {pile('self', 'BANISHED', me.banished, t('workbench.banished'))}

            {cell('self', 'FIELD', me.field, t('workbench.fieldZone'))}
            {me.monsters.map((c, i) => cell('self', 'MONSTER', c, `${mz} ${i + 1}`, i))}
            {pile('self', 'GY', me.gy, t('workbench.gy'))}

            {pile('self', 'EXTRA', me.extra, t('workbench.extra'))}
            {me.spellTraps.map((c, i) => cell('self', 'SPELL_TRAP', c, `${st} ${i + 1}`, i))}
            {pile('self', 'DECK', me.deck, t('workbench.deck'))}
          </div>

          <SideLabel player="self" label={t('workbench.self')}>
            <Hand
              player="self"
              list={me.hand}
              cards={cards}
              changed={changed}
              onInspect={onInspect}
              draggable={Boolean(onMove)}
            />
          </SideLabel>

          {[...me.overflow, ...opp.overflow].length > 0 && (
            <p className="font-mono text-2xs text-warning">
              {t('workbench.overflow')}:{' '}
              {[...me.overflow, ...opp.overflow]
                .map((c) => displayName(cards.get(c.cardId), cardLanguage))
                .join(', ')}
            </p>
          )}
        </div>

        <ChainColumn state={state} cards={cards} onInspect={onInspect} />
      </div>
    </DndContext>
  );
}

function SideLabel({
  player,
  label,
  children,
}: {
  player: Player;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full items-center gap-3">
      <span className="flex w-16 items-center gap-2 font-mono text-[9.5px] text-text-subtle">
        <i
          className={cn(
            'h-2.5 w-[3px] rounded-[1px]',
            player === 'self' ? 'bg-self' : 'bg-opponent'
          )}
        />
        {label}
      </span>
      <div className="flex flex-1 justify-center">{children}</div>
      <span className="w-16" />
    </div>
  );
}

function Hand({
  player,
  list,
  cards,
  changed,
  onInspect,
  draggable,
}: {
  player: Player;
  list: PlacedCard[];
  cards: Map<string, ComboCard>;
  changed: Set<string>;
  onInspect: (id: string | null) => void;
  draggable: boolean;
}) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id: dropId(player, 'HAND') });
  return (
    <div
      ref={setNodeRef}
      aria-label={`${t('workbench.hand')}, ${player === 'self' ? t('workbench.self') : t('workbench.opponent')}`}
      className={cn(
        'flex min-h-12 min-w-40 items-center justify-center gap-1.5 rounded-md px-2 py-1',
        isOver && 'bg-ink/7 outline outline-1 outline-primary'
      )}
    >
      {list.map((c) => (
        <DraggableCard
          key={c.instanceId}
          placed={c}
          card={cards.get(c.cardId)}
          size={player === 'self' ? 'board' : 'xs'}
          isNew={changed.has(c.instanceId) ? player : undefined}
          onInspect={onInspect}
          draggable={draggable}
        />
      ))}
    </div>
  );
}

function ZoneCell({
  id,
  label,
  short,
  card,
  cards,
  changed,
  inspectedId,
  onInspect,
  draggable,
}: {
  id: string;
  label: string;
  /** Kurzform in der leeren Zone, der volle Name steht im aria-label */
  short: string;
  card: PlacedCard | null;
  cards: Map<string, ComboCard>;
  changed: Set<string>;
  inspectedId: string | null;
  onInspect: (id: string | null) => void;
  draggable: boolean;
}) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id });
  const side = id.startsWith('self') ? t('workbench.self') : t('workbench.opponent');
  return (
    <div
      ref={setNodeRef}
      aria-label={`${label}, ${side}${card ? '' : `, ${t('workbench.empty')}`}`}
      className={cn(
        'relative grid size-[84px] place-items-center rounded-sm border',
        card ? 'border-transparent' : 'border-zone',
        isOver && 'border-primary bg-ink/7'
      )}
    >
      {!card && <span className="font-mono text-[9.5px] text-text-subtle">{short}</span>}
      {card && (
        <DraggableCard
          placed={card}
          card={cards.get(card.cardId)}
          size="board"
          isNew={changed.has(card.instanceId) ? card.owner : undefined}
          selected={inspectedId === card.instanceId}
          onInspect={onInspect}
          draggable={draggable}
        />
      )}
    </div>
  );
}

function PileCell({
  id,
  label,
  list,
  cards,
  faceDown,
  onInspect,
}: {
  id: string;
  label: string;
  list: PlacedCard[];
  cards: Map<string, ComboCard>;
  faceDown: boolean;
  onInspect: (id: string | null) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const top = list.at(-1);
  const card = top ? cards.get(top.cardId) : undefined;
  return (
    <div
      ref={setNodeRef}
      aria-label={`${label}: ${list.length}`}
      className={cn(
        'flex size-[84px] flex-col items-center justify-center gap-1 rounded-sm border border-line',
        isOver && 'border-primary bg-ink/7'
      )}
      onMouseEnter={() => top && !faceDown && onInspect(top.instanceId)}
    >
      {top ? (
        <CardView
          image={faceDown ? null : card?.imageSmall}
          label={label}
          size="xs"
          faceDown={faceDown ? 'opponent' : undefined}
        />
      ) : (
        <span className="h-[46px]" />
      )}
      <span className="font-mono text-[9.5px] text-text-muted">
        {label} {list.length}
      </span>
    </div>
  );
}

function DraggableCard({
  placed,
  card,
  size,
  isNew,
  selected,
  onInspect,
  draggable,
}: {
  placed: PlacedCard;
  card: ComboCard | undefined;
  size: 'board' | 'xs';
  isNew?: Player;
  selected?: boolean;
  onInspect: (id: string | null) => void;
  draggable: boolean;
}) {
  const cardLanguage = useCardLanguage();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: placed.instanceId,
    disabled: !draggable,
  });
  const hidden = placed.position === 'SET' && placed.controller === 'opponent';
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onMouseEnter={() => !hidden && onInspect(placed.instanceId)}
      onFocus={() => !hidden && onInspect(placed.instanceId)}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
      className={cn(
        'rounded-sm outline-none',
        draggable && 'cursor-grab',
        isDragging && 'relative z-30 cursor-grabbing drop-shadow-[0_14px_20px_rgb(0_0_0/0.5)]'
      )}
    >
      <CardView
        image={card?.imageSmall}
        label={displayName(card, cardLanguage)}
        size={size}
        isNew={isNew}
        selected={selected}
        faceDown={placed.position === 'SET' ? placed.controller : undefined}
        defense={placed.position === 'DEF'}
      />
    </div>
  );
}

function ChainColumn({
  state,
  cards,
  onInspect,
}: {
  state: GameState;
  cards: Map<string, ComboCard>;
  onInspect: (id: string | null) => void;
}) {
  const { t } = useTranslation();
  const cardLanguage = useCardLanguage();
  return (
    <section
      aria-label={t('workbench.chain')}
      className="flex w-40 shrink-0 flex-col gap-2 self-center"
    >
      <h3 className="font-display text-lg">{t('workbench.chain')}</h3>
      {state.chain.length === 0 && (
        <p className="text-xs text-text-subtle">{t('workbench.noChain')}</p>
      )}
      {[...state.chain].reverse().map((link) => {
        const n = state.chain.indexOf(link) + 1;
        const card = link.cardId ? cards.get(link.cardId) : undefined;
        return (
          <button
            key={link.nodeId}
            type="button"
            onMouseEnter={() => link.instanceId && onInspect(link.instanceId)}
            className={cn(
              'flex items-center gap-2 rounded-sm border px-2 py-1.5 text-left text-xs',
              link.player === 'opponent'
                ? 'border-opponent shadow-[inset_3px_0_0_var(--opponent)]'
                : 'border-chain',
              link.negated && 'opacity-60 line-through decoration-opponent'
            )}
          >
            <span
              className={cn(
                'font-mono text-[10.5px] font-semibold',
                link.player === 'opponent' ? 'text-opponent' : 'text-chain'
              )}
            >
              CL{n}
            </span>
            <CardView image={card?.imageSmall} label={displayName(card, cardLanguage)} size="art" />
            <span className="truncate">{displayName(card, cardLanguage)}</span>
          </button>
        );
      })}
    </section>
  );
}
