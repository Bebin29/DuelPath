import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDuelDragDrop } from '@/lib/hooks/use-duel-drag-drop';
import type { DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core';

// Mock useDuelState
vi.mock('@/lib/hooks/use-duel-state', () => ({
  useDuelState: vi.fn(() => ({
    state: {
      player: {
        monsterZone: Array(5).fill(null),
        spellTrapZone: Array(5).fill(null),
      },
    },
    dispatchDuelAction: vi.fn(),
  })),
}));

describe('useDuelDragDrop', () => {
  let dispatchDuelAction: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    dispatchDuelAction = vi.fn();
    const { useDuelState } = await import('@/lib/hooks/use-duel-state');
    useDuelState.mockReturnValue({
      state: {
        player: {
          monsterZone: Array(5).fill(null),
          spellTrapZone: Array(5).fill(null),
        },
      },
      dispatchDuelAction,
    });
  });

  it('should return drag handlers', () => {
    const { result } = renderHook(() => useDuelDragDrop());

    expect(result.current.handleDragStart).toBeInstanceOf(Function);
    expect(result.current.handleDragOver).toBeInstanceOf(Function);
    expect(result.current.handleDragEnd).toBeInstanceOf(Function);
  });

  it('should handle drag start with card data', () => {
    const { result } = renderHook(() => useDuelDragDrop());

    const mockEvent: DragStartEvent = {
      active: {
        id: 'card-1',
        data: {
          current: {
            type: 'card',
            data: {
              cardInstance: {
                instanceId: 'card-1',
                cardId: 'test-card',
                position: 'FACE_UP_ATTACK',
                zone: 'HAND',
                owner: 'PLAYER',
              },
              zoneType: 'hand',
            },
          },
        },
      },
    };

    result.current.handleDragStart(mockEvent);

    // Should not throw and cursor should be set to grabbing
    expect(document.body.style.cursor).toBe('grabbing');
  });

  it('should handle drag over', () => {
    const { result } = renderHook(() => useDuelDragDrop());

    const mockEvent: DragOverEvent = {
      active: {
        id: 'card-1',
        data: {
          current: {
            type: 'card',
            data: {
              cardInstance: {
                instanceId: 'card-1',
                cardId: 'test-card',
                position: 'FACE_UP_ATTACK',
                zone: 'HAND',
                owner: 'PLAYER',
              },
              zoneType: 'hand',
            },
          },
        },
      },
      over: {
        id: 'monster-zone-0',
        data: {
          current: {
            type: 'zone',
          },
        },
      },
    };

    expect(() => result.current.handleDragOver(mockEvent)).not.toThrow();
  });

  it('should dispatch NORMAL_SUMMON action for monster zone drop', () => {
    const { result } = renderHook(() => useDuelDragDrop());

    const mockEvent: DragEndEvent = {
      active: {
        id: 'card-1',
        data: {
          current: {
            type: 'card',
            data: {
              cardInstance: {
                instanceId: 'card-1',
                cardId: 'test-card',
                position: 'FACE_UP_ATTACK',
                zone: 'HAND',
                owner: 'PLAYER',
              },
              zoneType: 'hand',
            },
          },
        },
      },
      over: {
        id: 'monster-zone-0',
        data: {
          current: {
            type: 'zone',
          },
        },
      },
    };

    result.current.handleDragEnd(mockEvent);

    expect(dispatchDuelAction).toHaveBeenCalledWith({
      type: 'NORMAL_SUMMON',
      player: 'PLAYER',
      cardInstanceId: 'card-1',
      targetZoneIndex: 0,
    });
  });

  it('should dispatch SET_SPELL action for spell trap zone drop', () => {
    const { result } = renderHook(() => useDuelDragDrop());

    const mockEvent: DragEndEvent = {
      active: {
        id: 'card-1',
        data: {
          current: {
            type: 'card',
            data: {
              cardInstance: {
                instanceId: 'card-1',
                cardId: 'test-card',
                position: 'FACE_UP_ATTACK',
                zone: 'HAND',
                owner: 'PLAYER',
              },
              zoneType: 'hand',
            },
          },
        },
      },
      over: {
        id: 'spell-trap-zone-2',
        data: {
          current: {
            type: 'zone',
          },
        },
      },
    };

    result.current.handleDragEnd(mockEvent);

    expect(dispatchDuelAction).toHaveBeenCalledWith({
      type: 'SET_SPELL',
      player: 'PLAYER',
      cardInstanceId: 'card-1',
      targetZoneIndex: 2,
    });
  });

  it('should not dispatch action for occupied zones', () => {
    const { useDuelState } = await import('@/lib/hooks/use-duel-state');
    useDuelState.mockReturnValue({
      state: {
        player: {
          monsterZone: [
            {
              instanceId: 'existing-card',
              cardId: 'existing',
              position: 'FACE_UP_ATTACK',
              zone: 'MONSTER_ZONE',
              owner: 'PLAYER',
            },
            ...Array(4).fill(null),
          ],
          spellTrapZone: Array(5).fill(null),
        },
      },
      dispatchDuelAction,
    });

    const { result } = renderHook(() => useDuelDragDrop());

    const mockEvent: DragEndEvent = {
      active: {
        id: 'card-1',
        data: {
          current: {
            type: 'card',
            data: {
              cardInstance: {
                instanceId: 'card-1',
                cardId: 'test-card',
                position: 'FACE_UP_ATTACK',
                zone: 'HAND',
                owner: 'PLAYER',
              },
              zoneType: 'hand',
            },
          },
        },
      },
      over: {
        id: 'monster-zone-0', // This zone is occupied
        data: {
          current: {
            type: 'zone',
          },
        },
      },
    };

    result.current.handleDragEnd(mockEvent);

    expect(dispatchDuelAction).not.toHaveBeenCalled();
  });

  it('should handle drag end without over target', () => {
    const { result } = renderHook(() => useDuelDragDrop());

    const mockEvent: DragEndEvent = {
      active: {
        id: 'card-1',
        data: {
          current: {
            type: 'card',
            data: {
              cardInstance: {
                instanceId: 'card-1',
                cardId: 'test-card',
                position: 'FACE_UP_ATTACK',
                zone: 'HAND',
                owner: 'PLAYER',
              },
              zoneType: 'hand',
            },
          },
        },
      },
      over: null,
    };

    expect(() => result.current.handleDragEnd(mockEvent)).not.toThrow();
    expect(dispatchDuelAction).not.toHaveBeenCalled();
  });

  it('should reset cursor on drag end', () => {
    const { result } = renderHook(() => useDuelDragDrop());

    // First set cursor to grabbing
    result.current.handleDragStart({
      active: {
        id: 'card-1',
        data: {
          current: {
            type: 'card',
            data: {
              cardInstance: {
                instanceId: 'card-1',
                cardId: 'test-card',
                position: 'FACE_UP_ATTACK',
                zone: 'HAND',
                owner: 'PLAYER',
              },
              zoneType: 'hand',
            },
          },
        },
      },
    });

    expect(document.body.style.cursor).toBe('grabbing');

    // Then reset on drag end
    result.current.handleDragEnd({
      active: { id: 'card-1' },
      over: null,
    });

    expect(document.body.style.cursor).toBe('');
  });
});
