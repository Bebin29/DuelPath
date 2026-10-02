'use client';

import { useTranslation } from '@/lib/i18n/hooks';
import { useCardLanguage } from '@/components/providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { CardView } from '@/components/cards/CardView';
import { displayName, type ComboCard } from '@/lib/combo/cards';
import { boardOf, type SideBoard } from '@/lib/combo/board';
import type { GameState, PlacedCard, Player } from '@/lib/combo/state';

interface CardEnv {
  cards: Map<string, ComboCard>;
  changed: Set<string>;
  onCard: (cardId: string) => void;
}

/**
 * Board zum Lesen (UI-Sweep-Plan 4.2): dieselbe Anordnung wie in der Workbench, aber fließend
 * in fünf Spalten und ohne Ziehen. Tippen öffnet die Kartenansicht; geänderte Karten leuchten auf.
 */
export function ReadBoard({
  state,
  ...env
}: CardEnv & {
  state: GameState;
}) {
  const { t } = useTranslation();
  const me = boardOf(state, 'self');
  const opp = boardOf(state, 'opponent');

  const slot = (c: PlacedCard | null, player: Player, key: string) => (
    <li key={key} className="aspect-[59/86] rounded-sm border border-line/70">
      {c && <ReadCard c={c} player={player} {...env} />}
    </li>
  );
  // Der Gegner sitzt gegenüber: seine Zone 0 liegt aus unserer Sicht rechts
  const mirror = <T,>(row: T[]) => [...row].reverse();

  // Nur belegte Reihen; die Position innerhalb der Reihe bleibt wie am Tisch
  const row = (list: (PlacedCard | null)[], player: Player, key: string) =>
    list.some(Boolean) && (
      <ul key={key} className="grid grid-cols-5 gap-1.5">
        {list.map((c, i) => slot(c, player, `${key}${i}`))}
      </ul>
    );
  const empty = (
    <p className="py-1 text-center text-xs text-text-subtle">{t('reader.emptyField')}</p>
  );
  const emz = [
    me.extraMonsters[0] ?? opp.extraMonsters[1],
    me.extraMonsters[1] ?? opp.extraMonsters[0],
  ];
  const oppRows = [
    row(mirror(opp.spellTraps), 'opponent', 'ost'),
    row(mirror(opp.monsters), 'opponent', 'om'),
  ].filter(Boolean);
  const myRows = [row(me.monsters, 'self', 'm'), row(me.spellTraps, 'self', 'st')].filter(Boolean);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
      <Side player="opponent" side={opp} lp={state.lp.opponent} {...env}>
        {oppRows.length ? oppRows : empty}
      </Side>

      {/* Extra-Monsterzonen zwischen den Seiten, wie am Tisch */}
      {emz.some(Boolean) && (
        <ul aria-label={t('workbench.emz')} className="grid grid-cols-5 gap-1.5">
          <li />
          {slot(emz[0], 'self', 'emz1')}
          <li />
          {slot(emz[1], 'self', 'emz2')}
          <li />
        </ul>
      )}

      <Side player="self" side={me} lp={state.lp.self} {...env}>
        {myRows.length ? myRows : empty}
      </Side>
    </div>
  );
}

function ReadCard({
  c,
  player,
  cards,
  changed,
  onCard,
}: CardEnv & {
  c: PlacedCard;
  player: Player;
}) {
  const { t } = useTranslation();
  const cardLanguage = useCardLanguage();
  const card = cards.get(c.cardId);
  const name = displayName(card, cardLanguage);
  return (
    <button
      type="button"
      onClick={() => onCard(c.cardId)}
      aria-label={c.position === 'DEF' ? `${name} (${t('reader.def')})` : name}
      className="relative block w-full rounded-sm"
    >
      <CardView
        image={card?.imageSmall}
        label={name}
        size="sm"
        fluid
        faceDown={c.position === 'SET' ? 'self' : undefined}
        isNew={changed.has(c.instanceId) ? player : undefined}
      />
      {c.position === 'DEF' && (
        <span className="absolute inset-x-0 bottom-0.5 text-center font-mono text-2xs text-ink [text-shadow:0_1px_2px_rgb(0_0_0/0.9)]">
          {t('reader.def')}
        </span>
      )}
    </button>
  );
}

/** Eine Seite: Name und LP, Hand, Zonen, dazu Feldzauber, Friedhof und Verbannte */
function Side({
  player,
  side,
  lp,
  children,
  ...env
}: CardEnv & {
  player: Player;
  side: SideBoard;
  lp: number;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const opponent = player === 'opponent';
  const strip = (title: string, list: PlacedCard[]) =>
    list.length > 0 && (
      <div className="flex min-w-0 items-center gap-2">
        <span className="w-20 shrink-0 font-mono text-2xs text-text-subtle">
          {title} {list.length}
        </span>
        <ul className="flex min-w-0 gap-1 overflow-x-auto">
          {list.map((c) => (
            <li key={c.instanceId} className="w-8 shrink-0">
              <ReadCard c={c} player={player} {...env} />
            </li>
          ))}
        </ul>
      </div>
    );
  const hand = (
    <ul aria-label={t('workbench.hand')} className="flex min-h-14 flex-wrap justify-center gap-1">
      {side.hand.map((c) => (
        <li key={c.instanceId} className="w-10">
          <ReadCard c={c} player={player} {...env} />
        </li>
      ))}
    </ul>
  );
  const piles = (
    <div className="flex flex-col gap-1.5">
      {side.field && strip(t('workbench.fieldZone'), [side.field])}
      {strip(t('workbench.gy'), side.gy)}
      {strip(t('workbench.banished'), side.banished)}
      <p className="font-mono text-2xs text-text-subtle">
        {t('workbench.deck')} {side.deck.length} · {t('workbench.extra')} {side.extra.length}
      </p>
    </div>
  );
  return (
    <section
      aria-label={t(opponent ? 'workbench.opponent' : 'workbench.self')}
      className="flex flex-col gap-2"
    >
      <p className="flex items-center gap-2 font-mono text-2xs">
        <span
          aria-hidden
          className={cn('h-3 w-[3px] rounded-[1px]', opponent ? 'bg-opponent' : 'bg-self')}
        />
        <span className="flex-1 text-text-muted">
          {t(opponent ? 'workbench.opponent' : 'workbench.self')}
        </span>
        <span className="text-text-subtle">LP {lp}</span>
      </p>
      {opponent ? (
        <>
          {piles}
          {hand}
          {children}
        </>
      ) : (
        <>
          {children}
          {hand}
          {piles}
        </>
      )}
    </section>
  );
}
