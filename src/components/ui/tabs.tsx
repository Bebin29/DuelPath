'use client';

import { useId, useRef } from 'react';
import { motion } from 'motion/react';
import { SPRING } from '@/lib/motion';
import { cn } from '@/lib/utils';

export interface TabOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

/**
 * Tabs nach ARIA (UI-Plan 7.5.4): Pfeiltasten wechseln, der aktive Tab trägt einen Tintenstrich.
 * Der Inhalt steht beim Aufrufer in einem Element mit role="tabpanel" und id `${id}-panel`.
 */
export function Tabs<T extends string>({
  id,
  value,
  options,
  onChange,
  label,
  className,
}: {
  id: string;
  value: T;
  options: TabOption<T>[];
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const indicator = useId();
  const move = (index: number) => {
    const next = (index + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        'flex gap-6 overflow-x-auto border-b border-line [scrollbar-width:none]',
        className
      )}
    >
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`${id}-${o.value}`}
            aria-selected={selected}
            aria-controls={`${id}-panel`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') move(i + 1);
              else if (e.key === 'ArrowLeft') move(i - 1);
              else return;
              e.preventDefault();
            }}
            className={cn(
              'relative -mb-px shrink-0 whitespace-nowrap pb-2 pt-1 text-sm transition-colors duration-(--motion-fast) pointer-coarse:min-h-10',
              selected ? 'text-ink' : 'text-text-muted hover:text-ink'
            )}
          >
            {o.label}
            {/* Der Unterstrich gleitet zum gewählten Tab (Szene „Mikro“, Tabs) */}
            {selected && (
              <motion.span
                layoutId={indicator}
                transition={SPRING.snappy}
                className="absolute inset-x-0 bottom-0 h-0.5 bg-ink"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
