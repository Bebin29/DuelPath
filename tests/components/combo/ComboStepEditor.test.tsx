/**
 * Component Tests für ComboStepEditor
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComboStepEditor } from '@/components/combo/ComboStepEditor';
import type { CreateComboStepInput } from '@/lib/validations/combo.schema';

// Mock CardSearch
vi.mock('@/components/deck/CardSearch', () => ({
  CardSearch: ({ onCardSelect }: { onCardSelect?: (cardId: string) => void }) => (
    <div data-testid="card-search">
      <button onClick={() => onCardSelect?.('card-123')}>Select Card</button>
    </div>
  ),
}));

// Mock useCardCache
vi.mock('@/lib/hooks/use-card-cache', () => ({
  useCardCache: () => ({
    getCardData: vi.fn().mockResolvedValue({
      id: 'card-123',
      name: 'Test Card',
    }),
  }),
}));

describe('ComboStepEditor', () => {
  const mockOnSave = vi.fn();
  const mockOnOpenChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rendert den Dialog wenn open=true', () => {
    render(<ComboStepEditor open={true} onOpenChange={mockOnOpenChange} onSave={mockOnSave} />);

    expect(screen.getByText(/Schritt hinzufügen|Add Step/i)).toBeInTheDocument();
  });

  it('rendert nicht wenn open=false', () => {
    render(<ComboStepEditor open={false} onOpenChange={mockOnOpenChange} onSave={mockOnSave} />);

    expect(screen.queryByText(/Schritt hinzufügen|Add Step/i)).not.toBeInTheDocument();
  });

  it('zeigt initiale Step-Daten im Edit-Modus', () => {
    const initialStep = {
      cardId: 'card-123',
      actionType: 'SUMMON' as const,
      description: 'Test description',
      targetCardId: 'card-456',
      order: 1,
    };

    render(
      <ComboStepEditor
        open={true}
        onOpenChange={mockOnOpenChange}
        onSave={mockOnSave}
        initialStep={initialStep}
        mode="edit"
      />
    );

    expect(screen.getByText(/Schritt bearbeiten|Edit Step/i)).toBeInTheDocument();
  });

  it('ruft onSave auf wenn Speichern geklickt wird', async () => {
    const user = userEvent.setup();
    render(<ComboStepEditor open={true} onOpenChange={mockOnOpenChange} onSave={mockOnSave} />);

    // Wähle eine Karte
    const cardSearch = screen.getByTestId('card-search');
    const selectButton = cardSearch.querySelector('button');
    if (selectButton) {
      await user.click(selectButton);
    }

    // Klicke Speichern
    const saveButton = screen.getByRole('button', { name: /Speichern|Save/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  it('ruft onOpenChange auf wenn Abbrechen geklickt wird', async () => {
    const user = userEvent.setup();
    render(<ComboStepEditor open={true} onOpenChange={mockOnOpenChange} onSave={mockOnSave} />);

    const cancelButton = screen.getByRole('button', { name: /Abbrechen|Cancel/i });
    await user.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('deaktiviert Speichern-Button wenn keine Karte ausgewählt ist', () => {
    render(<ComboStepEditor open={true} onOpenChange={mockOnOpenChange} onSave={mockOnSave} />);

    const saveButton = screen.getByRole('button', { name: /Speichern|Save/i });
    expect(saveButton).toBeDisabled();
  });
});
