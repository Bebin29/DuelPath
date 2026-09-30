'use client';

import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useTranslation } from '@/lib/i18n/hooks';
import { cn } from '@/lib/utils';
import {
  cardsIn,
  type GameState,
  type PlacedCard,
  type Player,
  type Zone,
} from '@/lib/combo/state';
import { displayName, type ComboCard } from '@/lib/combo/cards';

const ZONES: Zone[] = ['HAND', 'MONSTER', 'SPELL_TRAP', 'FIELD', 'GY', 'BANISHED', 'DECK', 'EXTRA'];

interface StatePanelProps {
  state: GameState;
  cards: Map<string, ComboCard>;
  warnings: string[];
  /** Karte wurde in eine Zone gezogen; ohne Handler ist das Panel nur Anzeige */
  onDrop?: (instanceId: string, to: Zone, player: Player) => void;
}

export function StatePanel({ state, cards, warnings, onDrop }: StatePanelProps) {
  const { t, i18n } = useTranslation();
  // Klicks bleiben Klicks; Ziehen startet erst nach ein paar Pixeln
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || !onDrop) return;
    const [player, zone] = String(over.id).split(':') as [Player, Zone];
    onDrop(String(active.id), zone, player);
  };

  const name = (cardId?: string) =>
    displayName(cardId ? cards.get(cardId) : undefined, i18n.language);
  const usedOpts = Object.entries(state.optUsage).filter(([, count]) => count > 0);

  return (
    // Feste id: sonst unterscheiden sich die generierten aria-IDs zwischen Server und Browser
    <DndContext id="combo-state-panel" sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="space-y-4 text-sm">
        {(['opponent', 'self'] as const).map((player) => (
          <section key={player} className="space-y-1">
            <h3 className="font-semibold">{t(`combo.players.${player}`)}</h3>
            <div className="grid grid-cols-2 gap-1">
              {ZONES.map((zone) => (
                <ZoneBox
                  key={zone}
                  id={`${player}:${zone}`}
                  label={t(`combo.zones.${zone}`)}
                  wide={zone === 'HAND' || zone === 'MONSTER'}
                >
                  {cardsIn(state, player, zone).map((card) => (
                    <CardChip
                      key={card.instanceId}
                      card={card}
                      name={name(card.cardId)}
                      image={cards.get(card.cardId)?.imageSmall ?? null}
                      draggable={!!onDrop}
                    />
                  ))}
                </ZoneBox>
              ))}
            </div>
          </section>
        ))}

        {state.chain.length > 0 && (
          <section>
            <h3 className="font-semibold">{t('combo.state.chain')}</h3>
            <ol className="list-inside list-decimal">
              {state.chain.map((link) => (
                <li key={link.nodeId} className={cn(link.negated && 'line-through')}>
                  {name(link.cardId)} ({t(`combo.players.${link.player}`)})
                </li>
              ))}
            </ol>
          </section>
        )}

        {(usedOpts.length > 0 || state.normalSummonUsed) && (
          <section>
            <h3 className="font-semibold">{t('combo.state.opt')}</h3>
            <ul className="text-muted-foreground">
              {state.normalSummonUsed && <li>{t('combo.state.normalSummon')}</li>}
              {usedOpts.map(([key, count]) => (
                <li key={key}>
                  {key.split(':').slice(2).join(':')} ×{count}
                </li>
              ))}
            </ul>
          </section>
        )}

        {warnings.length > 0 && (
          <section className="rounded-md border border-destructive/50 bg-destructive/10 p-2">
            <h3 className="font-semibold text-destructive">{t('combo.state.warnings')}</h3>
            <ul className="list-inside list-disc">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </DndContext>
  );
}

function ZoneBox({
  id,
  label,
  wide,
  children,
}: {
  id: string;
  label: string;
  wide: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-14 rounded-md border p-1',
        wide && 'col-span-2',
        isOver && 'border-primary bg-primary/10'
      )}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function CardChip({
  card,
  name,
  image,
  draggable,
}: {
  card: PlacedCard;
  name: string;
  image: string | null;
  draggable: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: card.instanceId,
    disabled: !draggable,
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      title={name}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
      className={cn(
        'flex w-16 flex-col items-center rounded border bg-card p-0.5 text-[10px] leading-tight',
        draggable && 'cursor-grab',
        card.position === 'SET' && 'opacity-60'
      )}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- kleine Vorschau aus dem lokalen Bild-Cache
        <img src={image} alt="" className="h-12 w-9 object-cover" />
      ) : (
        <div className="h-12 w-9 bg-muted" />
      )}
      <span className="w-full truncate text-center">{name}</span>
    </div>
  );
}
