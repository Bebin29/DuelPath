'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useTranslation } from '@/lib/i18n/hooks';
import { useCardLanguage } from '@/components/providers/SettingsProvider';
import { displayName, toComboCard, type ComboCard } from '@/lib/combo/cards';

/** Kartensuche über /api/cards; liefert die gewählte Karte mit zerlegten Effekten */
export function CardSearchBox({ onPick }: { onPick: (card: ComboCard) => void }) {
  const { t } = useTranslation();
  const cardLanguage = useCardLanguage();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ComboCard[]>([]);
  const debounced = useDebounce(query.trim(), 250);

  useEffect(() => {
    if (debounced.length < 2) return;
    const controller = new AbortController();
    fetch(`/api/cards?name=${encodeURIComponent(debounced)}&limit=8`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data: { cards?: Parameters<typeof toComboCard>[0][] }) =>
        setResults((data.cards ?? []).map(toComboCard))
      )
      .catch(() => {});
    return () => controller.abort();
  }, [debounced]);

  const visible = debounced.length >= 2 ? results : [];

  return (
    <div className="relative">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('combo.searchCard')}
      />
      {visible.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-popover shadow-md">
          {visible.map((card) => (
            <li key={card.id}>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-2 py-1 text-left text-sm hover:bg-accent"
                onClick={() => {
                  onPick(card);
                  setQuery('');
                }}
              >
                {card.imageSmall && (
                  // eslint-disable-next-line @next/next/no-img-element -- kleine Vorschau aus dem lokalen Bild-Cache
                  <img src={card.imageSmall} alt="" className="h-10 w-7 shrink-0 object-cover" />
                )}
                <span className="truncate">{displayName(card, cardLanguage)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
