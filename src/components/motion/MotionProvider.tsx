'use client';

import { MotionConfig, MotionGlobalConfig } from 'motion/react';

/**
 * Bei reduzierter Bewegung steht sofort der Endzustand (UI-Plan 4.7, Motion-Prinzip 6).
 * `reducedMotion="user"` schaltet nur Transform und Layout ab; gezogene Striche (`pathLength`),
 * Unschärfe und `useAnimate` liefen weiter. `skipAnimations` setzt alle motion-Werte sofort.
 * CSS-Animationen bleiben unberührt: Das Aufleuchten nach einem Schritt ist keine Bewegung.
 *
 * Gesetzt beim Laden des Moduls statt in einem Effekt: Effekte der Kinder laufen vor denen des
 * Providers, die ersten Animationen wären sonst schon gestartet.
 */
if (typeof window !== 'undefined') {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');
  const apply = () => {
    MotionGlobalConfig.skipAnimations = query.matches;
  };
  apply();
  query.addEventListener('change', apply);
}

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
