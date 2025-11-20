'use client';

import { useTranslation } from '@/lib/i18n/hooks';
import { CreateDeckDialog } from '@/components/deck/CreateDeckDialog';
import { DeckList } from '@/components/deck/DeckList';

/**
 * Deck-Verwaltungsseite
 */
export default function DecksPage() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">{t('deck.myDecks')}</h1>
          <p className="text-muted-foreground">Verwalte deine Yu-Gi-Oh! Decks</p>
        </div>
        <CreateDeckDialog />
      </div>

      <DeckList />
    </div>
  );
}
