import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Die Einstellungen hängen über eine Server Action an NextAuth, das im Test nicht lädt
vi.mock('@/components/providers/SettingsProvider', () => ({
  useCardLanguage: () => 'en',
  useSettings: () => ({ settings: {}, update: () => {} }),
}));

import { CompareView, type CompareColumn } from '@/components/workbench/CompareView';
import type { EndboardSummary } from '@/lib/combo/endboard';

const summary = (interruptions: number): EndboardSummary => ({
  interruptions,
  field: [],
  hand: [],
  gyEffects: 0,
  normalSummonLeft: false,
  startHandUsed: 2,
  lp: 8000,
});

const column = (leafId: string, steps: number, interruptions: number): CompareColumn => ({
  leafId,
  title: leafId,
  summary: summary(interruptions),
  steps,
  missing: [],
});

describe('CompareView', () => {
  it('zeigt die Schrittzahl als eigene Zeile je Spalte', () => {
    render(
      <CompareView
        columns={[column('main', 23, 3), column('branch', 31, 4)]}
        cards={new Map()}
        onOpen={() => {}}
        onClose={() => {}}
      />
    );
    expect(screen.getAllByText('Schritte').length).toBe(2);
    // Jede Spalte erklärt die Zahl im Titel: eine Runde hat 50 Minuten
    expect(screen.getAllByTitle(/50 Minuten/).length).toBe(2);
  });

  it('kommt mit einer einzelnen Spalte aus', () => {
    render(
      <CompareView
        columns={[column('main', 23, 3)]}
        cards={new Map()}
        onOpen={() => {}}
        onClose={() => {}}
      />
    );
    expect(screen.getAllByText('Schritte').length).toBe(1);
  });
});
