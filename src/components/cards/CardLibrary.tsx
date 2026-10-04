'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useCardLanguage } from '@/components/providers/SettingsProvider';
import { CardView } from '@/components/cards/CardView';
import { CardFacts, BanBadge } from '@/components/cards/CardFacts';
import { CardEffectList } from '@/components/cards/CardEffectList';
import { CardMechanics } from '@/components/cards/CardMechanics';
import { Segmented } from '@/components/ui/segmented';
import { cn } from '@/lib/utils';
import type { ComboCard } from '@/lib/combo/cards';
import { getCardDetail, type CardDetail } from '@/server/actions/card.actions';

interface Hit {
  id: string;
  name: string;
  nameDe: string | null;
  type: string;
  banTcg: string | null;
  imageSmall: string | null;
}

/**
 * Kartensuche und Nachschlagewerk (DUE-35): die Suche aus dem Deckeditor ohne Umweg über ein Deck.
 * Links die Treffer (Name, deutscher Name, Kürzel, Spitzname), rechts die Karte mit
 * zerlegten Effekten, OPT-Art, Banlist-Status und den passenden Ruling-Mechaniken.
 * Die gewählte Karte steht als `?card=` in der Adresse, damit sich ein Nachschlag teilen lässt.
 */
export function CardLibrary({
  initialQuery,
  initialCard,
  staples = [],
}: {
  initialQuery: string;
  initialCard: CardDetail | null;
  /** Einstieg ohne Auswahl: die Karten, deren Rulings man am häufigsten nachschlägt */
  staples?: Pick<ComboCard, 'id' | 'name' | 'nameDe' | 'imageSmall'>[];
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const cardLanguage = useCardLanguage();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Hit[]>([]);
  const [card, setCard] = useState<CardDetail | null>(initialCard);
  const [pending, setPending] = useState(false);
  const debounced = useDebounce(query.trim(), 250);
  // Nur die zuletzt gestartete Abfrage darf die Anzeige setzen
  const latest = useRef(0);

  useEffect(() => {
    if (debounced.length < 2) return;
    const controller = new AbortController();
    fetch(`/api/cards?name=${encodeURIComponent(debounced)}&limit=40`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data: { cards?: Hit[] }) => setResults(data.cards ?? []))
      .catch(() => {});
    return () => controller.abort();
  }, [debounced]);

  // Bei zu kurzer Eingabe gar nicht erst suchen; die alten Treffer bleiben ungenutzt liegen
  const hits = debounced.length >= 2 ? results : [];

  // Suchbegriff in der Adresse halten, ohne einen Eintrag im Verlauf je Tastendruck
  useEffect(() => {
    const params = new URLSearchParams();
    if (debounced) params.set('q', debounced);
    if (card) params.set('card', card.id);
    const search = params.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  }, [debounced, card, pathname, router]);

  const select = useCallback(async (cardId: string) => {
    const run = ++latest.current;
    setPending(true);
    const result = await getCardDetail(cardId);
    if (run !== latest.current) return;
    setCard(result.data ?? null);
    setPending(false);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl">{t('cards.title')}</h1>
        <p className="text-sm text-text-muted">{t('cards.subtitle')}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <section aria-label={t('cards.search')} className="flex flex-col gap-3">
          <label className="flex h-10 items-center gap-2 rounded-md border border-line bg-surface-1 px-2.5 focus-within:border-line-strong">
            <Search className="size-4 text-text-subtle" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('cards.searchPlaceholder')}
              aria-label={t('cards.search')}
              className="min-w-0 flex-1 self-stretch bg-transparent text-sm outline-none placeholder:text-text-subtle pointer-coarse:text-base"
            />
          </label>
          <p className="font-mono text-2xs text-text-subtle">{t('cards.searchHint')}</p>

          <ul className="flex max-h-[60vh] flex-col overflow-y-auto lg:max-h-[calc(100dvh-16rem)]">
            {hits.map((hit) => {
              const name = (cardLanguage === 'de' && hit.nameDe) || hit.name;
              const active = card?.id === hit.id;
              return (
                <li key={hit.id}>
                  <button
                    type="button"
                    onClick={() => select(hit.id)}
                    aria-current={active ? 'true' : undefined}
                    className={cn(
                      'flex w-full min-w-0 items-center gap-2.5 rounded-sm px-1.5 py-1 text-left hover:bg-surface-3/60 pointer-coarse:py-1.5',
                      active && 'bg-ink/9 shadow-[inset_2px_0_0_var(--ink)]'
                    )}
                  >
                    <CardView image={hit.imageSmall} label="" size="xs" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{name}</span>
                      <span className="block truncate font-mono text-2xs text-text-subtle">
                        {hit.type}
                        {hit.banTcg && ` · ${t(`preview.ban.${hit.banTcg}`)}`}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            {debounced.length >= 2 && hits.length === 0 && (
              <li className="px-1.5 text-sm text-text-subtle">{t('combo.noResults')}</li>
            )}
          </ul>
        </section>

        {card ? (
          <CardDetailPanel key={card.id} card={card} busy={pending} />
        ) : (
          <section
            aria-labelledby="cards-staples"
            className="flex flex-col gap-4 rounded-md border border-dashed border-line p-6"
          >
            <p className="text-sm text-text-subtle">{t('cards.empty')}</p>
            {staples.length > 0 && (
              <>
                <h2 id="cards-staples" className="font-display text-xl">
                  {t('cards.staples')}
                </h2>
                <ul className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-3">
                  {staples.map((s) => {
                    const name = (cardLanguage === 'de' && s.nameDe) || s.name;
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => select(s.id)}
                          className="group flex w-full flex-col items-center gap-1.5 rounded-sm p-1 text-center hover:bg-surface-3/60"
                        >
                          <CardView
                            image={s.imageSmall}
                            label=""
                            size="board"
                            className="transition-transform duration-(--motion-base) group-hover:-translate-y-0.5"
                          />
                          <span className="line-clamp-2 text-xs leading-tight">{name}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function CardDetailPanel({ card, busy }: { card: CardDetail; busy: boolean }) {
  const { t } = useTranslation();
  const cardLanguage = useCardLanguage();
  const [german, setGerman] = useState(cardLanguage === 'de' && Boolean(card.descDe));
  const name = cardLanguage === 'de' && card.nameDe ? card.nameDe : card.name;

  return (
    <section
      aria-label={name}
      aria-busy={busy}
      className={cn('flex flex-col gap-5 transition-opacity', busy && 'opacity-60')}
    >
      <header className="flex flex-col gap-1">
        <h2 className="font-display text-2xl leading-tight">{name}</h2>
        {cardLanguage === 'de' && card.nameDe && (
          <p className="text-xs text-text-subtle">{card.name}</p>
        )}
        <CardFacts card={card} className="mt-1" />
      </header>

      <div className="flex flex-wrap items-start gap-4">
        <CardView image={card.imageSmall} label={name} size="xl" className="shrink-0" />
        <div className="flex min-w-56 flex-1 flex-col gap-3">
          <BanBadge status={card.banTcg} className="self-start" />
          {card.desc && (
            <>
              <div className="flex items-center">
                <h3 className="flex-1 font-display text-lg">{t('cardSheet.text')}</h3>
                {card.descDe && (
                  <Segmented<'en' | 'de'>
                    label={t('cardSheet.text')}
                    value={german ? 'de' : 'en'}
                    onChange={(v) => setGerman(v === 'de')}
                    options={[
                      { value: 'en', label: 'EN' },
                      { value: 'de', label: 'DE' },
                    ]}
                  />
                )}
              </div>
              <p
                lang={german ? 'de' : 'en'}
                className="whitespace-pre-line text-[13px] leading-[1.5] text-text-muted"
              >
                {german ? card.descDe : card.desc}
              </p>
            </>
          )}
        </div>
      </div>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline gap-2">
          <h3 className="flex-1 font-display text-lg">{t('workbench.effects')}</h3>
          {card.overridden && (
            <span className="font-mono text-2xs text-jev">{t('cardSheet.corrected')}</span>
          )}
        </div>
        <CardEffectList effects={card.effects} />
      </section>

      <CardMechanics mechanics={card.mechanics} />
    </section>
  );
}
