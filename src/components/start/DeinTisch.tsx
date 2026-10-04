'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { EASE } from '@/lib/motion';
import { useTranslation } from '@/lib/i18n/hooks';
import { COMBO_STATUSES, type ComboStatus } from '@/lib/combo/library';
import type { TableRow } from '@/server/actions/start.actions';

const MAX_DOTS = 14;
const GAP = 16;

/**
 * „Dein Tisch“ auf der Startseite: je Deck ein Pfad aus seinen Combos, vom Entwurf links bis
 * turnierfest rechts, dazu die Bilanz aus dem Spielprotokoll als rohe Zahlen (Deckbau-Plan 7).
 * Die Punkte sind Schmuck; was sie zeigen, steht daneben als Text.
 */
export function DeinTisch({ rows }: { rows: TableRow[] }) {
  const { t } = useTranslation();
  return (
    <section aria-labelledby="dein-tisch" className="lg:col-span-2">
      <h2 id="dein-tisch" className="border-b border-line pb-2 font-display text-2xl">
        {t('start.table.title')}
      </h2>
      <ul className="grid sm:grid-cols-2">
        {rows.map((row, i) => (
          <li
            key={row.id}
            className="border-b border-line sm:odd:border-r sm:odd:pr-6 sm:even:pl-6"
          >
            <Link
              href={`/decks/${row.id}`}
              className="flex min-h-11 flex-col gap-2 py-4 transition-colors duration-(--motion-fast) hover:bg-surface-1"
            >
              <span className="truncate font-display text-xl leading-none">{row.name}</span>
              <Pfad statuses={row.combos.map((c) => c.status)} delay={0.1 + i * 0.12} />
              <span className="font-mono text-xs text-text-subtle">
                {summary(row, t).join(' · ')}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function summary(row: TableRow, t: ReturnType<typeof useTranslation>['t']): string[] {
  const tournament = row.combos.filter((c) => c.status === 'TOURNAMENT').length;
  const { win, loss, draw, total } = row.record;
  return [
    row.combos.length
      ? t('start.table.combos', { count: row.combos.length })
      : t('start.table.noCombos'),
    ...(tournament ? [t('start.table.tournament', { count: tournament })] : []),
    ...(total
      ? [
          t('start.table.wins', { count: win }),
          t('start.table.losses', { count: loss }),
          ...(draw ? [t('start.table.draws', { count: draw })] : []),
        ]
      : [t('start.table.noGames')]),
  ];
}

/** Combos als Punkte auf einer Tintenlinie; Form statt nur Farbe: hohl, voll, voll mit Ring */
function Pfad({ statuses, delay }: { statuses: ComboStatus[]; delay: number }) {
  const sorted = [...statuses].sort(
    (a, b) => COMBO_STATUSES.indexOf(a) - COMBO_STATUSES.indexOf(b)
  );
  const dots = sorted.slice(0, MAX_DOTS);
  if (!dots.length) return null;
  const width = (dots.length - 1) * GAP + 16;
  return (
    <span aria-hidden className="flex h-4 items-center gap-2">
      {/* Der Blick aufs SVG löst aus, die Kinder folgen: Gruppen mit scale 0 haben keine Fläche,
          an ihnen selbst feuert die Sichtbarkeitsprüfung nie */}
      <motion.svg
        width={width}
        height={16}
        viewBox={`0 0 ${width} 16`}
        className="overflow-visible"
        initial="hidden"
        whileInView="shown"
        viewport={{ once: true }}
      >
        {dots.length > 1 && (
          <motion.path
            d={`M 8 8 H ${width - 8}`}
            stroke="var(--line-strong)"
            strokeWidth={1.5}
            strokeLinecap="round"
            variants={{ hidden: { pathLength: 0 }, shown: { pathLength: 1 } }}
            transition={{ duration: 0.6, delay, ease: EASE.ink }}
          />
        )}
        {dots.map((status, i) => (
          <motion.g
            key={i}
            variants={{ hidden: { scale: 0 }, shown: { scale: 1 } }}
            transition={{ duration: 0.3, delay: delay + 0.1 + i * 0.05, ease: EASE.out }}
            style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
          >
            <Dot status={status} cx={8 + i * GAP} />
          </motion.g>
        ))}
      </motion.svg>
      {statuses.length > MAX_DOTS && (
        <span className="font-mono text-2xs text-text-subtle">+{statuses.length - MAX_DOTS}</span>
      )}
    </span>
  );
}

function Dot({ status, cx }: { status: ComboStatus; cx: number }) {
  if (status === 'DRAFT') {
    return (
      <circle cx={cx} cy={8} r={4} fill="var(--bg)" stroke="var(--line-strong)" strokeWidth={1.5} />
    );
  }
  const color = status === 'TESTED' ? 'var(--self)' : 'var(--warning)';
  return (
    <>
      {status === 'TOURNAMENT' && (
        <circle cx={cx} cy={8} r={7} fill="none" stroke={color} strokeWidth={1.2} />
      )}
      <circle cx={cx} cy={8} r={4.5} fill={color} />
    </>
  );
}
