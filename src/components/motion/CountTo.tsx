'use client';

import { useEffect } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { prefersReducedMotion } from '@/lib/motion';

/**
 * Zahl, die von einem Startwert zum Ziel läuft (Szene „Endboard“: Zähler läuft mit den Kreisen,
 * Vergleich: Werte fallen). Bei reduzierter Bewegung steht sofort das Ziel.
 */
export function CountTo({
  from = 0,
  to,
  duration = 0.6,
  delay = 0,
  className,
}: {
  from?: number;
  to: number;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const value = useMotionValue(from);
  const rounded = useTransform(value, (v) => Math.round(v));
  useEffect(() => {
    if (prefersReducedMotion()) {
      value.set(to);
      return;
    }
    const controls = animate(value, to, { duration, delay, ease: 'linear' });
    return () => controls.stop();
  }, [value, to, duration, delay]);
  return <motion.span className={className}>{rounded}</motion.span>;
}
