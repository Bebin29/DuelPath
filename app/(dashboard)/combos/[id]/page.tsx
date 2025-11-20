'use client';

import { use } from 'react';
import { ComboEditor } from '@/components/combo/ComboEditor';
import { ComboErrorBoundary } from '@/components/error/ComboErrorBoundary';

interface ComboEditorPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Combo-Editor Seite
 */
export default function ComboEditorPage({ params }: ComboEditorPageProps) {
  const { id } = use(params);

  return (
    <div className="container mx-auto px-4 py-8">
      <ComboErrorBoundary comboId={id}>
        <ComboEditor comboId={id} />
      </ComboErrorBoundary>
    </div>
  );
}
