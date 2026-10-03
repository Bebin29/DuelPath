'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/hooks';
import { cn } from '@/lib/utils';
import { RULING_SOURCES, type RulingSourceKey } from '@/lib/rulings/sources';
import type { RulingMechanic } from '@/lib/rulings/mechanics';
import type { MechanicMatch, MechanicResult } from '@/lib/rulings/match';

/**
 * Ruling-Mechaniken einer Karte (DUE-35): was die App deterministisch rechnet,
 * was sie nur teilweise prüft und was allein als Kontext taugt — jeweils mit Quelle.
 */
export function CardMechanics({ mechanics }: { mechanics: MechanicResult }) {
  const { t } = useTranslation();
  const [showGeneral, setShowGeneral] = useState(false);

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2">
        <h3 className="flex-1 font-display text-lg">{t('mechanics.title')}</h3>
        <span className="font-mono text-2xs text-text-subtle">
          {t('mechanics.count', { count: mechanics.matched.length })}
        </span>
      </div>
      <p className="text-xs text-text-subtle">{t('mechanics.intro')}</p>

      {mechanics.matched.length === 0 ? (
        <p className="rounded-md border border-line p-2.5 text-sm text-text-subtle">
          {t('mechanics.none')}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {mechanics.matched.map((match) => (
            <MechanicRow key={match.mechanic.key} match={match} />
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setShowGeneral((open) => !open)}
          aria-expanded={showGeneral}
          className="flex items-center gap-1.5 self-start font-mono text-2xs text-text-subtle hover:text-ink pointer-coarse:min-h-10"
        >
          <ChevronDown
            className={cn(
              'size-3 transition-transform duration-(--motion-fast)',
              showGeneral && 'rotate-180'
            )}
          />
          {t('mechanics.general', { count: mechanics.general.length })}
        </button>
        {showGeneral && (
          <>
            <p className="text-xs text-text-subtle">{t('mechanics.generalIntro')}</p>
            <ul className="flex flex-col gap-2">
              {mechanics.general.map((mechanic) => (
                <li
                  key={mechanic.key}
                  className="flex flex-col gap-1 rounded-md border border-line p-2.5"
                >
                  <MechanicHead mechanic={mechanic} />
                  <MechanicBody mechanic={mechanic} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}

function MechanicRow({ match }: { match: MechanicMatch }) {
  const { t } = useTranslation();
  const { mechanic, patterns, byCardType, byStructure } = match;
  const basis = [
    ...patterns,
    ...(byCardType ? [t('mechanics.basis.cardType')] : []),
    ...(byStructure ? [t('mechanics.basis.structure')] : []),
  ];

  return (
    <li className="flex flex-col gap-1 rounded-md border border-line p-2.5">
      <MechanicHead mechanic={mechanic} />
      <MechanicBody mechanic={mechanic} />
      <p className="font-mono text-2xs text-text-subtle">
        {t('mechanics.basis.label')} {basis.join(', ')}
      </p>
    </li>
  );
}

function MechanicHead({ mechanic }: { mechanic: RulingMechanic }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-2xs text-text-subtle">
        {t(`mechanics.category.${mechanic.category}`)}
      </span>
      <Deterministic value={mechanic.deterministic} />
      <span className="flex-1" />
      <span className="flex flex-wrap gap-1.5">
        {mechanic.sources.map((key) => (
          <Source key={key} code={key} />
        ))}
      </span>
    </div>
  );
}

function MechanicBody({ mechanic }: { mechanic: RulingMechanic }) {
  const { t } = useTranslation();
  const facts = (
    [
      ['opt', mechanic.opt],
      ['cost', mechanic.cost],
      ['card', mechanic.card],
      ['trigger', mechanic.trigger],
    ] as const
  ).filter((entry): entry is [(typeof entry)[0], string] => Boolean(entry[1]));

  return (
    <>
      <p className="text-[12.5px] leading-[1.45]">{mechanic.description}</p>
      {facts.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-2xs text-text-muted">
          {facts.map(([field, value]) => (
            <div key={field} className="col-span-2 grid grid-cols-subgrid">
              <dt className="font-mono text-text-subtle">{t(`mechanics.field.${field}`)}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {mechanic.notes && (
        <p className="text-2xs text-warning">
          {t('mechanics.notes')} {mechanic.notes}
        </p>
      )}
    </>
  );
}

/** Zeigt, wie weit die App die Regel selbst rechnet */
function Deterministic({ value }: { value: RulingMechanic['deterministic'] }) {
  const { t } = useTranslation();
  return (
    <span
      title={t(`mechanics.deterministic.${value}.hint`)}
      className={cn(
        'rounded-sm px-1.5 py-0.5 font-mono text-2xs',
        value === 'yes'
          ? 'bg-surface-3 text-text-muted'
          : value === 'partial'
            ? 'bg-warning-tint text-warning'
            : 'bg-opponent-tint text-opponent'
      )}
    >
      {t(`mechanics.deterministic.${value}.label`)}
    </span>
  );
}

function Source({ code }: { code: RulingSourceKey }) {
  const source = RULING_SOURCES[code];
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      title={`${source.publisher}: ${source.title}`}
      className="rounded-sm border border-line px-1.5 py-0.5 font-mono text-2xs text-text-subtle hover:border-line-strong hover:text-ink"
    >
      {code}
    </a>
  );
}
