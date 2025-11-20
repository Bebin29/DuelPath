/**
 * TypeScript-Typen für Theme-Konfiguration
 */

import type { DuelPathColorName, ThemeVariant } from '@/lib/utils/colors';

/**
 * Farbname-Union-Type
 */
export type { DuelPathColorName, ThemeVariant };

/**
 * Theme-Konfiguration
 */
export interface ThemeConfig {
  /** Aktuelle Theme-Variante */
  variant: ThemeVariant;

  /** Primärfarbe */
  primary: DuelPathColorName;

  /** Sekundärfarbe */
  secondary: DuelPathColorName;
}

/**
 * CSS-Variable-Namen für Theme-Tokens
 */
export type ThemeToken =
  | 'primary'
  | 'secondary'
  | 'accent'
  | 'background'
  | 'foreground'
  | 'muted'
  | 'muted-foreground'
  | 'card'
  | 'card-foreground'
  | 'popover'
  | 'popover-foreground'
  | 'border'
  | 'input'
  | 'ring'
  | 'destructive'
  | 'destructive-foreground';
