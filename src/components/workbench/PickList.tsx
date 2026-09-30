'use client';

import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { Kbd } from '@/components/ui/kbd';
import { CardView } from '@/components/cards/CardView';

export interface PickItem {
  id: string;
  label: string;
  image?: string | null;
  /** Rechts in der Zeile, etwa die Zone oder „trifft“ */
  hint?: string;
  /** Hervorgehobener Hinweis, etwa ein Treffer des Stresstests */
  strong?: boolean;
  /** Weitere Suchbegriffe, etwa der deutsche Name */
  keywords?: string[];
}

/**
 * Auswahlliste über dem Board (UI-Plan 7.4.3): tippen filtert, Pfeile wählen, Enter übernimmt,
 * die ersten neun Einträge tragen ihre Zifferntaste. Genutzt von „/“ und der Staple-Wahl (O).
 */
export function PickList({
  items,
  placeholder,
  hint,
  onPick,
  onClose,
  max = 9,
}: {
  items: PickItem[];
  placeholder: string;
  hint: string;
  onPick: (id: string) => void;
  onClose: () => void;
  max?: number;
}) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const hits = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (item: PickItem) =>
      [item.label, ...(item.keywords ?? [])].some((w) => w.toLowerCase().includes(q));
    return (q ? items.filter(matches) : items).slice(0, max);
  }, [items, query, max]);

  const pick = (item: PickItem | undefined) => item && onPick(item.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute bottom-16 left-1/2 z-40 w-96 -translate-x-1/2 rounded-lg border border-line bg-surface-2 shadow-[0_18px_40px_rgb(0_0_0/0.45)]"
    >
      <input
        autoFocus
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onBlur={onClose}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
          else if (e.key === 'Enter') pick(hits[active]);
          else if (e.key === 'ArrowDown') setActive((i) => Math.min(i + 1, hits.length - 1));
          else if (e.key === 'ArrowUp') setActive((i) => Math.max(i - 1, 0));
          // Ziffern wählen direkt, solange nichts getippt ist
          else if (!query && /^[1-9]$/.test(e.key)) pick(hits[Number(e.key) - 1]);
          else return;
          e.preventDefault();
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        role="combobox"
        aria-expanded
        aria-controls="pick-list"
        className="w-full border-b border-line bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-text-subtle"
      />
      <ul id="pick-list" role="listbox" className="flex flex-col p-1">
        {hits.map((item, i) => (
          <li
            key={item.id}
            role="option"
            aria-selected={i === active}
            onMouseDown={(e) => {
              e.preventDefault();
              pick(item);
            }}
            onMouseEnter={() => setActive(i)}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1 text-sm',
              i === active && 'bg-ink/7'
            )}
          >
            <CardView image={item.image} label={item.label} size="art" />
            <span className="flex-1 truncate">{item.label}</span>
            {item.hint && (
              <span
                className={cn(
                  'font-mono text-2xs',
                  item.strong ? 'text-opponent' : 'text-text-subtle'
                )}
              >
                {item.hint}
              </span>
            )}
            {!query && i < 9 && <Kbd>{i + 1}</Kbd>}
          </li>
        ))}
      </ul>
      <p className="border-t border-line px-3 py-1.5 font-mono text-2xs text-text-subtle">{hint}</p>
    </motion.div>
  );
}
