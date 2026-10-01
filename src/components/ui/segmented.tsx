'use client';

import { useId, useRef } from 'react';
import { motion } from 'motion/react';
import { SPRING } from '@/lib/motion';
import { cn } from '@/lib/utils';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Auswahl aus wenigen Werten mit Unterstrich wie die Tabs (UI-Plan 7.5.6, Motion-System „Tabs“).
 * Zugänglich als radiogroup: Pfeiltasten wechseln, nur der gewählte Wert ist im Tab-Fokus.
 */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  // Der Unterstrich gleitet zum gewählten Wert (Motion-Szene „Mikro“, Tabs)
  const indicator = useId();
  const current = options.findIndex((o) => o.value === value);

  const move = (delta: number) => {
    const next = (current + delta + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={label} className={cn('flex items-center gap-4', className)}>
      {options.map((o, i) => {
        const checked = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                move(1);
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                move(-1);
              }
            }}
            className={cn(
              'relative py-1 text-sm transition-colors duration-(--motion-base)',
              checked ? 'font-semibold text-ink' : 'text-text-subtle hover:text-ink'
            )}
          >
            {o.label}
            {checked && (
              <motion.span
                layoutId={indicator}
                transition={SPRING.snappy}
                className="absolute inset-x-0 bottom-0 h-[1.5px] bg-ink"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
