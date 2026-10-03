'use client';

import { useTranslation } from '@/lib/i18n/hooks';
import { cn } from '@/lib/utils';

/** Stammdaten, die in der Kopfzeile einer Karte stehen */
export interface CardFactsInput {
  type: string;
  race: string | null;
  attribute: string | null;
  level: number | null;
  scale: number | null;
  linkMarkers: string[];
  atk: number | null;
  def: number | null;
}

/** Eine Zeile mit Typ, Attribut, Level/Rang/Link, Scale, Pfeilen und ATK/DEF */
export function CardFacts({ card, className }: { card: CardFactsInput; className?: string }) {
  const { t } = useTranslation();
  const stats = [
    card.attribute,
    card.race,
    card.level
      ? `${/Link/.test(card.type) ? 'Link' : /XYZ/.test(card.type) ? 'Rank' : 'Lv.'} ${card.level}`
      : null,
    card.scale != null ? `Scale ${card.scale}` : null,
    card.linkMarkers.length
      ? `${t('cardSheet.arrows')} ${card.linkMarkers.map((m) => t(`cardSheet.arrow.${m}`)).join(', ')}`
      : null,
    card.atk != null ? `${card.atk} / ${/Link/.test(card.type) ? '-' : (card.def ?? '-')}` : null,
  ].filter(Boolean);

  return (
    <p className={cn('font-mono text-2xs text-text-muted', className)}>
      {[card.type, ...stats].join(' · ')}
    </p>
  );
}

/** Banlist-Status im TCG; ohne Eintrag unbeschränkt */
export function BanBadge({ status, className }: { status: string | null; className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        'rounded-sm px-1.5 py-0.5 font-mono text-2xs',
        status === 'Forbidden'
          ? 'bg-opponent-tint text-opponent'
          : status
            ? 'bg-warning-tint text-warning'
            : 'bg-surface-3 text-text-muted',
        className
      )}
    >
      {t(`preview.ban.${status ?? 'Unlimited'}`)}
    </span>
  );
}
