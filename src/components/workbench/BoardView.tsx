'use client';

import { useEffect, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { MotionConfig, motion } from 'motion/react';
import { X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { useCardLanguage } from '@/components/providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CardView } from '@/components/cards/CardView';
import { boardOf, EMZ_LEFT, EMZ_RIGHT } from '@/lib/combo/board';
import { displayName, type ComboCard } from '@/lib/combo/cards';
import type { DropTarget } from '@/lib/combo/play';
import {
  START_LP,
  type GameState,
  type PlacedCard,
  type Player,
  type Zone,
} from '@/lib/combo/state';

/** Auswahl am Board, etwa Materialien für eine Extra-Deck-Beschwörung */
export interface BoardPicking {
  pickable: Set<string>;
  picked: Set<string>;
}

interface BoardViewProps {
  state: GameState;
  cards: Map<string, ComboCard>;
  /** Karten, die seit dem vorigen Schritt neu in ihrer Zone liegen (UX-Plan 4.7) */
  changed: Set<string>;
  inspectedId: string | null;
  onInspect: (instanceId: string | null) => void;
  /** Karte abgelegt; Umschalt setzt statt zu beschwören bzw. zu aktivieren */
  onDrop?: (instanceId: string, target: DropTarget, shift: boolean) => void;
  /** Vorschau an der Zone beim Ziehen, etwa „Normal Summon“ (UI-Plan 7.2.3) */
  describeDrop?: (instanceId: string, target: DropTarget, shift: boolean) => string | null;
  /** Klick auf eine Karte; der Punkt ist die rechte obere Ecke für das Aktionsmenü */
  onCardClick?: (instanceId: string, at: { x: number; y: number }) => void;
  picking?: BoardPicking | null;
  /** Klick auf eine leere Monsterzone, etwa um eine Spielmarke anzulegen */
  onEmptyZone?: (target: DropTarget, at: { x: number; y: number }) => void;
}

const dropId = (player: Player, zone: Zone, slot?: number) =>
  slot === undefined ? `${player}:${zone}` : `${player}:${zone}:${slot}`;
const parseDropId = (id: string): DropTarget => {
  const [player, zone, slot] = id.split(':');
  return {
    player: player as Player,
    zone: zone as Zone,
    slot: slot === undefined ? undefined : Number(slot),
  };
};

/** Kartenbewegung zwischen Zonen (Motion-System: Karte fliegt, federt kurz nach) */
const CARD_SPRING = { type: 'spring', bounce: 0.28, visualDuration: 0.32 } as const;

/** Was jede Karte am Board braucht; einmal gebündelt statt durch alle Zellen gereicht */
interface CardEnv {
  cards: Map<string, ComboCard>;
  changed: Set<string>;
  inspectedId: string | null;
  onInspect: (id: string | null) => void;
  onClick: (id: string, el: HTMLElement) => void;
  draggable: boolean;
  picking?: BoardPicking | null;
  /** Nach einem Ablegen bekommt die Karte eine neue Motion-ID: sie liegt schon, wo sie hin soll */
  layoutIdOf: (id: string) => string;
  /** Xyz-Materialien unter der Karte */
  materialCount: (id: string) => number;
  onEmptyZone?: (id: string, el: HTMLElement) => void;
}

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
  onDrop,
  describeDrop,
  onCardClick,
  picking,
  onEmptyZone,
}: BoardViewProps) {
  const { t } = useTranslation();
  const cardLanguage = useCardLanguage();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    // Enter gehört der Schrittleiste (Auflösen, Bestätigen); gezogen wird mit der Leertaste
    useSensor(KeyboardSensor, {
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] },
    })
  );
  const me = boardOf(state, 'self');
  const opp = boardOf(state, 'opponent');

  const [drag, setDrag] = useState<{ id: string; over: string | null } | null>(null);
  const [shift, setShift] = useState(false);
  const [generations, setGenerations] = useState<Record<string, number>>({});
  const [pile, setPile] = useState<{ player: Player; zone: Zone } | null>(null);
  const dragged = useRef(false);

  // Umschalt während des Ziehens ändert die Vorschau sofort
  useEffect(() => {
    if (!drag) return;
    const onKey = (e: KeyboardEvent) => setShift(e.shiftKey);
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  }, [drag]);

  useEffect(() => {
    if (!pile) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPile(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pile]);

  const handleDragEnd = ({ active, over, activatorEvent }: DragEndEvent) => {
    setDrag(null);
    setTimeout(() => (dragged.current = false), 0);
    if (!over || !onDrop) return;
    const id = String(active.id);
    setGenerations((g) => ({ ...g, [id]: (g[id] ?? 0) + 1 }));
    onDrop(
      id,
      parseDropId(String(over.id)),
      shift || (activatorEvent instanceof PointerEvent && activatorEvent.shiftKey)
    );
  };

  const preview =
    drag?.over && describeDrop ? describeDrop(drag.id, parseDropId(drag.over), shift) : null;
  const previewOf = (id: string) => (drag?.over === id ? preview : null);

  const env: CardEnv = {
    cards,
    changed,
    inspectedId,
    onInspect,
    onClick: (id, el) => {
      if (dragged.current || !onCardClick) return;
      const rect = el.getBoundingClientRect();
      onCardClick(id, { x: rect.right + 4, y: rect.top });
    },
    draggable: Boolean(onDrop),
    picking,
    layoutIdOf: (id) => `card-${id}-${generations[id] ?? 0}`,
    materialCount: (id) =>
      Object.values(state.cards).filter((c) => c.zone === 'MATERIAL' && c.attachedTo === id).length,
    onEmptyZone: onEmptyZone
      ? (id, el) => {
          const rect = el.getBoundingClientRect();
          onEmptyZone(parseDropId(id), { x: rect.right + 4, y: rect.top });
        }
      : undefined,
  };
  const active = drag ? state.cards[drag.id] : undefined;

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
      preview={previewOf(dropId(player, zone, slot))}
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
      env={env}
    />
  );
  const pileCell = (player: Player, zone: Zone, list: PlacedCard[], label: string) => (
    <PileCell
      key={dropId(player, zone)}
      id={dropId(player, zone)}
      label={label}
      list={list}
      env={env}
      preview={previewOf(dropId(player, zone))}
      faceDown={zone === 'DECK' || zone === 'EXTRA'}
      onOpen={() => setPile({ player, zone })}
    />
  );
  const pileLabel: Partial<Record<Zone, string>> = {
    DECK: t('workbench.deck'),
    EXTRA: t('workbench.extra'),
    GY: t('workbench.gy'),
    BANISHED: t('workbench.banished'),
  };
  const pileList = (player: Player, zone: Zone) => {
    const side = player === 'self' ? me : opp;
    return zone === 'DECK'
      ? side.deck
      : zone === 'EXTRA'
        ? side.extra
        : zone === 'GY'
          ? side.gy
          : side.banished;
  };
  const mz = t('combo.zones.MONSTER');
  const st = t('combo.zones.SPELL_TRAP');
  // Der Gegner sitzt gegenüber: seine Zone 0 liegt aus unserer Sicht rechts
  const mirrored = <T,>(row: T[]) => row.map((c, i) => ({ c, i })).reverse();
  const emzOf = (slot: number) =>
    (slot === EMZ_LEFT ? me.extraMonsters[0] : me.extraMonsters[1]) ??
    (slot === EMZ_LEFT ? opp.extraMonsters[1] : opp.extraMonsters[0]);

  return (
    <MotionConfig transition={CARD_SPRING} reducedMotion="user">
      <DndContext
        id="workbench-board"
        sensors={sensors}
        onDragStart={({ active, activatorEvent }) => {
          dragged.current = true;
          setShift(activatorEvent instanceof PointerEvent && activatorEvent.shiftKey);
          setDrag({ id: String(active.id), over: null });
        }}
        onDragOver={({ active, over }) =>
          setDrag({ id: String(active.id), over: over ? String(over.id) : null })
        }
        onDragCancel={() => {
          setDrag(null);
          setTimeout(() => (dragged.current = false), 0);
        }}
        onDragEnd={handleDragEnd}
      >
        <div className="relative flex h-full items-center justify-center gap-6 overflow-auto bg-felt p-6">
          <div className="flex flex-col items-center gap-3">
            <SideLabel player="opponent" label={t('workbench.opponent')} lp={state.lp.opponent}>
              <Hand
                player="opponent"
                list={opp.hand}
                env={env}
                preview={previewOf(dropId('opponent', 'HAND'))}
              />
            </SideLabel>

            <div className="grid grid-cols-7 gap-1.5">
              {pileCell('opponent', 'DECK', opp.deck, t('workbench.deck'))}
              {mirrored(opp.spellTraps).map(({ c, i }) =>
                cell('opponent', 'SPELL_TRAP', c, `${st} ${i + 1}`, i)
              )}
              {pileCell('opponent', 'EXTRA', opp.extra, t('workbench.extra'))}

              {pileCell('opponent', 'GY', opp.gy, t('workbench.gy'))}
              {mirrored(opp.monsters).map(({ c, i }) =>
                cell('opponent', 'MONSTER', c, `${mz} ${i + 1}`, i)
              )}
              {cell('opponent', 'FIELD', opp.field, t('workbench.fieldZone'))}

              {pileCell('opponent', 'BANISHED', opp.banished, t('workbench.banished'))}
              <span />
              {cell('self', 'MONSTER', emzOf(EMZ_LEFT), `${t('workbench.emz')} 1`, EMZ_LEFT)}
              <span />
              {cell('self', 'MONSTER', emzOf(EMZ_RIGHT), `${t('workbench.emz')} 2`, EMZ_RIGHT)}
              <span />
              {pileCell('self', 'BANISHED', me.banished, t('workbench.banished'))}

              {cell('self', 'FIELD', me.field, t('workbench.fieldZone'))}
              {me.monsters.map((c, i) => cell('self', 'MONSTER', c, `${mz} ${i + 1}`, i))}
              {pileCell('self', 'GY', me.gy, t('workbench.gy'))}

              {pileCell('self', 'EXTRA', me.extra, t('workbench.extra'))}
              {me.spellTraps.map((c, i) => cell('self', 'SPELL_TRAP', c, `${st} ${i + 1}`, i))}
              {pileCell('self', 'DECK', me.deck, t('workbench.deck'))}
            </div>

            <SideLabel player="self" label={t('workbench.self')} lp={state.lp.self}>
              <Hand
                player="self"
                list={me.hand}
                env={env}
                preview={previewOf(dropId('self', 'HAND'))}
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

          {pile && (
            <PileOverlay
              title={t('workbench.pileTitle', {
                zone: `${pileLabel[pile.zone]}${pile.player === 'opponent' ? ` · ${t('workbench.opponent')}` : ''}`,
                count: pileList(pile.player, pile.zone).length,
              })}
              list={pileList(pile.player, pile.zone)}
              env={env}
              onClose={() => setPile(null)}
            />
          )}
        </div>
        <DragOverlay dropAnimation={null}>
          {active && (
            <CardView
              image={cards.get(active.cardId)?.imageSmall}
              label={displayName(cards.get(active.cardId), cardLanguage)}
              size="board"
              className="cursor-grabbing drop-shadow-[0_14px_20px_rgb(0_0_0/0.5)]"
            />
          )}
        </DragOverlay>
      </DndContext>
    </MotionConfig>
  );
}

/** Vorschau, was das Ablegen hier bewirkt; sitzt über der Zone und fängt keine Zeigerereignisse */
function DropPreview({ label }: { label: string | null }) {
  if (!label) return null;
  return (
    <span className="pointer-events-none absolute left-1/2 top-[calc(100%+3px)] z-20 -translate-x-1/2 whitespace-nowrap rounded-sm bg-primary px-1.5 py-0.5 font-mono text-[10px] text-on-primary">
      {label}
    </span>
  );
}

function SideLabel({
  player,
  label,
  lp,
  children,
}: {
  player: Player;
  label: string;
  /** Lebenspunkte (UX-Plan 16) */
  lp: number;
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
      <span
        className={cn(
          'w-16 text-right font-mono text-[10.5px]',
          lp < START_LP ? 'text-ink' : 'text-text-subtle'
        )}
      >
        LP {lp}
      </span>
    </div>
  );
}

function Hand({
  player,
  list,
  env,
  preview,
}: {
  player: Player;
  list: PlacedCard[];
  env: CardEnv;
  preview: string | null;
}) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id: dropId(player, 'HAND') });
  return (
    <div
      ref={setNodeRef}
      aria-label={`${t('workbench.hand')}, ${player === 'self' ? t('workbench.self') : t('workbench.opponent')}`}
      className={cn(
        'relative flex min-h-12 min-w-40 items-center justify-center gap-1.5 rounded-md px-2 py-1',
        isOver && 'bg-ink/7 outline outline-1 outline-primary'
      )}
    >
      <DropPreview label={preview} />
      {list.map((c) => (
        <DraggableCard
          key={c.instanceId}
          placed={c}
          size={player === 'self' ? 'board' : 'xs'}
          isNew={env.changed.has(c.instanceId) ? player : undefined}
          env={env}
        />
      ))}
    </div>
  );
}

function ZoneCell({
  id,
  label,
  short,
  preview,
  card,
  env,
}: {
  id: string;
  label: string;
  /** Kurzform in der leeren Zone, der volle Name steht im aria-label */
  short: string;
  preview: string | null;
  card: PlacedCard | null;
  env: CardEnv;
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
      <DropPreview label={preview} />
      {!card && id.includes(':MONSTER') && env.onEmptyZone ? (
        <button
          type="button"
          onClick={(e) => env.onEmptyZone?.(id, e.currentTarget)}
          aria-label={`${label}: ${t('workbench.tokenHere')}`}
          title={t('workbench.tokenHere')}
          className="grid size-full place-items-center font-mono text-[9.5px] text-text-subtle hover:bg-ink/5"
        >
          {short}
        </button>
      ) : (
        !card && <span className="font-mono text-[9.5px] text-text-subtle">{short}</span>
      )}
      {card && (
        <DraggableCard
          placed={card}
          size="board"
          isNew={env.changed.has(card.instanceId) ? card.owner : undefined}
          env={env}
        />
      )}
    </div>
  );
}

function PileCell({
  id,
  label,
  list,
  env,
  preview,
  faceDown,
  onOpen,
}: {
  id: string;
  label: string;
  list: PlacedCard[];
  env: CardEnv;
  preview: string | null;
  faceDown: boolean;
  onOpen: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const top = list.at(-1);
  const card = top ? env.cards.get(top.cardId) : undefined;
  return (
    <button
      type="button"
      ref={setNodeRef}
      data-drop={id}
      onClick={onOpen}
      aria-label={`${label}: ${list.length}`}
      className={cn(
        'relative flex size-[84px] flex-col items-center justify-center gap-1 rounded-sm border border-line transition-colors duration-(--motion-fast) hover:border-line-strong',
        isOver && 'border-primary bg-ink/7'
      )}
      onMouseEnter={() => top && !faceDown && env.onInspect(top.instanceId)}
    >
      <DropPreview label={preview} />
      {top ? (
        <motion.div key={top.instanceId} layoutId={env.layoutIdOf(top.instanceId)}>
          <CardView
            image={faceDown ? null : card?.imageSmall}
            label={label}
            size="xs"
            faceDown={faceDown ? 'opponent' : undefined}
          />
        </motion.div>
      ) : (
        <span className="h-[46px]" />
      )}
      <span className="font-mono text-[9.5px] text-text-muted">
        {label} {list.length}
      </span>
    </button>
  );
}

/**
 * Stapel aufgefächert (UI-Plan 7.2.2): Friedhof, Verbannt, Deck und Extra Deck offen,
 * jede Karte lässt sich anklicken oder direkt aufs Feld ziehen. Esc schließt.
 */
function PileOverlay({
  title,
  list,
  env,
  onClose,
}: {
  title: string;
  list: PlacedCard[];
  env: CardEnv;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const cardLanguage = useCardLanguage();
  const sorted = [...list].sort((a, b) =>
    displayName(env.cards.get(a.cardId), cardLanguage).localeCompare(
      displayName(env.cards.get(b.cardId), cardLanguage)
    )
  );
  return (
    <motion.section
      aria-label={title}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      className="absolute bottom-4 right-4 top-4 z-30 flex w-72 flex-col rounded-lg border border-line bg-surface-2 shadow-[0_18px_40px_rgb(0_0_0/0.45)]"
    >
      <header className="flex items-center justify-between border-b border-line py-1.5 pl-3 pr-1.5">
        <h3 className="font-display text-lg">{title}</h3>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={t('workbench.close')}>
          <X />
        </Button>
      </header>
      <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2">
        {sorted.length === 0 && (
          <li className="p-2 text-xs text-text-subtle">{t('workbench.empty')}</li>
        )}
        {sorted.map((c) => (
          <li
            key={c.instanceId}
            className="flex items-center gap-2.5 rounded-sm p-1 hover:bg-ink/5"
          >
            <DraggableCard placed={c} size="sm" env={env} animate={false} />
            <span className="truncate text-sm">
              {displayName(env.cards.get(c.cardId), cardLanguage)}
            </span>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}

function DraggableCard({
  placed,
  size,
  isNew,
  env,
  animate = true,
}: {
  placed: PlacedCard;
  size: 'board' | 'sm' | 'xs';
  isNew?: Player;
  env: CardEnv;
  /** Karten in der Stapel-Ansicht fliegen nicht mit */
  animate?: boolean;
}) {
  const cardLanguage = useCardLanguage();
  const card = env.cards.get(placed.cardId);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: placed.instanceId,
    disabled: !env.draggable,
  });
  const hidden = placed.position === 'SET' && placed.controller === 'opponent';
  const picking = env.picking;
  const pickable = picking?.pickable.has(placed.instanceId);
  return (
    <motion.div
      layoutId={animate ? env.layoutIdOf(placed.instanceId) : undefined}
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      data-instance={placed.instanceId}
      onClick={(e) => env.onClick(placed.instanceId, e.currentTarget)}
      onMouseEnter={() => !hidden && env.onInspect(placed.instanceId)}
      onFocus={() => !hidden && env.onInspect(placed.instanceId)}
      className={cn(
        'rounded-sm outline-none focus-visible:outline-[1.5px] focus-visible:outline-offset-2 focus-visible:outline-primary',
        env.draggable && 'cursor-grab',
        isDragging && 'opacity-30'
      )}
    >
      <CardView
        image={card?.imageSmall}
        label={displayName(card, cardLanguage)}
        size={size}
        isNew={isNew}
        selected={
          picking ? picking.picked.has(placed.instanceId) : env.inspectedId === placed.instanceId
        }
        dimmed={Boolean(picking) && !pickable && placed.zone === 'MONSTER'}
        faceDown={placed.position === 'SET' ? placed.controller : undefined}
        defense={placed.position === 'DEF'}
        materials={env.materialCount(placed.instanceId)}
        linkMarkers={placed.zone === 'MONSTER' ? card?.linkMarkers : undefined}
      />
    </motion.div>
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
