'use client';

import { useTranslation } from '@/lib/i18n/hooks';
import { useCardLanguage } from '@/components/providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { CardView } from '@/components/cards/CardView';
import type { CardEffect, ParsedEffects } from '@/lib/cards/effects';

/** Was die Vorschau braucht; passt auf den Prisma-Datensatz einer Karte */
export interface PreviewCard {
  id: string;
  name: string;
  nameDe?: string | null;
  type: string;
  race?: string | null;
  attribute?: string | null;
  level?: number | null;
  atk?: number | null;
  def?: number | null;
  banTcg?: string | null;
  imageSmall?: string | null;
  /** ParsedEffects aus der Datenbank oder bereits die Effektliste */
  effects?: unknown;
}

function effectsOf(card: PreviewCard): CardEffect[] {
  const raw = card.effects as ParsedEffects | CardEffect[] | null | undefined;
  if (Array.isArray(raw)) return raw;
  return raw?.effects ?? [];
}

const BAN_STYLE: Record<string, string> = {
  Forbidden: 'bg-opponent-tint text-opponent',
  Limited: 'bg-warning-tint text-warning',
  'Semi-Limited': 'bg-warning-tint text-warning',
};

/**
 * Kartenvorschau beim Überfahren (UX-Plan 8, UI-Plan 7.5.5): großes Bild, Werte, TCG-Banlist-Status
 * und die Effekte einzeln mit OPT-Markierung. Kein Klick nötig; der Klick bleibt frei für die Detailansicht.
 */
export function CardPreview({ card, children }: { card: PreviewCard; children: React.ReactNode }) {
  const { t } = useTranslation();
  const cardLanguage = useCardLanguage();
  const name = cardLanguage === 'de' && card.nameDe ? card.nameDe : card.name;
  const stats = [
    card.attribute,
    card.race,
    card.level
      ? `${card.type.includes('Link') ? 'Link' : card.type.includes('XYZ') ? 'Rank' : 'Lv.'} ${card.level}`
      : null,
    card.atk !== null && card.atk !== undefined ? `${card.atk} / ${card.def ?? '-'}` : null,
  ].filter(Boolean);
  const effects = effectsOf(card);

  return (
    <HoverCard openDelay={400} closeDelay={80}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent side="right" align="start" className="flex w-[520px] gap-4 p-4">
        <CardView image={card.imageSmall} label={name} size="lg" className="self-start" />
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <div>
            <h3 className="font-display text-xl leading-tight">{name}</h3>
            <p className="mt-1 font-mono text-[10.5px] text-text-muted">
              {[card.type, ...stats].join(' · ')}
            </p>
          </div>
          <span
            className={cn(
              'self-start rounded-sm px-1.5 py-0.5 font-mono text-[10.5px]',
              card.banTcg ? BAN_STYLE[card.banTcg] : 'bg-surface-3 text-text-muted'
            )}
          >
            {t(`preview.ban.${card.banTcg ?? 'Unlimited'}`)}
          </span>
          <ol
            aria-label={t('preview.effects')}
            className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1"
          >
            {effects.map((effect, i) => (
              <li key={effect.index} className="flex gap-2 text-[12.5px] leading-[1.45]">
                <span className="font-mono text-xs text-text-subtle">{i + 1}</span>
                <span className="flex-1">
                  <span lang="en">{effect.text}</span>
                  {effect.opt && (
                    <span className="ml-1.5 whitespace-nowrap font-mono text-[10px] text-text-subtle">
                      {effect.opt.kind === 'HARD' ? 'HOPT' : 'SOPT'}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
