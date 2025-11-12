import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/src/components/components/ui/button';

/**
 * Tests für die Button-Komponente
 */
describe('Button', () => {
  it('rendert einen Button mit Text', () => {
    render(<Button>Klick mich</Button>);
    const button = screen.getByRole('button', { name: /klick mich/i });
    expect(button).toBeInTheDocument();
  });

  it('ruft onClick-Handler auf, wenn geklickt', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>Klick mich</Button>);
    const button = screen.getByRole('button', { name: /klick mich/i });

    await user.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('ist deaktiviert, wenn disabled prop gesetzt ist', () => {
    render(<Button disabled>Deaktiviert</Button>);
    const button = screen.getByRole('button', { name: /deaktiviert/i });
    expect(button).toBeDisabled();
  });

  it('wendet Varianten-Klassen korrekt an', () => {
    const { container } = render(<Button variant="destructive">Löschen</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveClass('bg-destructive');
  });

  it('wendet Size-Klassen korrekt an', () => {
    const { container } = render(<Button size="lg">Großer Button</Button>);
    const button = container.querySelector('button');
    expect(button).toHaveClass('h-10');
  });
});

