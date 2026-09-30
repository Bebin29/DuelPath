'use client';

import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslation } from '@/lib/i18n/hooks';
import { useCardLanguage } from '@/components/providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CardView } from '@/components/cards/CardView';
import { displayName, type ComboCard } from '@/lib/combo/cards';
import type { NodeKind, PlacedCard } from '@/lib/combo/state';
import { OFFER_MS } from './use-play';

const KINDS: NodeKind[] = ['ACTION', 'ACTIVATE', 'OPPONENT', 'RESOLVE', 'END'];

export interface StepPrompt {
  question: string;
  candidates: PlacedCard[];
  picked: string[];
  /** Mehrfachauswahl braucht „Bestätigen“ bzw. Enter */
  multi: boolean;
  /** „Alle Karten“, wenn die Heuristik danebenliegt */
  all?: boolean;
}

export interface TriggerOffer {
  instanceId: string;
  effectIndex: number;
  cardId: string;
}

interface StepBarProps {
  position: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  cards: Map<string, ComboCard>;
  onInspect: (instanceId: string | null) => void;

  prompt: StepPrompt | null;
  onPick: (instanceId: string) => void;
  onConfirm: () => void;
  onAll?: () => void;
  onLater: () => void;

  chainLength: number;
  chainMode: boolean;
  onResolve: () => void;
  onChain: () => void;
  onOpponent: () => void;

  triggers: TriggerOffer[];
  onTrigger: (offer: TriggerOffer) => void;

  offer: boolean;
  onInsert: () => void;
  onReplace: () => void;
  onDismissOffer: () => void;

  onAdd: (kind: NodeKind) => void;
}

/**
 * Schrittleiste (UI-Plan 7.2.4): links die Navigation, in der Mitte der Zustand
 * (Frage, offene Chain, Trigger oder Hinweis), rechts das Angebot nach einem Branch.
 */
export function StepBar(props: StepBarProps) {
  const { t } = useTranslation();
  const { position, total, onPrev, onNext, prompt, chainLength } = props;
  return (
    <div className="flex h-14 shrink-0 items-center gap-4 border-t border-line bg-surface-1 px-4">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onPrev}
          disabled={position <= 0}
          aria-label={t('workbench.prev')}
        >
          <ChevronLeft />
        </Button>
        <span className="min-w-12 text-center font-mono text-xs text-text-muted" aria-live="polite">
          {t('workbench.stepCounter', { n: position, total })}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onNext}
          disabled={position >= total}
          aria-label={t('workbench.next')}
        >
          <ChevronRight />
        </Button>
      </div>
      <span className="h-5 w-px shrink-0 bg-line" />
      <div className="flex min-w-0 flex-1 items-center gap-3" aria-live="polite">
        {prompt ? (
          <PromptRow {...props} prompt={prompt} />
        ) : chainLength > 0 ? (
          <ChainRow {...props} />
        ) : (
          <IdleRow {...props} />
        )}
      </div>
      {props.offer ? (
        <OfferNotice {...props} />
      ) : (
        !prompt && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="line">
                <Plus />
                {t('workbench.addStep')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top">
              {KINDS.map((kind) => (
                <DropdownMenuItem key={kind} onSelect={() => props.onAdd(kind)}>
                  {t(`combo.kind.${kind}`)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      )}
    </div>
  );
}

function PromptRow({
  prompt,
  cards,
  onInspect,
  onPick,
  onConfirm,
  onAll,
  onLater,
}: StepBarProps & { prompt: StepPrompt }) {
  const { t } = useTranslation();
  return (
    <>
      <span className="shrink-0 font-display text-base">{prompt.question}</span>
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto py-1">
        {prompt.candidates.length === 0 && (
          <span className="text-xs text-text-subtle">{t('workbench.prompt.none')}</span>
        )}
        {prompt.candidates.map((c, i) => (
          <CandidateChip
            key={c.instanceId}
            placed={c}
            card={cards.get(c.cardId)}
            index={i}
            picked={prompt.picked.includes(c.instanceId)}
            onPick={() => onPick(c.instanceId)}
            onInspect={onInspect}
          />
        ))}
      </div>
      {onAll && (
        <Button
          variant="text"
          size="sm"
          onClick={onAll}
          aria-pressed={prompt.all}
          className={cn(prompt.all && 'text-primary')}
        >
          {t('workbench.prompt.allCards')}
        </Button>
      )}
      {prompt.multi && (
        <Button size="sm" onClick={onConfirm} disabled={prompt.picked.length === 0}>
          {t('workbench.prompt.confirm')} <Kbd>⏎</Kbd>
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={onLater}>
        {t('workbench.prompt.later')} <Kbd>Esc</Kbd>
      </Button>
    </>
  );
}

/** Karte als Antwort auf eine Frage; die ersten neun tragen ihre Zifferntaste */
function CandidateChip({
  placed,
  card,
  index,
  picked,
  onPick,
  onInspect,
}: {
  placed: PlacedCard;
  card: ComboCard | undefined;
  index: number;
  picked: boolean;
  onPick: () => void;
  onInspect: (id: string | null) => void;
}) {
  const cardLanguage = useCardLanguage();
  const name = displayName(card, cardLanguage);
  return (
    <button
      type="button"
      onClick={onPick}
      onMouseEnter={() => onInspect(placed.instanceId)}
      onMouseLeave={() => onInspect(null)}
      aria-pressed={picked}
      className={cn(
        'flex max-w-52 shrink-0 items-center gap-1.5 rounded-sm border py-0.5 pl-0.5 pr-2 text-left text-xs transition-colors duration-(--motion-fast)',
        picked ? 'border-primary bg-ink/7' : 'border-line hover:border-line-strong'
      )}
    >
      <CardView image={card?.imageSmall} label={name} size="art" />
      <span className="truncate">{name}</span>
      {index < 9 && <Kbd>{index + 1}</Kbd>}
    </button>
  );
}

function ChainRow({
  chainLength,
  chainMode,
  onResolve,
  onChain,
  onOpponent,
  triggers,
  cards,
  onTrigger,
}: StepBarProps) {
  const { t } = useTranslation();
  return (
    <>
      <span className="shrink-0 font-mono text-xs text-chain">
        {t('workbench.chainOpen', { count: chainLength })}
      </span>
      <Button onClick={onResolve}>
        {t('workbench.resolve')} <Kbd>⏎</Kbd>
      </Button>
      <Button
        variant="line"
        onClick={onChain}
        aria-pressed={chainMode}
        className={cn(chainMode && 'border-chain text-chain')}
      >
        {chainMode ? t('workbench.chainArmed') : t('workbench.chainOn')} <Kbd>C</Kbd>
      </Button>
      <Button variant="line" onClick={onOpponent}>
        {t('workbench.opponentReacts')} <Kbd>O</Kbd>
      </Button>
      <Triggers triggers={triggers} cards={cards} onTrigger={onTrigger} />
    </>
  );
}

function IdleRow({ position, triggers, cards, onTrigger }: StepBarProps) {
  const { t } = useTranslation();
  if (triggers.length > 0)
    return <Triggers triggers={triggers} cards={cards} onTrigger={onTrigger} />;
  return (
    <span className="truncate text-text-muted">
      {position === 0 ? t('workbench.startHint') : t('workbench.nextHint')}
    </span>
  );
}

function Triggers({
  triggers,
  cards,
  onTrigger,
}: Pick<StepBarProps, 'triggers' | 'cards' | 'onTrigger'>) {
  const { t } = useTranslation();
  const cardLanguage = useCardLanguage();
  if (triggers.length === 0) return null;
  return (
    <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto">
      <span className="shrink-0 font-mono text-2xs text-text-subtle">{t('workbench.trigger')}</span>
      {triggers.map((offer) => {
        const card = cards.get(offer.cardId);
        const name = displayName(card, cardLanguage);
        return (
          <Button
            key={`${offer.instanceId}:${offer.effectIndex}`}
            variant="line"
            size="sm"
            onClick={() => onTrigger(offer)}
            className="max-w-60 shrink-0"
          >
            <CardView image={card?.imageSmall} label={name} size="art" />
            <span className="truncate">
              {name} · {t('workbench.actions.effect', { n: offer.effectIndex + 1 })}
            </span>
          </Button>
        );
      })}
    </div>
  );
}

function OfferNotice({ onInsert, onReplace, onDismissOffer }: StepBarProps) {
  const { t } = useTranslation();
  return (
    <div className="relative flex shrink-0 items-center gap-1 overflow-hidden rounded-md border border-line py-1 pl-3 pr-1">
      <span className="mr-1 text-xs text-text-muted">{t('workbench.offer.branch')}</span>
      <Button variant="text" size="sm" onClick={onInsert}>
        {t('workbench.offer.insert')}
      </Button>
      <Button variant="text" size="sm" onClick={onReplace}>
        {t('workbench.offer.replace')}
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onDismissOffer}
        aria-label={t('workbench.close')}
      >
        <X />
      </Button>
      <motion.span
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px origin-left bg-line-strong"
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: OFFER_MS / 1000, ease: 'linear' }}
      />
    </div>
  );
}
