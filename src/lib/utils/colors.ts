/**
 * DuelPath Farbschema Konstanten
 * 
 * Diese Datei enthält die Hex-Werte des DuelPath-Farbschemas als TypeScript-Konstanten.
 * Die tatsächliche Farbdefinition erfolgt in CSS-Variablen (app/globals.css).
 * Diese Konstanten dienen als Referenz für TypeScript-Code.
 */

/**
 * DuelPath Farbschema - Hex-Werte
 */
export const DuelPathColors = {
  /** Primary: #194038 - Dunkelgrün */
  primary: "#194038",
  
  /** Secondary: #D9B473 - warmes Beige/Gold */
  secondary: "#D9B473",
  
  /** Accent: #734F43 - dunkles Braun */
  accent: "#734F43",
  
  /** Background: #EDD8A2 - helles Beige */
  background: "#EDD8A2",
  
  /** Muted: #8F9189 - neutrales Grau mit grünlichem Unterton */
  muted: "#8F9189",
} as const;

/**
 * Farbname-Union-Type
 */
export type DuelPathColorName = keyof typeof DuelPathColors;

/**
 * Theme-Varianten
 */
export type ThemeVariant = "light" | "dark";






