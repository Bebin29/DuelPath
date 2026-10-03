'use client';

import { useId, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import {
  GAME_RESULTS,
  NOTE_MAX,
  gamesForPlans,
  tally,
  type DeckGame,
  type GameInput,
  type GameResult,
} from '@/lib/deck/games';
import type { Going } from '@/lib/deck/roles';
import type { SidePlan } from '@/lib/deck/side-plan';

/** Game history stays visible independently of which side plan is selected or still exists. */
export function GameLog({
  plan,
  plans,
  games,
  matchups,
  onAdd,
  onDelete,
}: {
  plan: SidePlan | null;
  plans: SidePlan[];
  games: DeckGame[];
  matchups: string[];
  onAdd: (input: GameInput) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const { t, i18n } = useTranslation();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [matchup, setMatchup] = useState(plan?.matchup ?? '');
  const [going, setGoing] = useState<Going>(plan?.going ?? 'second');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const planIds = new Set(plans.map((p) => p.id));
  const visible = gamesForPlans(games, plans);
  const record = plan ? tally(games, plan, planIds) : null;
  const linked =
    plan &&
    plan.going === going &&
    plan.matchup.trim().toLowerCase() === matchup.trim().toLowerCase()
      ? plan
      : null;
  const goingLabel = (g: Going) => t(g === 'first' ? 'decks.first' : 'decks.second');
  const when = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' }).format(
      new Date(iso)
    );

  const mutate = async (action: () => Promise<boolean>) => {
    setBusy(true);
    setFailed(false);
    try {
      const ok = await action();
      setFailed(!ok);
      return ok;
    } catch {
      setFailed(true);
      return false;
    } finally {
      setBusy(false);
    }
  };
  const enter = async (result: GameResult) => {
    if (
      await mutate(() =>
        onAdd({
          sidePlanId: linked?.id ?? null,
          matchup: matchup.trim(),
          going,
          result,
          note: note.trim() || null,
        })
      )
    )
      setNote('');
  };

  return (
    <section className="flex flex-col gap-3" aria-label={t('decks.side.games.title')}>
      <div className="flex flex-wrap items-center gap-3">
        {games.length > 0 && (
          <h2 className="font-display text-2xl">{t('decks.side.games.title')}</h2>
        )}
        {plan && record && record.total > 0 && (
          <p className="text-sm text-text-muted">
            <span className="font-mono tabular-nums">
              {t('decks.side.games.record', {
                win: record.win,
                loss: record.loss,
                going: goingLabel(plan.going),
              })}
            </span>
            {record.draw > 0 && (
              <span className="ml-1.5">{t('decks.side.games.draws', { count: record.draw })}</span>
            )}
          </p>
        )}
        <Button variant="line" size="sm" aria-expanded={open} onClick={() => setOpen(!open)}>
          <Plus />
          {t('decks.side.games.add')}
        </Button>
      </div>
      {open && (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-text-subtle">
            {linked
              ? t('decks.side.games.withPlan', {
                  matchup: linked.matchup || t('decks.side.untitled'),
                })
              : t('decks.side.games.noPlan')}
          </p>
          <fieldset disabled={busy} className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <input
              value={matchup}
              onChange={(e) => setMatchup(e.target.value)}
              list={listId}
              maxLength={60}
              placeholder={t('decks.side.matchupPlaceholder')}
              aria-label={t('decks.side.games.matchup')}
              className="h-8 w-40 rounded-md border border-line bg-transparent px-2.5 text-sm outline-none focus-visible:border-line-strong"
            />
            <datalist id={listId}>
              {matchups.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            <Segmented<Going>
              label={t('decks.side.games.going')}
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
          </fieldset>
        </div>
      )}
      {failed && (
        <p role="alert" className="text-sm text-warning">
          {t('decks.side.games.error')}
        </p>
      )}
      {visible.length > 0 && (
        <ul className="flex flex-col">
          {visible.map((g) => (
            <li
              key={g.id}
              className="flex min-h-9 flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-line py-1 text-sm"
            >
              <span className="font-mono text-xs text-text-subtle tabular-nums">
                {when(g.playedAt)}
              </span>
              <span>
                {g.matchup || t('decks.side.untitled')} · {goingLabel(g.going)} ·{' '}
                {t(`decks.side.games.${g.result}`)}
              </span>
              <span className="text-xs text-text-subtle">
                {g.sidePlanId
                  ? t('decks.side.games.withPlan', {
                      matchup:
                        plans.find((p) => p.id === g.sidePlanId)?.matchup ||
                        t('decks.side.untitled'),
                    })
                  : t('decks.side.games.noPlan')}
              </span>
              {g.note && (
                <span className="min-w-0 flex-1 break-words text-text-muted">{g.note}</span>
              )}
              <Button
                className="ml-auto"
                variant="ghost"
                size="icon-sm"
                disabled={busy}
                aria-label={t('decks.side.games.delete')}
                onClick={() => void mutate(() => onDelete(g.id))}
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
