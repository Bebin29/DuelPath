import { detectPatterns } from '@/lib/rulings/mechanics';
import type { CardEffect, EffectOpt, ParsedEffects } from '@/lib/cards/effects';

/**
 * Effekt-Korrektur (UX-Plan 8 und 16): eine von Hand geprüfte Zerlegung pro Karte.
 * Sie hat Vorrang vor der automatischen Zerlegung und bleibt beim Neuimport erhalten.
 */

export type OptKind = 'NONE' | 'SOFT' | 'HARD';

export interface EffectDraft {
  text: string;
  activated: boolean;
  opt: OptKind;
  /** Erkannte OPT-Klausel; bleibt erhalten, solange die Art nicht geändert wird */
  original?: EffectOpt;
  section?: CardEffect['section'];
}

/** Wirksame Effekte einer Karte: Korrektur vor Import */
export function effectsOf(row: { effects?: unknown; effectsOverride?: unknown }): CardEffect[] {
  if (Array.isArray(row.effectsOverride)) return row.effectsOverride as CardEffect[];
  const raw = row.effects as ParsedEffects | CardEffect[] | null | undefined;
  if (Array.isArray(raw)) return raw;
  return raw?.effects ?? [];
}

export function draftsOf(effects: CardEffect[]): EffectDraft[] {
  return effects.map((e) => ({
    text: e.text,
    activated: e.activated,
    opt: e.opt ? e.opt.kind : 'NONE',
    original: e.opt,
    section: e.section,
  }));
}

export function buildEffects(drafts: EffectDraft[]): CardEffect[] {
  return drafts
    .filter((d) => d.text.trim())
    .map((d, index) => {
      const text = d.text.trim();
      const opt: EffectOpt | undefined =
        d.opt === 'NONE'
          ? undefined
          : d.original?.kind === d.opt
            ? d.original
            : { kind: d.opt, wording: 'use', per: 'turn', limit: 1 };
      return {
        index,
        ...(d.section && { section: d.section }),
        text,
        activated: d.activated,
        ...(opt && { opt }),
        patterns: detectPatterns(text).filter((k) => !k.startsWith('OPT_')),
      };
    });
}

/** Teilt einen Effekt an der Schreibmarke in zwei */
export function splitDraft(drafts: EffectDraft[], index: number, at: number): EffectDraft[] {
  const d = drafts[index];
  const head = d.text.slice(0, at).trim();
  const tail = d.text.slice(at).trim();
  if (!head || !tail) return drafts;
  return [
    ...drafts.slice(0, index),
    { ...d, text: head },
    { ...d, text: tail, opt: 'NONE', original: undefined },
    ...drafts.slice(index + 1),
  ];
}

/** Legt einen Effekt mit dem folgenden zusammen */
export function mergeDraft(drafts: EffectDraft[], index: number): EffectDraft[] {
  const [a, b] = [drafts[index], drafts[index + 1]];
  if (!a || !b) return drafts;
  const merged: EffectDraft = {
    ...a,
    text: `${a.text.trim()} ${b.text.trim()}`,
    activated: a.activated || b.activated,
    opt: a.opt !== 'NONE' ? a.opt : b.opt,
    original: a.original ?? b.original,
  };
  return [...drafts.slice(0, index), merged, ...drafts.slice(index + 2)];
}
