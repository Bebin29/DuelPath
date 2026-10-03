'use client';

import { useId, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import {
  GAME_RESULTS,
  NOTE_MAX,
  belongsTo,
  tally,
  type DeckGame,
  type GameInput,
  type GameResult,
} from '@/lib/deck/games';
import type { Going } from '@/lib/deck/roles';
import type { SidePlan } from '@/lib/deck/side-plan';

/**
 * Spielprotokoll zum offenen Side-Plan (Deckbau-Plan 3.7): eintragen, was herauskam, damit der
 * Plan nicht eine Vermutung bleibt. Nur rohe Zahlen, nie eine Quote; ohne Einträge steht hier
 * keine Bilanz. Matchup und Zugfolge sind aus dem Plan vorbelegt, ein Eintrag ist ein Klick.
 */
export function GameLog({
  plan,
  games,
  planIds,
  matchups,
  onAdd,
  onDelete,
}: {
  plan: SidePlan;
  games: DeckGame[];
  /** Pläne, die es noch gibt; Einträge verwaister Pläne zählen über das Matchup weiter */
  planIds: Set<string>;
  /** am Deck schon benutzte Matchups, damit Schreibweisen zusammenlaufen */
  matchups: string[];
  onAdd: (input: GameInput) => Promise<boolean>;
  onDelete: (id: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const listId = useId();
  const [matchup, setMatchup] = useState(plan.matchup);
  const [going, setGoing] = useState<Going>(plan.going);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const mine = games.filter((g) => belongsTo(g, plan, planIds));
  const record = tally(games, plan, planIds);
  const goingLabel = t(plan.going === 'first' ? 'decks.first' : 'decks.second');
  const when = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(iso)
    );

  const enter = async (result: GameResult) => {
    setBusy(true);
    const ok = await onAdd({
      sidePlanId: plan.id,
      matchup: matchup.trim(),
      going,
      result,
      note: note.trim() || null,
    });
    setBusy(false);
    setFailed(!ok);
    if (ok) setNote('');
  };

  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-b border-line pb-1.5">
        <span className="font-display text-2xl">{t('decks.side.games.title')}</span>
        {record.total > 0 && (
          <span className="text-sm text-text-muted">
            <span className="font-mono tabular-nums">
              {t('decks.side.games.record', {
                win: record.win,
                loss: record.loss,
                going: goingLabel,
              })}
            </span>
            {record.draw > 0 && (
              <span className="ml-1.5 text-text-subtle">
                {t('decks.side.games.draws', { count: record.draw })}
              </span>
            )}
          </span>
        )}
      </h2>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <input
          value={matchup}
          onChange={(e) => setMatchup(e.target.value)}
          list={listId}
          maxLength={60}
          placeholder={t('decks.side.matchupPlaceholder')}
          aria-label={t('decks.side.matchup')}
          className="h-8 w-40 rounded-md border border-line bg-transparent px-2.5 text-sm outline-none focus-visible:border-line-strong"
        />
        <datalist id={listId}>
          {matchups.map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
        <Segmented<Going>
          label={t('decks.going')}
          value={going}
          onChange={setGoing}
          options={[
            { value: 'first', label: t('decks.first') },
            { value: 'second', label: t('decks.second') },
          ]}
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={NOTE_MAX}
          placeholder={t('decks.side.games.notePlaceholder')}
          aria-label={t('decks.side.games.note')}
          className="h-8 min-w-40 flex-1 rounded-md border border-line bg-transparent px-2.5 text-sm outline-none focus-visible:border-line-strong"
        />
        <span className="flex items-center gap-2">
          {GAME_RESULTS.map((r) => (
            <Button
              key={r}
              variant="line"
              size="sm"
              disabled={busy}
              aria-label={t(`decks.side.games.enter${r[0].toUpperCase()}${r.slice(1)}`)}
              onClick={() => void enter(r)}
            >
              {t(`decks.side.games.${r}`)}
            </Button>
          ))}
        </span>
      </div>
      {failed && <p className="text-sm text-warning">{t('decks.side.games.error')}</p>}

      {mine.length > 0 && (
        <ul className="flex flex-col">
          {mine.map((g) => (
            <li
              key={g.id}
              className="flex min-h-9 flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-line py-1 text-sm"
            >
              <span className="font-mono text-xs text-text-subtle tabular-nums">
                {when(g.playedAt)}
              </span>
              <span>{t(`decks.side.games.${g.result}`)}</span>
              {g.note && <span className="min-w-0 flex-1 truncate text-text-muted">{g.note}</span>}
              <Button
                className="ml-auto"
                variant="ghost"
                size="icon-sm"
                aria-label={t('decks.side.games.delete')}
                onClick={() => onDelete(g.id)}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
