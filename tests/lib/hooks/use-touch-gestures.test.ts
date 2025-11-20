import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTouchGestures } from '@/lib/hooks/use-touch-gestures';

describe('useTouchGestures', () => {
  let mockElement: HTMLElement;
  let touchStartCallback: () => void;
  let touchEndCallback: () => void;

  beforeEach(() => {
    mockElement = document.createElement('div');
    touchStartCallback = vi.fn();
    touchEndCallback = vi.fn();
  });

  it('should return attachListeners function', () => {
    const { result } = renderHook(() =>
      useTouchGestures({
        onSwipeLeft: touchStartCallback,
        onSwipeRight: touchEndCallback,
      })
    );

    expect(result.current.attachListeners).toBeInstanceOf(Function);
  });

  it('should attach touch event listeners to element', () => {
    const { result } = renderHook(() => useTouchGestures({}));

    const cleanup = result.current.attachListeners(mockElement);

    expect(mockElement).toHaveProperty('ontouchstart');
    expect(mockElement).toHaveProperty('ontouchmove');
    expect(mockElement).toHaveProperty('ontouchend');

    cleanup?.();
  });

  it('should detect swipe left gesture', () => {
    const onSwipeLeft = vi.fn();
    const { result } = renderHook(() =>
      useTouchGestures({
        onSwipeLeft,
        minSwipeDistance: 50,
      })
    );

    result.current.attachListeners(mockElement);

    // Simulate touch start
    const touchStartEvent = new TouchEvent('touchstart', {
      touches: [
        {
          clientX: 100,
          clientY: 100,
        } as Touch,
      ],
    });
    mockElement.dispatchEvent(touchStartEvent);

    // Simulate touch end (swipe left)
    const touchEndEvent = new TouchEvent('touchend', {
      changedTouches: [
        {
          clientX: 40, // Moved 60px left
          clientY: 100,
        } as Touch,
      ],
    });
    mockElement.dispatchEvent(touchEndEvent);

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
  });

  it('should detect swipe right gesture', () => {
    const onSwipeRight = vi.fn();
    const { result } = renderHook(() =>
      useTouchGestures({
        onSwipeRight,
        minSwipeDistance: 50,
      })
    );

    result.current.attachListeners(mockElement);

    // Simulate touch start
    const touchStartEvent = new TouchEvent('touchstart', {
      touches: [
        {
          clientX: 100,
          clientY: 100,
        } as Touch,
      ],
    });
    mockElement.dispatchEvent(touchStartEvent);

    // Simulate touch end (swipe right)
    const touchEndEvent = new TouchEvent('touchend', {
      changedTouches: [
        {
          clientX: 160, // Moved 60px right
          clientY: 100,
        } as Touch,
      ],
    });
    mockElement.dispatchEvent(touchEndEvent);

    expect(onSwipeRight).toHaveBeenCalledTimes(1);
  });

  it('should not trigger swipe for small movements', () => {
    const onSwipeLeft = vi.fn();
    const { result } = renderHook(() =>
      useTouchGestures({
        onSwipeLeft,
        minSwipeDistance: 50,
      })
    );

    result.current.attachListeners(mockElement);

    // Simulate touch start
    const touchStartEvent = new TouchEvent('touchstart', {
      touches: [
        {
          clientX: 100,
          clientY: 100,
        } as Touch,
      ],
    });
    mockElement.dispatchEvent(touchStartEvent);

    // Simulate touch end (small movement)
    const touchEndEvent = new TouchEvent('touchend', {
      changedTouches: [
        {
          clientX: 105, // Only 5px movement
          clientY: 100,
        } as Touch,
      ],
    });
    mockElement.dispatchEvent(touchEndEvent);

    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it('should ignore vertical swipes when horizontal offset is too large', () => {
    const onSwipeUp = vi.fn();
    const { result } = renderHook(() =>
      useTouchGestures({
        onSwipeUp,
        minSwipeDistance: 50,
        maxHorizontalOffset: 50,
      })
    );

    result.current.attachListeners(mockElement);

    // Simulate touch start
    const touchStartEvent = new TouchEvent('touchstart', {
      touches: [
        {
          clientX: 100,
          clientY: 100,
        } as Touch,
      ],
    });
    mockElement.dispatchEvent(touchStartEvent);

    // Simulate touch end (large vertical + horizontal movement)
    const touchEndEvent = new TouchEvent('touchend', {
      changedTouches: [
        {
          clientX: 160, // 60px horizontal
          clientY: 40, // 60px vertical
        } as Touch,
      ],
    });
    mockElement.dispatchEvent(touchEndEvent);

    expect(onSwipeUp).not.toHaveBeenCalled();
  });

  it('should handle rapid touch events', () => {
    const onSwipeLeft = vi.fn();
    const { result } = renderHook(() =>
      useTouchGestures({
        onSwipeLeft,
        minSwipeDistance: 50,
      })
    );

    result.current.attachListeners(mockElement);

    // Mehrere schnelle Touches
    for (let i = 0; i < 5; i++) {
      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [
          {
            clientX: 100 + i * 10,
            clientY: 100,
          } as Touch,
        ],
      });
      mockElement.dispatchEvent(touchStartEvent);

      const touchEndEvent = new TouchEvent('touchend', {
        changedTouches: [
          {
            clientX: 40 + i * 10,
            clientY: 100,
          } as Touch,
        ],
      });
      mockElement.dispatchEvent(touchEndEvent);
    }

    expect(onSwipeLeft).toHaveBeenCalledTimes(5);
  });

  it('should handle touch events with multiple fingers', () => {
    const onSwipeLeft = vi.fn();
    const { result } = renderHook(() =>
      useTouchGestures({
        onSwipeLeft,
        minSwipeDistance: 50,
      })
    );

    result.current.attachListeners(mockElement);

    // Multi-touch Event
    const touchStartEvent = new TouchEvent('touchstart', {
      touches: [
        { clientX: 100, clientY: 100 } as Touch,
        { clientX: 200, clientY: 100 } as Touch, // Zweiter Finger
      ],
    });
    mockElement.dispatchEvent(touchStartEvent);

    const touchEndEvent = new TouchEvent('touchend', {
      changedTouches: [
        {
          clientX: 40,
          clientY: 100,
        } as Touch,
      ],
    });
    mockElement.dispatchEvent(touchEndEvent);

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
  });

  it('should handle edge case: no touch start before touch end', () => {
    const onSwipeLeft = vi.fn();
    const { result } = renderHook(() =>
      useTouchGestures({
        onSwipeLeft,
      })
    );

    result.current.attachListeners(mockElement);

    const touchEndEvent = new TouchEvent('touchend', {
      changedTouches: [
        {
          clientX: 40,
          clientY: 100,
        } as Touch,
      ],
    });

    expect(() => mockElement.dispatchEvent(touchEndEvent)).not.toThrow();
    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it('should handle very small swipe distances at boundary', () => {
    const onSwipeLeft = vi.fn();
    const { result } = renderHook(() =>
      useTouchGestures({
        onSwipeLeft,
        minSwipeDistance: 50,
      })
    );

    result.current.attachListeners(mockElement);

    // Swipe genau an der Grenze
    const touchStartEvent = new TouchEvent('touchstart', {
      touches: [
        {
          clientX: 100,
          clientY: 100,
        } as Touch,
      ],
    });
    mockElement.dispatchEvent(touchStartEvent);

    const touchEndEvent = new TouchEvent('touchend', {
      changedTouches: [
        {
          clientX: 50, // Exakt 50px Swipe
          clientY: 100,
        } as Touch,
      ],
    });
    mockElement.dispatchEvent(touchEndEvent);

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
  });

  it('should handle cleanup properly', () => {
    const { result } = renderHook(() => useTouchGestures({}));

    const cleanup = result.current.attachListeners(mockElement);
    expect(typeof cleanup).toBe('function');

    cleanup?.();

    // Element sollte keine Event Listener mehr haben
    expect(mockElement.ontouchstart).toBeNull();
    expect(mockElement.ontouchmove).toBeNull();
    expect(mockElement.ontouchend).toBeNull();
  });

  it('should handle null element gracefully', () => {
    const { result } = renderHook(() =>
      useTouchGestures({
        onSwipeLeft: vi.fn(),
      })
    );

    const cleanup = result.current.attachListeners(null);
    expect(cleanup).toBeUndefined();
  });
});
