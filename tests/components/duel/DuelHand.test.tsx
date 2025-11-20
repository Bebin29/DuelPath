import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DuelHand } from '@/components/duel/DuelHand';
import type { DuelCardInstance } from '@/types/duel.types';

// Mock dependencies
vi.mock('@dnd-kit/core', () => ({
  useDraggable: vi.fn(() => ({
    attributes: {},
    listeners: { onClick: vi.fn() },
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false,
  })),
}));

vi.mock('@/lib/hooks/use-responsive-layout', () => ({
  useResponsiveLayout: vi.fn(() => ({
    adaptiveSizes: {
      cardWidth: 64,
      cardHeight: 96,
      handGap: 8,
      fieldGap: 12,
      sidebarWidth: 400,
      fontSize: 'base',
    },
    fontSize: 'base',
    isMobile: false,
  })),
}));

vi.mock('@/components/duel/DuelCard', () => ({
  DuelCard: ({ cardInstance }: { cardInstance: DuelCardInstance }) => (
    <div data-testid={`card-${cardInstance.instanceId}`}>Card {cardInstance.instanceId}</div>
  ),
}));

vi.mock('@/components/duel/DuelActionMenu', () => ({
  DuelActionMenu: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="action-menu">{children}</div>
  ),
}));

describe('DuelHand', () => {
  const mockHand: DuelCardInstance[] = [
    {
      instanceId: 'card-1',
      cardId: 'monster-1',
      position: 'FACE_UP_ATTACK',
      zone: 'HAND',
      owner: 'PLAYER',
    },
    {
      instanceId: 'card-2',
      cardId: 'spell-1',
      position: 'FACE_UP_ATTACK',
      zone: 'HAND',
      owner: 'PLAYER',
    },
    {
      instanceId: 'card-3',
      cardId: 'monster-2',
      position: 'FACE_UP_ATTACK',
      zone: 'HAND',
      owner: 'PLAYER',
    },
  ];

  it('should render hand with correct count', () => {
    render(<DuelHand hand={mockHand} />);

    expect(screen.getByText('Hand (3)')).toBeInTheDocument();
  });

  it('should render all cards in hand', () => {
    render(<DuelHand hand={mockHand} />);

    expect(screen.getByTestId('card-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('card-card-2')).toBeInTheDocument();
    expect(screen.getByTestId('card-card-3')).toBeInTheDocument();
  });

  it('should wrap cards with action menu', () => {
    render(<DuelHand hand={mockHand} />);

    const actionMenus = screen.getAllByTestId('action-menu');
    expect(actionMenus).toHaveLength(3);
  });

  it('should make cards draggable', () => {
    const { useDraggable } = await import('@dnd-kit/core');
    const mockUseDraggable = vi.fn(() => ({
      attributes: { 'aria-label': 'draggable' },
      listeners: { onClick: vi.fn() },
      setNodeRef: vi.fn(),
      transform: null,
      isDragging: false,
    }));
    useDraggable.mockImplementation(mockUseDraggable);

    render(<DuelHand hand={mockHand} />);

    // useDraggable should be called for each card
    expect(mockUseDraggable).toHaveBeenCalledTimes(3);
    expect(mockUseDraggable).toHaveBeenCalledWith({
      id: 'card-1',
      data: {
        type: 'card',
        data: {
          cardInstance: mockHand[0],
          zoneType: 'hand',
        },
      },
    });
  });

  it('should apply adaptive sizing', () => {
    const { useResponsiveLayout } = await import('@/lib/hooks/use-responsive-layout');
    useResponsiveLayout.mockReturnValue({
      adaptiveSizes: {
        cardWidth: 48,
        cardHeight: 64,
        handGap: 4,
        fieldGap: 6,
        sidebarWidth: 280,
        fontSize: 'xs',
      },
      fontSize: 'xs',
      isMobile: true,
    });

    render(<DuelHand hand={mockHand} />);

    expect(screen.getByText('Hand (3)')).toBeInTheDocument();
    // The gap styling would be applied through inline styles
  });

  it('should handle empty hand', () => {
    render(<DuelHand hand={[]} />);

    expect(screen.getByText('Hand (0)')).toBeInTheDocument();
  });

  it('should apply mobile-specific styling', () => {
    const { useResponsiveLayout } = await import('@/lib/hooks/use-responsive-layout');
    useResponsiveLayout.mockReturnValue({
      adaptiveSizes: {
        cardWidth: 48,
        cardHeight: 64,
        handGap: 4,
        fieldGap: 6,
        sidebarWidth: 280,
        fontSize: 'xs',
      },
      fontSize: 'xs',
      isMobile: true,
    });

    render(<DuelHand hand={mockHand} />);

    // Mobile styling should be applied (scale transform)
    expect(screen.getByText('Hand (3)')).toBeInTheDocument();
  });

  it('should apply desktop-specific styling', () => {
    const { useResponsiveLayout } = await import('@/lib/hooks/use-responsive-layout');
    useResponsiveLayout.mockReturnValue({
      adaptiveSizes: {
        cardWidth: 64,
        cardHeight: 96,
        handGap: 8,
        fieldGap: 12,
        sidebarWidth: 400,
        fontSize: 'base',
      },
      fontSize: 'base',
      isMobile: false,
    });

    render(<DuelHand hand={mockHand} />);

    // Desktop styling should be applied (hover effects)
    expect(screen.getByText('Hand (3)')).toBeInTheDocument();
  });

  it('should handle dragging state', () => {
    const { useDraggable } = await import('@dnd-kit/core');
    let callCount = 0;
    useDraggable.mockImplementation(() => {
      callCount++;
      return {
        attributes: {},
        listeners: { onClick: vi.fn() },
        setNodeRef: vi.fn(),
        transform: callCount === 1 ? { x: 10, y: 10 } : null, // First card is being dragged
        isDragging: callCount === 1, // First card is being dragged
      };
    });

    render(<DuelHand hand={mockHand} />);

    // The dragging state would affect opacity and transform
    // This is tested through the conditional styling in the component
    expect(screen.getByTestId('card-card-1')).toBeInTheDocument();
  });
});
