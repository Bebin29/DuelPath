import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CardView } from '@/components/cards/CardView';

const IMG = '/api/card-images/62962630_small.jpg';

describe('CardView', () => {
  it('hat einen zugänglichen Namen und die Größe aus UI-Plan 5.1', () => {
    render(<CardView image={IMG} label="Aluber, Monsterzone 3, Angriff" />);
    const card = screen.getByRole('img', { name: 'Aluber, Monsterzone 3, Angriff' });
    expect(card.style.width).toBe('56px');
    expect(card.style.height).toBe('82px');
  });

  it('zeigt gegnerische gesetzte Karten nur als Rückseite', () => {
    const { container } = render(<CardView image={IMG} label="gesetzt" faceDown="opponent" />);
    expect(container.querySelector('img')).toBeNull();
  });

  it('nutzt für den Inspector das volle Bild', () => {
    const { container } = render(<CardView image={IMG} label="groß" size="xl" />);
    expect(container.querySelector('img')?.getAttribute('src')).toBe(
      '/api/card-images/62962630.jpg'
    );
  });

  it('zeigt Plaketten erst ab Board-Größe', () => {
    const { rerender } = render(<CardView image={IMG} label="klein" size="sm" chainLink={2} />);
    expect(screen.queryByText('CL2')).toBeNull();
    rerender(<CardView image={IMG} label="board" size="board" chainLink={2} />);
    expect(screen.getByText('CL2')).toBeTruthy();
  });
});
