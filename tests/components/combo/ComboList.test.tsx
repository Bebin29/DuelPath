/**
 * Component Tests für ComboList
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComboList } from '@/components/combo/ComboList';

// Mock useTranslation
vi.mock('@/lib/i18n/hooks', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock useToast
vi.mock('@/components/components/ui/toast', () => ({
  useToast: () => ({
    addToast: vi.fn(),
  }),
}));

// Mock SWR
vi.mock('swr', () => ({
  default: vi.fn(() => ({
    data: {
      success: true,
      combos: [
        {
          id: 'combo-1',
          title: 'Test Combo 1',
          description: 'Description 1',
          steps: [{ order: 1 }],
        },
        {
          id: 'combo-2',
          title: 'Test Combo 2',
          description: 'Description 2',
          steps: [{ order: 1 }, { order: 2 }],
        },
      ],
    },
    error: null,
    isLoading: false,
    mutate: vi.fn(),
  })),
}));

// Mock deleteCombo
vi.mock('@/server/actions/combo.actions', () => ({
  deleteCombo: vi.fn().mockResolvedValue({ success: true }),
  getCombosByUser: vi.fn(),
}));

describe('ComboList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rendert Liste von Kombos', () => {
    render(<ComboList />);

    expect(screen.getByText('Test Combo 1')).toBeInTheDocument();
    expect(screen.getByText('Test Combo 2')).toBeInTheDocument();
  });

  it('zeigt leere Nachricht wenn keine Kombos vorhanden', () => {
    const useSWR = await import('swr');
    vi.mocked(useSWR.default).mockReturnValue({
      data: { success: true, combos: [] },
      error: null,
      isLoading: false,
      mutate: vi.fn(),
    } as ReturnType<typeof useSWR>);

    render(<ComboList />);

    expect(screen.getByText(/Keine Kombos|No combos/i)).toBeInTheDocument();
  });

  it('zeigt Loading-State', () => {
    const useSWR = await import('swr');
    vi.mocked(useSWR.default).mockReturnValue({
      data: undefined,
      error: null,
      isLoading: true,
      mutate: vi.fn(),
    } as ReturnType<typeof useSWR>);

    render(<ComboList />);

    expect(screen.getByText(/Laden|Loading/i)).toBeInTheDocument();
  });
});
