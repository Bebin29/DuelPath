'use server';

import { auth } from '@/lib/auth/auth';
import type { PracticeSetup } from '@/lib/deck/practice';
import { loadPracticeSetup } from '@/server/services/practice.service';

/** Deck und gespeicherte Lines für einen Übungslauf (Lücke L2) */
export async function getPracticeSetup(deckId: string): Promise<PracticeSetup | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  return loadPracticeSetup(userId, deckId);
}
