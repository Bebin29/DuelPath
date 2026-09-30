'use client';

import { useRef } from 'react';
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
  const move = (index: number) => {
    const next = (index + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn('flex gap-6 border-b border-line', className)}
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
              '-mb-px border-b-2 pb-2 pt-1 text-sm transition-colors duration-(--motion-fast)',
              selected ? 'border-ink text-ink' : 'border-transparent text-text-muted hover:text-ink'
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
