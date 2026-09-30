import { PATTERNS, detectPatterns, type PatternKey } from '@/lib/rulings/mechanics';

/**
 * Zerlegt einen englischen TCG-Kartentext (PSCT) in einzelne Effekte und ordnet OPT-Klauseln zu.
 * Heuristik nach docs/research/rulings.md, Abschnitt 7. Unsichere Fälle setzen `needsReview`.
 */

export interface EffectOpt {
  kind: 'SOFT' | 'HARD';
  /** use = "use this effect", activate = "activate this effect", activateCard = "activate 1 X per turn", shared = ein Zähler für mehrere Effekte */
  wording: 'use' | 'activate' | 'activateCard' | 'apply' | 'shared';
  per: 'turn' | 'duel';
  limit: number;
  /** Gemeinsamer Zähler, wenn mehrere Effekte dieselbe Klausel teilen */
  group?: string;
}

export interface CardEffect {
  index: number;
  section?: 'pendulum' | 'monster';
  text: string;
  /** Aktivierter Effekt (Chain Link); sonst Continuous Effect, Beschwörungsbedingung o. ä. */
  activated: boolean;
  opt?: EffectOpt;
  /** Erkannte Muster ohne die OPT-Klauseln, die in `opt` stehen */
  patterns: PatternKey[];
}

export interface ParsedEffects {
  effects: CardEffect[];
  /** Muster, die für die ganze Karte gelten, z. B. OPT_SUMMON_NAME */
  cardPatterns: PatternKey[];
  materials?: string;
  needsReview: boolean;
  reviewReasons: string[];
}

export interface CardInfo {
  name: string;
  /** YGOPRODeck-Feld `type`, z. B. "Effect Monster", "Spell Card", "Link Monster" */
  type: string;
  /** YGOPRODeck-Feld `race`; bei Spell/Trap die Unterart, z. B. "Quick-Play" */
  race?: string | null;
}

const EXTRA_DECK = /Fusion|Synchro|XYZ|Link/;
/** Spell/Trap-Unterarten, deren Kartenaktivierung selbst der erste Effekt ist */
const ACTIVATES_AS_CARD = new Set(['Normal', 'Quick-Play', 'Ritual', 'Counter']);
/** OPT-Klauseln, die als eigener Satz stehen und sich auf andere Effekte beziehen */
const CLAUSE_KEYS = [
  'OPT_USE_THIS',
  'OPT_USE_EACH',
  'OPT_USE_SHARED',
  'OPT_USE_NTH',
  'OPT_ACTIVATE_CARD',
  'OPT_ACTIVATE_CARD2',
  'OPT_ACTIVATE_EFFECT',
  'OPT_APPLY',
  'OPT_USE_CARD',
  'OPT_SUMMON_NAME',
  'OPT_GAIN',
  'OPT_NO_SAME_CHAIN',
] as const satisfies readonly PatternKey[];
function isClause(sentence: string): boolean {
  return (
    /^\(?You can only |cannot activate more than 1/.test(sentence) &&
    CLAUSE_KEYS.some((k) => PATTERNS[k].test(sentence))
  );
}

export function parseEffects(desc: string, card: CardInfo): ParsedEffects {
  const text = desc.replace(/\r\n?/g, '\n').replace(/[“”]/g, '"');
  const result: ParsedEffects = {
    effects: [],
    cardPatterns: [],
    needsReview: false,
    reviewReasons: [],
  };
  const review = (reason: string) => {
    result.needsReview = true;
    if (!result.reviewReasons.includes(reason)) result.reviewReasons.push(reason);
  };

  const isNormalMonster = /Normal/.test(card.type) && /Monster/.test(card.type);
  const isSpellTrap = /Spell|Trap/.test(card.type);

  for (const { section, body } of splitSections(text)) {
    // Normal-Monster (auch Pendel-Normal im Monster-Abschnitt) haben nur Flavor Text
    if (isNormalMonster && section !== 'pendulum') continue;

    const lines = body
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    // Materialzeile von Extra-Deck-Monstern; sie endet nie mit einem Punkt.
    // Einige Karten trennen Materialien und ersten Effekt mit " / " statt Zeilenumbruch.
    if (section !== 'pendulum' && EXTRA_DECK.test(card.type) && lines[0]) {
      const [head, ...tail] = lines[0].split(' / ');
      if (tail.length > 0 && !head.includes('.')) {
        result.materials = head;
        lines[0] = tail.join(' / ');
      } else if (!lines[0].endsWith('.')) {
        result.materials = lines.shift();
      }
    }

    const sentences = joinBullets(lines).flatMap(splitSentences);
    const sectionEffects: CardEffect[] = [];
    const clauses: Clause[] = [];

    for (const raw of sentences) {
      const sentence = raw.replace(/^●\s*/, '');
      if (isClause(sentence)) {
        clauses.push({ text: sentence, position: sectionEffects.length });
        continue;
      }
      const effect: CardEffect = {
        index: result.effects.length + sectionEffects.length,
        ...(section && { section }),
        text: sentence,
        activated: hasChainMarker(sentence),
        patterns: detectPatterns(sentence).filter((k) => !k.startsWith('OPT_')),
      };
      if (PATTERNS.OPT_SOFT.test(sentence) || PATTERNS.OPT_SOFT_OPP.test(sentence)) {
        effect.opt = { kind: 'SOFT', wording: 'use', per: 'turn', limit: 1 };
      }
      sectionEffects.push(effect);
    }

    // Kartenaktivierung von Normal/Quick-Play/Ritual Spell und Normal/Counter Trap ist immer ein Chain Link
    if (isSpellTrap && sectionEffects[0] && ACTIVATES_AS_CARD.has(card.race ?? '')) {
      sectionEffects[0].activated = true;
    }

    for (const clause of clauses) assignClause(clause, sectionEffects, result, review, card);
    result.effects.push(...sectionEffects);
  }

  const hasEffectText = !isNormalMonster || /\[ ?Pendulum Effect/.test(text);
  const onlyMaterials = result.materials !== undefined && text.trim() === result.materials;
  if (hasEffectText && result.effects.length === 0 && text.trim() && !onlyMaterials) {
    review('keine Effekte erkannt');
  }
  if (!isNormalMonster && !result.effects.some((e) => e.activated) && /\bYou can\b/.test(text)) {
    review('"You can" ohne Doppelpunkt/Semikolon (alter Kartentext?)');
  }
  return result;
}

function splitSections(text: string): { section?: 'pendulum' | 'monster'; body: string }[] {
  const pendulum = text.match(
    /\[ ?Pendulum Effect ?\]([\s\S]*?)(?=\[ ?(?:Monster Effect|Flavor Text) ?\]|$)/
  );
  if (!pendulum) return [{ body: text }];
  const monster = text.match(/\[ ?(Monster Effect|Flavor Text) ?\]([\s\S]*)$/);
  const clean = (s: string) => s.replace(/^-{5,}$/gm, '');
  return [
    { section: 'pendulum', body: clean(pendulum[1]) },
    // Flavor Text eines Pendel-Normal-Monsters enthält keine Effekte
    ...(monster && monster[1] === 'Monster Effect'
      ? [{ section: 'monster' as const, body: clean(monster[2]) }]
      : []),
  ];
}

/**
 * Aufzählungszeilen (●) sind Unteroptionen des vorherigen Satzes (Ash Blossom).
 * Folgt die Aufzählung auf eine OPT-Klausel ("each of the following effects"), ist jeder Punkt ein eigener Effekt.
 */
function joinBullets(lines: string[]): string[] {
  const out: string[] = [];
  let listOfEffects = false;
  for (const line of lines) {
    if (!line.startsWith('●')) {
      listOfEffects = isClause(splitSentences(line).at(-1) ?? '');
      out.push(line);
    } else if (listOfEffects || out.length === 0) {
      out.push(line);
    } else {
      out[out.length - 1] += ' ' + line;
    }
  }
  return out;
}

/**
 * Trennt an Satzenden außerhalb von Anführungszeichen und Klammern.
 * Kartennamen wie "D.D. Crow" bleiben so zusammen; "(... "X".)" endet nach der Klammer.
 */
export function splitSentences(paragraph: string): string[] {
  const sentences: string[] = [];
  let inQuote = false;
  let depth = 0;
  let start = 0;
  for (let i = 0; i < paragraph.length; i++) {
    const ch = paragraph[i];
    if (ch === '"') inQuote = !inQuote;
    else if (!inQuote && ch === '(') depth++;
    else if (!inQuote && ch === ')') depth = Math.max(0, depth - 1);

    if (!inQuote && depth === 0 && (ch === '.' || (ch === ')' && paragraph[i - 1] === '.'))) {
      const after = paragraph.slice(i + 1);
      const next = after.trimStart()[0];
      if (after.length > after.trimStart().length && next && /[A-Z("]/.test(next)) {
        sentences.push(paragraph.slice(start, i + 1).trim());
        start = i + 1;
      }
    }
  }
  const rest = paragraph.slice(start).trim();
  if (rest) sentences.push(rest);
  return sentences;
}

/** Doppelpunkt oder Semikolon außerhalb von Anführungszeichen markiert einen aktivierten Effekt */
function hasChainMarker(sentence: string): boolean {
  let inQuote = false;
  for (const ch of sentence) {
    if (ch === '"') inQuote = !inQuote;
    else if (!inQuote && (ch === ':' || ch === ';')) return true;
  }
  return false;
}

const ORDINALS: Record<string, number> = {
  '1st': 0,
  first: 0,
  '2nd': 1,
  second: 1,
  '3rd': 2,
  third: 2,
};

interface Clause {
  text: string;
  /** Anzahl der Effekte im Abschnitt vor der Klausel */
  position: number;
}

function assignClause(
  { text: clause, position }: Clause,
  effects: CardEffect[],
  result: ParsedEffects,
  review: (reason: string) => void,
  card: CardInfo
) {
  const activated = effects.filter((e) => e.activated);
  const before = activated.filter((e) => effects.indexOf(e) < position);
  const after = activated.filter((e) => effects.indexOf(e) >= position);
  const per = (m: RegExpMatchArray | null, group: number) =>
    m?.[group] === 'Duel' ? ('duel' as const) : ('turn' as const);
  const set = (targets: (CardEffect | undefined)[], opt: EffectOpt) => {
    if (targets.length === 0 || targets.some((t) => !t)) {
      review(`OPT-Klausel ohne passenden Effekt: ${clause}`);
      return;
    }
    for (const t of targets as CardEffect[]) {
      if (t.opt?.kind === 'HARD') review('mehrere Hard-OPT-Klauseln für denselben Effekt');
      t.opt = opt;
    }
  };
  /** "this effect": der direkt vorangehende aktivierte Effekt; bei altem Kartentext ohne ":"/";" der vorangehende Effekt */
  const thisEffect = () => {
    const target = before.at(-1);
    if (target) return target;
    const fallback = effects[position - 1];
    if (fallback) review('OPT-Klausel bezieht sich auf einen Effekt ohne Doppelpunkt/Semikolon');
    return fallback;
  };

  let m: RegExpMatchArray | null;
  if ((m = clause.match(PATTERNS.OPT_USE_THIS))) {
    const limit = { once: 1, twice: 2, thrice: 3 }[m[2] as 'once' | 'twice' | 'thrice'];
    set([thisEffect()], { kind: 'HARD', wording: 'use', per: per(m, 3), limit });
  } else if ((m = clause.match(PATTERNS.OPT_USE_NTH))) {
    const word = clause.match(/the (\w+) effect/)?.[1] ?? '';
    const target =
      word in ORDINALS ? activated[ORDINALS[word]] : word === 'following' ? after[0] : thisEffect();
    set([target], { kind: 'HARD', wording: 'use', per: 'turn', limit: 1 });
  } else if ((m = clause.match(PATTERNS.OPT_USE_EACH))) {
    set(activated, { kind: 'HARD', wording: 'use', per: per(m, 2), limit: 1 });
  } else if (
    (m = clause.match(PATTERNS.OPT_USE_SHARED)) ||
    (m = clause.match(PATTERNS.OPT_USE_CARD))
  ) {
    set(activated, { kind: 'HARD', wording: 'shared', per: 'turn', limit: 1, group: m[1] });
  } else if ((m = clause.match(PATTERNS.OPT_ACTIVATE_EFFECT))) {
    const targets = /each effect/.test(clause) ? activated : [thisEffect()];
    set(targets, { kind: 'HARD', wording: 'activate', per: 'turn', limit: 1 });
  } else if (
    (m = clause.match(PATTERNS.OPT_ACTIVATE_CARD)) ||
    (m = clause.match(PATTERNS.OPT_ACTIVATE_CARD2))
  ) {
    if (/Spell|Trap/.test(card.type) && ACTIVATES_AS_CARD.has(card.race ?? '')) {
      // Die Kartenaktivierung ist der erste Effekt
      set([activated[0]], { kind: 'HARD', wording: 'activateCard', per: per(m, 2), limit: 1 });
    } else {
      // Continuous/Field/Equip und Monster: begrenzt die Kartenaktivierung selbst, nicht einen Effekt
      result.cardPatterns.push('OPT_ACTIVATE_CARD');
    }
  } else if ((m = clause.match(PATTERNS.OPT_APPLY))) {
    set([effects[position - 1]], { kind: 'HARD', wording: 'apply', per: per(m, 2), limit: 1 });
  } else if (PATTERNS.OPT_SUMMON_NAME.test(clause)) {
    result.cardPatterns.push('OPT_SUMMON_NAME');
  } else if (PATTERNS.OPT_NO_SAME_CHAIN.test(clause)) {
    result.cardPatterns.push('OPT_NO_SAME_CHAIN');
  } else if (PATTERNS.OPT_GAIN.test(clause)) {
    result.cardPatterns.push('OPT_GAIN');
  }
}
