import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { DuelBoard } from "@/components/duel/DuelBoard";
import type { DuelState } from "@/types/duel.types";

// Mock all dependencies
vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/lib/hooks/use-duel-state", () => ({
  useDuelState: vi.fn(() => ({
    state: {
      turnPlayer: "PLAYER",
      phase: "MAIN1",
      turnCount: 1,
      player: {
        lp: 8000,
        hand: [],
        monsterZone: Array(5).fill(null),
        spellTrapZone: Array(5).fill(null),
        graveyard: [],
        deck: [],
        extraDeck: [],
      },
      opponent: {
        lp: 8000,
        hand: [],
        monsterZone: Array(5).fill(null),
        spellTrapZone: Array(5).fill(null),
        graveyard: [],
        deck: [],
        extraDeck: [],
      },
      normalSummonUsedThisTurn: false,
      duelEnded: false,
    },
    dispatchDuelAction: vi.fn(),
    availableActions: vi.fn(() => []),
    currentHand: [],
    currentField: {
      monsterZone: Array(5).fill(null),
      spellTrapZone: Array(5).fill(null),
      fieldSpell: null,
    },
    startDuel: vi.fn(),
    resetDuel: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: false,
    canRedo: false,
    getRecentErrors: vi.fn(() => []),
    clearErrors: vi.fn(),
  })),
}));

vi.mock("@/lib/hooks/use-duel-history", () => ({
  useDuelHistory: vi.fn(() => ({
    addHistoryEntry: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: false,
    canRedo: false,
  })),
}));

vi.mock("@/lib/hooks/use-keyboard-shortcuts", () => ({
  useKeyboardShortcuts: vi.fn(),
}));

vi.mock("@/lib/hooks/use-responsive-layout", () => ({
  useResponsiveLayout: vi.fn(() => ({
    adaptiveSizes: {
      cardWidth: 64,
      cardHeight: 96,
      handGap: 8,
      fieldGap: 12,
      sidebarWidth: 400,
      fontSize: "base",
    },
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isLarge: false,
    width: 1024,
    height: 768,
    size: "desktop",
  })),
}));

vi.mock("@/lib/hooks/use-touch-gestures", () => ({
  useTouchGestures: vi.fn(() => ({
    attachListeners: vi.fn(() => vi.fn()),
  })),
}));

vi.mock("@/lib/hooks/use-duel-drag-drop", () => ({
  useDuelDragDrop: vi.fn(() => ({
    handleDragStart: vi.fn(),
    handleDragOver: vi.fn(),
    handleDragEnd: vi.fn(),
  })),
}));

vi.mock("@/components/duel/DuelField", () => ({
  DuelField: ({ player }: { player: string }) => <div data-testid={`duel-field-${player.toLowerCase()}`}>DuelField {player}</div>,
}));

vi.mock("@/components/duel/DuelHand", () => ({
  DuelHand: () => <div data-testid="duel-hand">DuelHand</div>,
}));

vi.mock("@/components/duel/DuelPhaseController", () => ({
  DuelPhaseController: () => <div data-testid="phase-controller">PhaseController</div>,
}));

vi.mock("@/components/duel/DuelLifePoints", () => ({
  DuelLifePoints: () => <div data-testid="life-points">LifePoints</div>,
}));

vi.mock("@/components/duel/DuelLog", () => ({
  DuelLog: () => <div data-testid="duel-log">DuelLog</div>,
}));

vi.mock("@/components/duel/SaveDuelAsComboDialog", () => ({
  SaveDuelAsComboDialog: () => <div data-testid="save-dialog">SaveDialog</div>,
}));

vi.mock("@/lib/i18n/hooks", () => ({
  useTranslation: vi.fn(() => ({
    t: (key: string) => key,
  })),
}));

vi.mock("@/components/components/ui/toast", () => ({
  useToast: vi.fn(() => ({
    addToast: vi.fn(),
  })),
}));

vi.mock("@/components/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("DuelBoard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render duel board with all components", () => {
    render(<DuelBoard />);

    expect(screen.getByTestId("duel-field-opponent")).toBeInTheDocument();
    expect(screen.getByTestId("duel-field-player")).toBeInTheDocument();
    expect(screen.getByTestId("duel-hand")).toBeInTheDocument();
  });

  it("should show desktop layout with sidebar", () => {
    const { useResponsiveLayout } = await import("@/lib/hooks/use-responsive-layout");
    useResponsiveLayout.mockReturnValue({
      adaptiveSizes: {
        cardWidth: 64,
        cardHeight: 96,
        handGap: 8,
        fieldGap: 12,
        sidebarWidth: 400,
        fontSize: "base",
      },
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isLarge: false,
      width: 1024,
      height: 768,
      size: "desktop",
    });

    render(<DuelBoard />);

    expect(screen.getByTestId("phase-controller")).toBeInTheDocument();
    expect(screen.getByTestId("life-points")).toBeInTheDocument();
    expect(screen.getByTestId("duel-log")).toBeInTheDocument();
  });

  it("should show mobile layout hint", () => {
    const { useResponsiveLayout } = await import("@/lib/hooks/use-responsive-layout");
    useResponsiveLayout.mockReturnValue({
      adaptiveSizes: {
        cardWidth: 48,
        cardHeight: 64,
        handGap: 4,
        fieldGap: 6,
        sidebarWidth: 280,
        fontSize: "xs",
      },
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      isLarge: false,
      width: 375,
      height: 667,
      size: "mobile",
    });

    render(<DuelBoard />);

    expect(screen.getByText(/swipe left\/right to change phases/i)).toBeInTheDocument();
    expect(screen.getByText(/drag cards to zones/i)).toBeInTheDocument();
  });

  it("should handle touch gestures on mobile", () => {
    const { useTouchGestures } = await import("@/lib/hooks/use-touch-gestures");
    const attachListeners = vi.fn(() => vi.fn());
    useTouchGestures.mockReturnValue({ attachListeners });

    const { useResponsiveLayout } = await import("@/lib/hooks/use-responsive-layout");
    useResponsiveLayout.mockReturnValue({
      adaptiveSizes: {
        cardWidth: 48,
        cardHeight: 64,
        handGap: 4,
        fieldGap: 6,
        sidebarWidth: 280,
        fontSize: "xs",
      },
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      isLarge: false,
      width: 375,
      height: 667,
      size: "mobile",
    });

    render(<DuelBoard />);

    expect(attachListeners).toHaveBeenCalled();
  });

  it("should show mobile action buttons", () => {
    const { useResponsiveLayout } = await import("@/lib/hooks/use-responsive-layout");
    useResponsiveLayout.mockReturnValue({
      adaptiveSizes: {
        cardWidth: 48,
        cardHeight: 64,
        handGap: 4,
        fieldGap: 6,
        sidebarWidth: 280,
        fontSize: "xs",
      },
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      isLarge: false,
      width: 375,
      height: 667,
      size: "mobile",
    });

    render(<DuelBoard />);

    expect(screen.getAllByText("common.undo").length).toBeGreaterThan(0);
    expect(screen.getAllByText("common.redo").length).toBeGreaterThan(0);
    expect(screen.getAllByText("duel.saveAsCombo").length).toBeGreaterThan(0);
  });

  it("should show desktop action buttons", () => {
    const { useResponsiveLayout } = await import("@/lib/hooks/use-responsive-layout");
    useResponsiveLayout.mockReturnValue({
      adaptiveSizes: {
        cardWidth: 64,
        cardHeight: 96,
        handGap: 8,
        fieldGap: 12,
        sidebarWidth: 400,
        fontSize: "base",
      },
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isLarge: false,
      width: 1024,
      height: 768,
      size: "desktop",
    });

    render(<DuelBoard />);

    expect(screen.getByText("common.undo")).toBeInTheDocument();
    expect(screen.getByText("common.redo")).toBeInTheDocument();
    expect(screen.getByText("duel.saveAsCombo")).toBeInTheDocument();
  });

  it("should show 'no duel active' when state is null", () => {
    const { useDuelState } = await import("@/lib/hooks/use-duel-state");
    useDuelState.mockReturnValue({
      state: null,
      dispatchDuelAction: vi.fn(),
      availableActions: vi.fn(() => []),
      currentHand: [],
      currentField: {
        monsterZone: Array(5).fill(null),
        spellTrapZone: Array(5).fill(null),
        fieldSpell: null,
      },
      startDuel: vi.fn(),
      resetDuel: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
      canUndo: false,
      canRedo: false,
      getRecentErrors: vi.fn(() => []),
      clearErrors: vi.fn(),
    });

    render(<DuelBoard />);

    expect(screen.getByText("Kein Duell aktiv")).toBeInTheDocument();
  });

  it("should initialize drag and drop context", () => {
    const { DndContext } = await import("@dnd-kit/core");
    const mockDndContext = vi.fn(({ children }) => <div data-testid="dnd-context">{children}</div>);
    DndContext.mockImplementation(mockDndContext);

    render(<DuelBoard />);

    expect(screen.getByTestId("dnd-context")).toBeInTheDocument();
  });

  it("should handle keyboard shortcuts", () => {
    const { useKeyboardShortcuts } = await import("@/lib/hooks/use-keyboard-shortcuts");
    const mockKeyboardShortcuts = vi.fn();
    useKeyboardShortcuts.mockImplementation(mockKeyboardShortcuts);

    render(<DuelBoard />);

    expect(mockKeyboardShortcuts).toHaveBeenCalledWith({
      shortcuts: expect.arrayContaining([
        expect.objectContaining({ key: " " }),
        expect.objectContaining({ key: "z", ctrl: true }),
      ]),
    });
  });
});
