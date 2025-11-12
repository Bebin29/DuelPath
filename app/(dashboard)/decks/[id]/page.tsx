"use client";

import { use } from "react";
import { DeckEditor } from "@/components/deck/DeckEditor";

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
      <DeckEditor deckId={id} />
    </div>
  );
}

