import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResponsiveLayout } from '@/lib/hooks/use-responsive-layout';

// Mock window.innerWidth/innerHeight
const mockInnerWidth = vi.fn();
const mockInnerHeight = vi.fn();

Object.defineProperty(window, 'innerWidth', {
  get: mockInnerWidth,
});

Object.defineProperty(window, 'innerHeight', {
  get: mockInnerHeight,
});

describe('useResponsiveLayout', () => {
  beforeEach(() => {
    mockInnerWidth.mockReturnValue(1024);
    mockInnerHeight.mockReturnValue(768);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return correct viewport info for desktop', () => {
    mockInnerWidth.mockReturnValue(1024);
    mockInnerHeight.mockReturnValue(768);

    const { result } = renderHook(() => useResponsiveLayout());

    expect(result.current.width).toBe(1024);
    expect(result.current.height).toBe(768);
    expect(result.current.size).toBe('desktop');
    expect(result.current.isDesktop).toBe(true);
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isLarge).toBe(false);
  });

  it('should return correct viewport info for mobile', () => {
    mockInnerWidth.mockReturnValue(375);
    mockInnerHeight.mockReturnValue(667);

    const { result } = renderHook(() => useResponsiveLayout());

    expect(result.current.width).toBe(375);
    expect(result.current.height).toBe(667);
    expect(result.current.size).toBe('mobile');
    expect(result.current.isMobile).toBe(true);
    expect(result.current.isDesktop).toBe(false);
  });

  it('should return correct viewport info for tablet', () => {
    mockInnerWidth.mockReturnValue(768);
    mockInnerHeight.mockReturnValue(1024);

    const { result } = renderHook(() => useResponsiveLayout());

    expect(result.current.width).toBe(768);
    expect(result.current.height).toBe(1024);
    expect(result.current.size).toBe('tablet');
    expect(result.current.isTablet).toBe(true);
  });

  it('should return correct viewport info for large desktop', () => {
    mockInnerWidth.mockReturnValue(1440);
    mockInnerHeight.mockReturnValue(900);

    const { result } = renderHook(() => useResponsiveLayout());

    expect(result.current.width).toBe(1440);
    expect(result.current.height).toBe(900);
    expect(result.current.size).toBe('large');
    expect(result.current.isLarge).toBe(true);
  });

  it('should provide correct adaptive sizes for mobile', () => {
    mockInnerWidth.mockReturnValue(375);

    const { result } = renderHook(() => useResponsiveLayout());

    expect(result.current.adaptiveSizes).toEqual({
      cardWidth: 48,
      cardHeight: 64,
      handGap: 4,
      fieldGap: 6,
      sidebarWidth: 280,
      fontSize: 'xs',
    });
  });

  it('should provide correct adaptive sizes for desktop', () => {
    mockInnerWidth.mockReturnValue(1024);

    const { result } = renderHook(() => useResponsiveLayout());

    expect(result.current.adaptiveSizes).toEqual({
      cardWidth: 64,
      cardHeight: 96,
      handGap: 8,
      fieldGap: 12,
      sidebarWidth: 400,
      fontSize: 'base',
    });
  });

  it('should provide correct adaptive sizes for large desktop', () => {
    mockInnerWidth.mockReturnValue(1440);

    const { result } = renderHook(() => useResponsiveLayout());

    expect(result.current.adaptiveSizes).toEqual({
      cardWidth: 80,
      cardHeight: 112,
      handGap: 12,
      fieldGap: 16,
      sidebarWidth: 480,
      fontSize: 'lg',
    });
  });

  it('should update on window resize', () => {
    mockInnerWidth.mockReturnValue(1024);

    const { result } = renderHook(() => useResponsiveLayout());

    expect(result.current.size).toBe('desktop');

    // Simulate window resize
    act(() => {
      mockInnerWidth.mockReturnValue(375);
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current.size).toBe('mobile');
  });
});
