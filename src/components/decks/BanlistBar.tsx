'use client';

import { useTranslation } from '@/lib/i18n/hooks';
import { Segmented } from '@/components/ui/segmented';
import { fromIsoDate, type BanlistKey, type Banlists } from '@/lib/deck/banlist';

/**
 * Stand der Banlist über dem Deck-Check, und falls eine nächste Liste gepflegt
 * ist, der Umschalter dorthin (Lücke L5).
 */
export function BanlistBar({
  banlists,
  value,
  onChange,
  issues,
}: {
  banlists: Banlists;
  value: BanlistKey;
  onChange: (key: BanlistKey) => void;
  /** Anzahl der Regelhinweise; ohne einen davon bestätigt die Leiste den Stand */
  issues: number;
}) {
  const { t, i18n } = useTranslation();
  const list = value === 'next' ? banlists.next : banlists.current;
  const date = list?.effectiveOn ? fromIsoDate(list.effectiveOn) : null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-muted">
      <span>
        {date
          ? t('decks.banlist.asOf', {
              date: new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(date),
            })
          : t('decks.banlist.unknown')}
      </span>
      {banlists.next && (
        <Segmented<BanlistKey>
          label={t('decks.banlist.label')}
          value={value}
          onChange={onChange}
          options={[
            { value: 'current', label: t('decks.banlist.current') },
            { value: 'next', label: banlists.next.name },
          ]}
        />
      )}
      {issues === 0 && <span className="text-text-subtle">{t('decks.banlist.clean')}</span>}
    </div>
  );
}
