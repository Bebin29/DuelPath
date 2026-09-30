'use client';

import { Lock, LockOpen } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { useCardLanguage } from '@/components/providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { CardView } from '@/components/cards/CardView';
import { displayName, type ComboCard } from '@/lib/combo/cards';
import { isOptAvailable, type GameState, type PlacedCard } from '@/lib/combo/state';
import { usedOptNames } from '@/lib/combo/opt-names';

/** Satzteil, auf den ein Staple reagiert, im Effekttext markiert (UI-Plan 7.2.5) */
function Marked({ text, phrase }: { text: string; phrase?: string }) {
  const at = phrase ? text.indexOf(phrase) : -1;
  if (!phrase || at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded-[2px] bg-opponent-tint px-0.5 text-ink underline decoration-opponent decoration-1 underline-offset-2">
        {phrase}
      </mark>
      {text.slice(at + phrase.length)}
    </>
  );
}

/**
 * Inspector (UI-Plan 7.2.5): Karte unter dem Mauszeiger in groß mit Effekten und HOPT-Status.
 * Ohne Karte zeigt er den gewählten Schritt (children).
 */
export function Inspector({
  state,
  cards,
  inspected,
  highlight,
  onOpenCard,
  children,
}: {
  state: GameState;
  cards: Map<string, ComboCard>;
  inspected: PlacedCard | null;
  highlight?: { cardId: string; effectIndex: number; text: string } | null;
  /** Kartenansicht mit „Effekte bearbeiten“ öffnen (UI-Plan 7.4.4) */
  onOpenCard?: (cardId: string) => void;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const cardLanguage = useCardLanguage();
  const card = inspected ? cards.get(inspected.cardId) : undefined;
  const used = usedOptNames(state, cards, cardLanguage);

  return (
    <aside
      aria-label={t('workbench.inspector')}
      className="flex h-full min-h-0 flex-col overflow-y-auto"
    >
      {inspected && card ? (
        <div className="flex flex-col gap-4 p-4">
          <CardView
            image={card.imageSmall}
            label={displayName(card, cardLanguage)}
            size="xl"
            className="self-center"
          />
          <div>
            <h2 className="font-display text-[22px] leading-tight">
              <button
                type="button"
                onClick={() => onOpenCard?.(card.id)}
                className="text-left decoration-line-strong decoration-1 underline-offset-4 hover:underline"
              >
                {displayName(card, cardLanguage)}
              </button>
            </h2>
            <p className="mt-1 font-mono text-[10.5px] text-text-muted">
              {[card.type, card.race].filter(Boolean).join(' · ')}
            </p>
          </div>
          <section aria-label={t('workbench.effects')} className="flex flex-col gap-2">
            {card.effects.map((effect, i) => {
              const free = effect.activated
                ? isOptAvailable(
                    state,
                    {
                      instanceId: inspected.instanceId,
                      effectIndex: i,
                      player: inspected.controller,
                    },
                    card
                  )
                : null;
              return (
                <div
                  key={effect.index}
                  className={cn(
                    'flex gap-2.5 rounded-md border border-line p-2.5',
                    free === false && 'opacity-70'
                  )}
                >
                  <span className="font-mono text-xs text-text-subtle">{i + 1}</span>
                  <div className="flex flex-1 flex-col gap-1.5">
                    <p lang="en" className="text-[12.5px] leading-[1.45]">
                      <Marked
                        text={effect.text}
                        phrase={
                          highlight?.cardId === card.id && highlight.effectIndex === i
                            ? highlight.text
                            : undefined
                        }
                      />
                    </p>
                    {effect.opt && (
                      <span
                        className={cn(
                          'flex items-center gap-1 font-mono text-[10.5px]',
                          free ? 'text-jev' : 'text-text-subtle'
                        )}
                      >
                        {free ? <LockOpen className="size-3" /> : <Lock className="size-3" />}
                        {effect.opt.kind === 'HARD' ? 'HOPT' : 'SOPT'} ·{' '}
                        {free ? t('workbench.hoptFree') : t('workbench.hoptUsed')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        </div>
      ) : (
        <div className="flex flex-col gap-5 p-4">{children}</div>
      )}

      <section className="mt-auto border-t border-line p-4">
        <h3 className="mb-2 font-display text-base">{t('workbench.hoptTracker')}</h3>
        {used.length === 0 ? (
          <p className="text-xs text-text-subtle">{t('workbench.hoptNone')}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {used.map((name) => (
              <li key={name} className="flex items-center gap-2 text-xs">
                <Lock className="size-3 text-text-subtle" />
                <span className="flex-1 truncate">{name}</span>
                <span className="font-mono text-[10.5px] text-text-subtle">
                  {t('workbench.hoptUsed')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
