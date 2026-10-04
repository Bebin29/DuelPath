import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DeinTisch } from '@/components/start/DeinTisch';

const row = (over: Partial<Parameters<typeof DeinTisch>[0]['rows'][number]>) => ({
  id: 'd1',
  name: 'Branded',
  combos: [],
  record: { win: 0, loss: 0, draw: 0, total: 0 },
  ...over,
});

describe('DeinTisch', () => {
  it('nennt Combos, Turnierreife und die Bilanz als rohe Zahlen', () => {
    render(
      <DeinTisch
        rows={[
          row({
            combos: [
              { id: 'c1', title: 'A', status: 'TOURNAMENT' },
              { id: 'c2', title: 'B', status: 'DRAFT' },
            ],
            record: { win: 7, loss: 3, draw: 0, total: 10 },
          }),
        ]}
      />
    );
    expect(screen.getByRole('link', { name: /Branded/ })).toHaveTextContent(
      '2 Combos · 1 turnierfest · 7 Siege · 3 Niederlagen'
    );
    expect(screen.queryByText(/Unentschieden/)).not.toBeInTheDocument();
  });

  it('sagt ohne Combos und Spiele, was fehlt', () => {
    render(<DeinTisch rows={[row({})]} />);
    expect(screen.getByRole('link', { name: /Branded/ })).toHaveTextContent(
      'noch keine Combo · noch keine Spiele eingetragen'
    );
  });
});
