import { describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';

// Die Einstellungen hängen über eine Server Action an NextAuth, das im Test nicht lädt
vi.mock('@/components/providers/SettingsProvider', () => ({
  useCardLanguage: () => 'en',
  useSettings: () => ({ settings: {}, update: () => {} }),
}));

import { LineList } from '@/components/workbench/LineList';
import type { LineStep } from '@/lib/combo/lines';
import type { ComboNodeData } from '@/lib/combo/state';

const node = (id: string, extra: Partial<ComboNodeData> = {}): ComboNodeData => ({
  id,
  parentId: null,
  kind: 'ACTION',
  player: 'self',
  ...extra,
});

const step = (id: string, number: number, branches: LineStep['branches'] = []): LineStep => ({
  node: node(id),
  number,
  chainDepth: 0,
  branches,
});

const base = {
  title: 'Hauptline',
  selectedId: 'a',
  startSelected: false,
  alternatives: [],
  cards: new Map(),
  labelOf: (n: ComboNodeData) => n.id,
  cardOf: () => null,
  warningsOf: () => 0,
  onSelect: () => {},
  onSelectStart: () => {},
};

describe('LineList', () => {
  it('zeigt die Schrittzahl der Line im Kopf', () => {
    render(<LineList {...base} steps={[step('a', 1), step('b', 2), step('c', 3)]} />);
    expect(screen.getByText('3 Schritte')).toBeTruthy();
  });

  it('zählt einen einzelnen Schritt im Singular', () => {
    render(<LineList {...base} steps={[step('a', 1)]} />);
    expect(screen.getByText('1 Schritt')).toBeTruthy();
  });

  it('zeigt die Schrittzahl auch an jedem Branch', () => {
    render(
      <LineList
        {...base}
        steps={[step('a', 1, [{ nodeId: 'ash', letter: 'B', label: 'Ash Blossom' }])]}
        stepCountOf={(nodeId) => (nodeId === 'ash' ? 7 : 0)}
      />
    );
    expect(screen.getByTitle('7 Schritte').textContent).toContain('7');
  });

  it('lässt dem laufenden Stresstest die Zeile im Kopf', async () => {
    vi.useFakeTimers();
    try {
      render(
        <LineList
          {...base}
          steps={[step('a', 1), step('b', 2)]}
          chokes={{
            byStep: new Map(),
            run: 1,
            imageOf: () => null,
            describe: () => '',
            onPick: () => {},
            onHover: () => {},
            onDismiss: () => {},
          }}
        />
      );
      await act(async () => {
        vi.advanceTimersByTime(140);
      });
      expect(screen.queryByText('2 Schritte')).toBeNull();
      expect(screen.getByText(/Stresstest/)).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });
});
