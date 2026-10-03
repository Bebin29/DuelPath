'use client';

import { Lock } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import type { CardEffect } from '@/lib/cards/effects';

/** Zerlegte Effekte mit Chain-Link-Kennzeichnung und OPT-Art (Kartenansicht und /cards) */
export function CardEffectList({ effects }: { effects: CardEffect[] }) {
  const { t } = useTranslation();
  return (
    <ol className="flex flex-col gap-2">
      {effects.map((effect, i) => (
        <li key={i} className="flex gap-2.5 rounded-md border border-line p-2.5">
          <span className="font-mono text-xs text-text-subtle">{i + 1}</span>
          <div className="flex flex-1 flex-col gap-1">
            <p lang="en" className="text-[12.5px] leading-[1.45]">
              {effect.text}
            </p>
            <span className="flex items-center gap-2 font-mono text-2xs text-text-subtle">
              {effect.activated && t('cardSheet.chainLink')}
              {effect.opt && (
                <span
                  className="flex items-center gap-1"
                  title={t(`cardSheet.optWording.${effect.opt.wording}`)}
                >
                  <Lock className="size-3" />
                  {effect.opt.kind === 'HARD' ? 'HOPT' : 'SOPT'}
                  {effect.opt.per === 'duel' && ` · ${t('cardSheet.perDuel')}`}
                  {effect.opt.limit > 1 && ` · ${effect.opt.limit}×`}
                </span>
              )}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
