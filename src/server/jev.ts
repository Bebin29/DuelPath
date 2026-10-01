/**
 * Jev (TypeSafe) über die OpenRouter Decisions API
 *
 * Jev beantwortet typisierte Fragen zu einem Zustand und liefert Wahrscheinlichkeiten statt Text.
 * Alle Jev-Aufrufe laufen über diese Datei; der API-Key bleibt auf dem Server.
 */

const ENDPOINT = 'https://openrouter.ai/api/alpha/decisions';
/** Fest gepinnt, damit sich das Verhalten nicht unbemerkt ändert; per JEV_MODEL überschreibbar */
const DEFAULT_MODEL = 'typesafe/jev-1.13-20260917';

export interface NoulQuestion {
  type: 'noul';
  instructions: string;
  criteria: { true: string; false: string };
}

export interface ChoiceQuestion {
  type: 'choice';
  instructions: string;
  criteria: Record<string, string>;
}

export type Question = NoulQuestion | ChoiceQuestion;

export interface NoulAnswer {
  type: 'noul';
  noul: number;
}

export interface ChoiceAnswer {
  type: 'choice';
  choice: string;
  confidence?: number;
  probabilities?: Record<string, number>;
}

type AnswerFor<Q extends Question> = Q extends NoulQuestion ? NoulAnswer : ChoiceAnswer;

export interface Decision<Q extends Record<string, Question>> {
  answers: { [K in keyof Q]: AnswerFor<Q[K]> };
  model: string;
  cost: number;
}

/** Verwendetes Modell, auch Teil des Cache-Schlüssels */
export function jevModel(): string {
  return process.env.JEV_MODEL || DEFAULT_MODEL;
}

export function isJevConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export async function decide<Q extends Record<string, Question>>(
  state: unknown,
  questions: Q
): Promise<Decision<Q>> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY ist nicht gesetzt');

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: jevModel(), state, questions }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`Jev request failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
  }

  const json = (await res.json()) as {
    model: string;
    answers: Decision<Q>['answers'];
    usage?: { cost?: number };
  };
  return { answers: json.answers, model: json.model, cost: json.usage?.cost ?? 0 };
}
