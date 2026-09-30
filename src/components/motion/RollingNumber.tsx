'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { EASE } from '@/lib/motion';

/**
 * Zahl, die beim Wechsel rollt (Motion-Szene „Mikro“, Zahl): steigt sie, kommt die neue von unten,
 * fällt sie, von oben. Die Breite bleibt tabellarisch, damit nichts springt.
 */
export function RollingNumber({
  value,
  className,
}: {
  value: number | string;
  className?: string;
}) {
  // Richtung aus dem vorigen Wert, als abgeleiteter Zustand beim Rendern
  const [prev, setPrev] = useState(value);
  const [dir, setDir] = useState(1);
  if (prev !== value) {
    setDir(Number(value) >= Number(prev) ? 1 : -1);
    setPrev(value);
  }
  return (
    <span className={cn('relative inline-flex overflow-hidden tabular-nums', className)}>
      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        <motion.span
          key={String(value)}
          custom={dir}
          variants={{
            enter: (d: number) => ({ y: `${60 * d}%`, opacity: 0 }),
            center: { y: 0, opacity: 1 },
            exit: (d: number) => ({ y: `${-60 * d}%`, opacity: 0 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.22, ease: EASE.out }}
          className="inline-block"
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
