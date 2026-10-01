'use server';

import { auth } from '@/lib/auth/auth';
import { isJevConfigured } from '@/server/jev';
import { rateCandidates } from '@/server/services/suggestion.service';
import { suggestionInputSchema } from '@/lib/validations/combo.schema';
import type { SuggestionInput } from '@/lib/combo/suggestions';

type Result<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

/** Jev-Bewertung der Kandidaten eines Knotens; ohne API-Key gibt es schlicht keine Vorschläge */
export async function suggestEffects(
  input: SuggestionInput
): Promise<Result<{ probabilities: number[]; cached: boolean }>> {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Unauthorized' };
  if (!isJevConfigured()) return { error: 'Jev ist nicht konfiguriert' };

  const parsed = suggestionInputSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Ungültige Daten' };

  try {
    const { probabilities, cached } = await rateCandidates(parsed.data);
    return { data: { probabilities, cached } };
  } catch (error) {
    console.error('Jev suggestion failed:', error);
    return { error: 'Jev-Anfrage fehlgeschlagen' };
  }
}
