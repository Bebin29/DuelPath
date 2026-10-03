import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BanlistBar } from '@/components/decks/BanlistBar';
import type { Banlists } from '@/lib/deck/banlist';

const banlists: Banlists = {
  current: { key: 'current', name: 'TCG', effectiveOn: '2026-09-15', changes: {} },
  next: {
    key: 'next',
    name: 'Oktober 2026',
    effectiveOn: '2026-10-20',
    changes: { '1': 'Limited' },
  },
};

describe('BanlistBar', () => {
  it('nennt den Stand der gewählten Liste', () => {
    const { rerender } = render(
      <BanlistBar banlists={banlists} value="current" onChange={vi.fn()} issues={1} />
    );
    expect(screen.getByText(/15\.09\.2026|Sep.*15.*2026/)).toBeInTheDocument();

    rerender(<BanlistBar banlists={banlists} value="next" onChange={vi.fn()} issues={1} />);
    expect(screen.getByText(/20\.10\.2026|Oct.*20.*2026/)).toBeInTheDocument();
  });

  it('schaltet auf die nächste Liste um', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BanlistBar banlists={banlists} value="current" onChange={onChange} issues={1} />);

    await user.click(screen.getByRole('radio', { name: 'Oktober 2026' }));
    expect(onChange).toHaveBeenCalledWith('next');
  });

  it('zeigt ohne zweite Liste keinen Umschalter', () => {
    render(
      <BanlistBar
        banlists={{ current: banlists.current, next: null }}
        value="current"
        onChange={vi.fn()}
        issues={0}
      />
    );
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
  });

  it('sagt es, wenn der Stand noch fehlt', () => {
    render(
      <BanlistBar
        banlists={{ current: null, next: null }}
        value="current"
        onChange={vi.fn()}
        issues={0}
      />
    );
    expect(screen.getByText(/unbekannt|unknown/i)).toBeInTheDocument();
  });

  it('zeigt den Abrufzeitpunkt nicht als Gültigkeitsdatum', () => {
    render(
      <BanlistBar
        banlists={{
          current: {
            key: 'current',
            name: 'TCG',
            effectiveOn: null,
            importedAt: '2026-10-03T12:00:00Z',
            changes: {},
          },
          next: null,
        }}
        value="current"
        onChange={vi.fn()}
        issues={0}
      />
    );
    expect(screen.getByText(/unbekannt|unknown/i)).toBeInTheDocument();
    expect(screen.queryByText(/03\.10\.2026|Oct.*3.*2026/)).not.toBeInTheDocument();
  });
});
