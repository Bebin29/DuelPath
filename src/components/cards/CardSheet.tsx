'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Lock, TriangleAlert, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { useCardLanguage } from '@/components/providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { CardView } from '@/components/cards/CardView';
import type { CardEffect } from '@/lib/cards/effects';
import {
  draftsOf,
  mergeDraft,
  splitDraft,
  type EffectDraft,
  type OptKind,
} from '@/lib/cards/effect-override';
import { getCardDetail, saveEffectOverride, type CardDetail } from '@/server/actions/card.actions';

type OnSaved = (cardId: string, effects: CardEffect[]) => void;

const CardSheetContext = createContext<{ open: (cardId: string, onSaved?: OnSaved) => void }>({
  open: () => {},
});

/** Öffnet die Kartenansicht von überall (Inspector, Deckseite, Suche) */
export const useCardSheet = () => useContext(CardSheetContext);

/**
 * Kartenansicht (UI-Plan 7.4.4): von rechts, 480 px, die Seite bleibt dahinter sichtbar.
 * Großes Bild, Text in beiden Sprachen, Effekte mit OPT und „Effekte bearbeiten“ (UX-Plan 8).
 */
export function CardSheetProvider({ children }: { children: React.ReactNode }) {
  const [card, setCard] = useState<CardDetail | null>(null);
  const [open, setOpen] = useState(false);
  const onSaved = useRef<OnSaved | undefined>(undefined);

  const openCard = useCallback(async (cardId: string, saved?: OnSaved) => {
    onSaved.current = saved;
    setOpen(true);
    const result = await getCardDetail(cardId);
    setCard(result.data ?? null);
  }, []);

  return (
    <CardSheetContext.Provider value={{ open: openCard }}>
      {children}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          aria-describedby={undefined}
          closeLabel={false}
          className="h-[92dvh] sm:h-auto"
        >
          {card ? (
            <CardSheetBody
              key={card.id}
              card={card}
              onSaved={(effects) => {
                setCard({ ...card, effects, overridden: true, reviewReasons: [] });
                onSaved.current?.(card.id, effects);
              }}
              onReset={(effects) => {
                setCard({ ...card, effects, overridden: false });
                onSaved.current?.(card.id, effects);
              }}
            />
          ) : (
            <Dialog.Title className="p-6 text-text-subtle">…</Dialog.Title>
          )}
        </SheetContent>
      </Sheet>
    </CardSheetContext.Provider>
  );
}

function CardSheetBody({
  card,
  onSaved,
  onReset,
}: {
  card: CardDetail;
  onSaved: (effects: CardEffect[]) => void;
  onReset: (effects: CardEffect[]) => void;
}) {
  const { t } = useTranslation();
  const cardLanguage = useCardLanguage();
  const [german, setGerman] = useState(cardLanguage === 'de' && Boolean(card.descDe));
  const [drafts, setDrafts] = useState<EffectDraft[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const name = cardLanguage === 'de' && card.nameDe ? card.nameDe : card.name;
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

  const save = async () => {
    if (!drafts) return;
    const result = await saveEffectOverride(card.id, drafts);
    if (!result.data) return setError(result.error ?? '');
    setDrafts(null);
    onSaved(result.data);
  };
  const reset = async () => {
    const result = await saveEffectOverride(card.id, null);
    if (result.data) {
      setDrafts(null);
      onReset(result.data);
    }
  };

  return (
    <>
      <header className="flex items-start gap-3 border-b border-line p-5">
        <div className="min-w-0 flex-1">
          <Dialog.Title className="font-display text-2xl leading-tight">{name}</Dialog.Title>
          {cardLanguage === 'de' && card.nameDe && (
            <p className="text-xs text-text-subtle">{card.name}</p>
          )}
          <p className="mt-1 font-mono text-2xs text-text-muted">
            {[card.type, ...stats].join(' · ')}
          </p>
        </div>
        <Dialog.Close asChild>
          <Button variant="ghost" size="icon-sm" aria-label={t('workbench.close')}>
            <X />
          </Button>
        </Dialog.Close>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5">
        <div className="flex gap-4">
          <CardView image={card.imageSmall} label={name} size="xl" className="shrink-0" />
        </div>
        <span
          className={cn(
            'self-start rounded-sm px-1.5 py-0.5 font-mono text-2xs',
            card.banTcg === 'Forbidden'
              ? 'bg-opponent-tint text-opponent'
              : card.banTcg
                ? 'bg-warning-tint text-warning'
                : 'bg-surface-3 text-text-muted'
          )}
        >
          {t(`preview.ban.${card.banTcg ?? 'Unlimited'}`)}
        </span>

        {card.desc && (
          <section className="flex flex-col gap-2">
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
          </section>
        )}

        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h3 className="flex-1 font-display text-lg">{t('workbench.effects')}</h3>
            {card.overridden && !drafts && (
              <span className="font-mono text-2xs text-jev">{t('cardSheet.corrected')}</span>
            )}
            {!drafts && (
              <Button variant="line" size="sm" onClick={() => setDrafts(draftsOf(card.effects))}>
                {t('cardSheet.edit')}
              </Button>
            )}
          </div>
          {card.reviewReasons.length > 0 && !drafts && (
            <p className="flex gap-2 rounded-md border border-warning/40 bg-warning-tint p-2.5 text-xs text-warning">
              <TriangleAlert className="size-3.5 shrink-0" />
              <span>
                {t('cardSheet.unsure')} {card.reviewReasons.join(', ')}
              </span>
            </p>
          )}
          {drafts ? (
            <EffectEditor drafts={drafts} onChange={setDrafts} />
          ) : (
            <ol className="flex flex-col gap-2">
              {card.effects.map((effect, i) => (
                <li key={i} className="flex gap-2.5 rounded-md border border-line p-2.5">
                  <span className="font-mono text-xs text-text-subtle">{i + 1}</span>
                  <div className="flex flex-1 flex-col gap-1">
                    <p lang="en" className="text-[12.5px] leading-[1.45]">
                      {effect.text}
                    </p>
                    <span className="flex items-center gap-2 font-mono text-2xs text-text-subtle">
                      {effect.activated && t('cardSheet.chainLink')}
                      {effect.opt && (
                        <span className="flex items-center gap-1">
                          <Lock className="size-3" />
                          {effect.opt.kind === 'HARD' ? 'HOPT' : 'SOPT'}
                        </span>
                      )}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {drafts && (
        <footer className="flex items-center gap-2 border-t border-line p-4">
          {card.overridden && (
            <Button variant="text" size="sm" onClick={reset}>
              {t('cardSheet.reset')}
            </Button>
          )}
          {error && <span className="text-xs text-opponent">{error}</span>}
          <span className="flex-1" />
          <Button variant="ghost" onClick={() => setDrafts(null)}>
            {t('cardSheet.cancel')}
          </Button>
          <Button onClick={save}>{t('cardSheet.save')}</Button>
        </footer>
      )}
    </>
  );
}

/** Effekte teilen, zusammenlegen, als Chain Link markieren und die OPT-Art ändern */
function EffectEditor({
  drafts,
  onChange,
}: {
  drafts: EffectDraft[];
  onChange: (drafts: EffectDraft[]) => void;
}) {
  const { t } = useTranslation();
  const cursor = useRef<number[]>([]);
  const patch = (i: number, p: Partial<EffectDraft>) =>
    onChange(drafts.map((d, k) => (k === i ? { ...d, ...p } : d)));

  return (
    <ol className="flex flex-col gap-3">
      {drafts.map((d, i) => (
        <li key={i} className="flex flex-col gap-2 rounded-md border border-line p-2.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-text-subtle">{i + 1}</span>
            <label className="flex items-center gap-1.5 text-xs text-text-muted">
              <input
                type="checkbox"
                checked={d.activated}
                onChange={(e) => patch(i, { activated: e.target.checked })}
                className="accent-[var(--ink)]"
              />
              {t('cardSheet.chainLink')}
            </label>
            <span className="flex-1" />
            <Segmented<OptKind>
              label={t('cardSheet.opt')}
              value={d.opt}
              onChange={(opt) => patch(i, { opt })}
              options={[
                { value: 'NONE', label: t('cardSheet.noOpt') },
                { value: 'SOFT', label: 'SOPT' },
                { value: 'HARD', label: 'HOPT' },
              ]}
            />
          </div>
          <textarea
            lang="en"
            value={d.text}
            rows={3}
            onChange={(e) => patch(i, { text: e.target.value })}
            onSelect={(e) => (cursor.current[i] = e.currentTarget.selectionStart)}
            className="resize-y rounded-md border border-line bg-transparent px-2 py-1.5 text-[12.5px] leading-[1.45] outline-none focus:border-line-strong"
          />
          <div className="flex gap-1">
            <Button
              variant="text"
              size="sm"
              onClick={() => onChange(splitDraft(drafts, i, cursor.current[i] ?? 0))}
            >
              {t('cardSheet.split')}
            </Button>
            {i < drafts.length - 1 && (
              <Button variant="text" size="sm" onClick={() => onChange(mergeDraft(drafts, i))}>
                {t('cardSheet.merge')}
              </Button>
            )}
            <span className="flex-1" />
            <Button
              variant="text"
              size="sm"
              onClick={() => onChange(drafts.filter((_, k) => k !== i))}
              className="text-opponent"
            >
              {t('cardSheet.remove')}
            </Button>
          </div>
        </li>
      ))}
    </ol>
  );
}
