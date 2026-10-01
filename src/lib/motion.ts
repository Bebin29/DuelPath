/**
 * Bewegungs-Tokens (UI-Plan 4.7, design/motion/shared/helpers.js): dieselben Kurven, Federn und
 * Dauern wie in den Motion-Szenen, damit App und Prototypen gleich wirken.
 */
export const EASE = {
  smooth: [0.2, 0, 0, 1],
  out: [0.16, 1, 0.3, 1],
  ink: [0.65, 0, 0.35, 1],
  bounce: [0.34, 1.36, 0.64, 1],
} as const;

export const SPRING = {
  /** Karte rastet in der Zone ein */
  card: { type: 'spring', bounce: 0.28, visualDuration: 0.32 },
  soft: { type: 'spring', bounce: 0, visualDuration: 0.3 },
  snappy: { type: 'spring', bounce: 0.15, visualDuration: 0.2 },
} as const;

/** Sekunden */
export const DUR = { fast: 0.1, base: 0.15, slow: 0.24, flash: 0.6, draw: 0.5 } as const;

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
