import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OddsSummary, ratioStats } from '@/components/decks/odds-ui';
import type { Roles } from '@/lib/deck/roles';

const counts = new Map([
  ['starter', 3],
  ['filler', 37],
]);
const stats = (roles: Roles) => ratioStats(counts, roles, new Map(), [], 'first');

describe('OddsSummary', () => {
  it('zeigt ohne Starter einen Hinweis statt „100 % Brick“', () => {
    const now = stats({});
    render(<OddsSummary now={now} before={now} going="first" />);
    expect(screen.getByText(/Noch keine Karte ist als Starter markiert/)).toBeInTheDocument();
    expect(screen.queryByText('Brick')).not.toBeInTheDocument();
  });

  it('zeigt die Stufen, sobald eine Karte Starter ist', () => {
    const now = stats({ starter: 'starter' });
    render(<OddsSummary now={now} before={now} going="first" />);
    expect(screen.getAllByText('Brick').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Noch keine Karte ist als Starter markiert/)).not.toBeInTheDocument();
  });
});
