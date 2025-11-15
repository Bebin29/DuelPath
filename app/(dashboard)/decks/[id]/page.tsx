"use client";

import { use } from "react";
import { DeckEditor } from "@/components/deck/DeckEditor";
import { DeckErrorBoundary } from "@/components/deck/DeckErrorBoundary";

interface DeckEditorPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Deck-Editor Seite
 */
export default function DeckEditorPage({ params }: DeckEditorPageProps) {
  const { id } = use(params);

  return (
    <div className="container mx-auto px-4 py-8">
      <DeckErrorBoundary deckId={id}>
        <DeckEditor deckId={id} />
      </DeckErrorBoundary>
    </div>
  );
}



