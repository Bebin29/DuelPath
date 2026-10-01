'use client';

import { MotionConfig } from 'motion/react';

/** Bei reduzierter Bewegung steht sofort der Endzustand (UI-Plan 4.7) */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
