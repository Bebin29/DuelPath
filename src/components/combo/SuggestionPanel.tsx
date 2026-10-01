'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { useCardLanguage } from '@/components/providers/SettingsProvider';
import { displayName, type ComboCard } from '@/lib/combo/cards';
import {
  SUGGESTION_THRESHOLD,
  type Candidate,
  type SuggestionInput,
} from '@/lib/combo/suggestions';
import { suggestEffects } from '@/server/actions/suggestion.actions';

interface SuggestionPanelProps {
  input: SuggestionInput;
  candidates: Candidate[];
  cards: Map<string, ComboCard>;
  onPick: (candidate: Candidate) => void;
}

/** Jev-Vorschläge für den nächsten Schritt; lädt kurz nach jedem Wechsel des Zustands neu */
export function SuggestionPanel({ input, candidates, cards, onPick }: SuggestionPanelProps) {
  const { t } = useTranslation();
  const cardLanguage = useCardLanguage();
  const key = JSON.stringify(input);
  const [result, setResult] = useState<{ key: string; probabilities?: number[]; error?: string }>();

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      // Nur der Inhalt zählt: gleiche Eingabe mit neuer Objekt-Identität lädt nicht erneut
      const response = await suggestEffects(JSON.parse(key) as SuggestionInput);
      if (!cancelled)
        setResult({ key, probabilities: response.data?.probabilities, error: response.error });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [key]);

  const loading = candidates.length > 0 && result?.key !== key;
  const rated = candidates
    .map((candidate, i) => ({
      candidate,
      p: result?.key === key ? (result.probabilities?.[i] ?? 0) : 0,
    }))
    .sort((a, b) => b.p - a.p);
  const shown = rated.filter((r) => r.p >= SUGGESTION_THRESHOLD);
  const hidden = rated.length - shown.length;

  return (
    <div className="space-y-2 rounded-md border p-2 text-sm">
      <h3 className="flex items-center gap-1 font-semibold">
        <Sparkles className="h-4 w-4" />
        {t('combo.suggestions.title')}
      </h3>
      {candidates.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('combo.suggestions.none')}</p>
      ) : loading ? (
        <p className="text-xs text-muted-foreground">{t('combo.suggestions.loading')}</p>
      ) : result?.error ? (
        <p className="text-xs text-muted-foreground">
          {t('combo.suggestions.error', { message: result.error })}
        </p>
      ) : (
        <>
          <ul className="space-y-1">
            {shown.map(({ candidate, p }) => {
              const card = cards.get(candidate.cardId);
              const effect = card?.effects[candidate.effectIndex];
              return (
                <li key={`${candidate.instanceId}-${candidate.effectIndex}`}>
                  <button
                    type="button"
                    onClick={() => onPick(candidate)}
                    className="flex w-full items-center gap-2 rounded border bg-card p-1 text-left hover:bg-accent"
                  >
                    {card?.imageSmall && (
                      // eslint-disable-next-line @next/next/no-img-element -- kleine Vorschau aus dem lokalen Bild-Cache
                      <img
                        src={card.imageSmall}
                        alt=""
                        className="h-10 w-7 shrink-0 object-cover"
                      />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {displayName(card, cardLanguage)}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {t(`combo.zones.${candidate.zone}`)} · {effect?.text}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs tabular-nums">{Math.round(p * 100)} %</span>
                  </button>
                </li>
              );
            })}
          </ul>
          {shown.length === 0 && (
            <p className="text-xs text-muted-foreground">{t('combo.suggestions.noneAbove')}</p>
          )}
          {hidden > 0 && (
            <p className="text-xs text-muted-foreground">
              {t('combo.suggestions.hidden', {
                count: hidden,
                threshold: Math.round(SUGGESTION_THRESHOLD * 100),
              })}
            </p>
          )}
        </>
      )}
    </div>
  );
}
