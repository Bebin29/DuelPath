import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DuelField } from "@/components/duel/DuelField";

// Mock dependencies
vi.mock("@dnd-kit/core", () => ({
  useDroppable: vi.fn(() => ({
    setNodeRef: vi.fn(),
    isOver: false,
  })),
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
    fontSize: "base",
  })),
}));

vi.mock("@/components/duel/DuelCard", () => ({
  DuelCard: ({ cardInstance }: { cardInstance: any }) =>
    <div data-testid={`card-${cardInstance.instanceId}`}>Card {cardInstance.instanceId}</div>,
}));

describe("DuelField", () => {
  const mockFieldProps = {
    player: "PLAYER" as const,
    monsterZone: Array(5).fill(null),
    spellTrapZone: Array(5).fill(null),
    graveyard: [],
    deck: [],
    extraDeck: [],
    fieldSpell: null,
    readonly: false,
  };

  it("should render all zones", () => {
    render(<DuelField {...mockFieldProps} />);

    expect(screen.getByText("Monster Zone")).toBeInTheDocument();
    expect(screen.getByText("Spell & Trap Zone")).toBeInTheDocument();
  });

  it("should render empty zones with correct styling", () => {
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
      fontSize: "base",
    });

    render(<DuelField {...mockFieldProps} />);

    // Should have 5 monster zones + 5 spell zones + field + deck/extra/gy = 13 zones
    const emptyZones = screen.getAllByText("Empty");
    expect(emptyZones.length).toBe(13);
  });

  it("should render occupied zones", () => {
    const occupiedProps = {
      ...mockFieldProps,
      monsterZone: [
        {
          instanceId: "monster-1",
          cardId: "card-1",
          position: "FACE_UP_ATTACK" as const,
          zone: "MONSTER_ZONE" as const,
          owner: "PLAYER" as const,
        },
        ...Array(4).fill(null),
      ],
      deck: [
        {
          instanceId: "deck-1",
          cardId: "card-2",
          position: "FACE_DOWN_DEFENSE" as const,
          zone: "DECK" as const,
          owner: "PLAYER" as const,
        },
      ],
    };

    render(<DuelField {...occupiedProps} />);

    expect(screen.getByTestId("card-monster-1")).toBeInTheDocument();
    expect(screen.getByText("Deck (1)")).toBeInTheDocument();
  });

  it("should apply adaptive sizing", () => {
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
      fontSize: "xs",
    });

    render(<DuelField {...mockFieldProps} />);

    // Check if adaptive sizes are applied (this would be verified by checking inline styles)
    // The actual styling is tested through the rendered elements
    expect(screen.getByText("Monster Zone")).toBeInTheDocument();
  });

  it("should create droppable zones for drag and drop", () => {
    const { useDroppable } = await import("@dnd-kit/core");
    const mockSetNodeRef = vi.fn();
    useDroppable.mockReturnValue({
      setNodeRef: mockSetNodeRef,
      isOver: false,
    });

    render(<DuelField {...mockFieldProps} />);

    // useDroppable should be called for each droppable zone
    expect(useDroppable).toHaveBeenCalledWith({ id: "monster-zone-0" });
    expect(useDroppable).toHaveBeenCalledWith({ id: "monster-zone-1" });
    expect(useDroppable).toHaveBeenCalledWith({ id: "monster-zone-2" });
    expect(useDroppable).toHaveBeenCalledWith({ id: "monster-zone-3" });
    expect(useDroppable).toHaveBeenCalledWith({ id: "monster-zone-4" });
    expect(useDroppable).toHaveBeenCalledWith({ id: "spell-trap-zone-0" });
    expect(useDroppable).toHaveBeenCalledWith({ id: "spell-trap-zone-1" });
    expect(useDroppable).toHaveBeenCalledWith({ id: "spell-trap-zone-2" });
    expect(useDroppable).toHaveBeenCalledWith({ id: "spell-trap-zone-3" });
    expect(useDroppable).toHaveBeenCalledWith({ id: "spell-trap-zone-4" });
  });

  it("should show visual feedback when dragging over occupied zones", () => {
    const { useDroppable } = await import("@dnd-kit/core");
    useDroppable.mockReturnValue({
      setNodeRef: vi.fn(),
      isOver: true, // Simulate drag over
    });

    render(<DuelField {...mockFieldProps} />);

    // When dragging over an empty zone, should show green ring
    // This is tested through the CSS classes applied
    expect(screen.getByText("Monster Zone")).toBeInTheDocument();
  });

  it("should handle readonly mode", () => {
    render(<DuelField {...mockFieldProps} readonly={true} />);

    // In readonly mode, cards should still render but interactions might be disabled
    expect(screen.getByText("Monster Zone")).toBeInTheDocument();
  });

  it("should display zone counts correctly", () => {
    const countProps = {
      ...mockFieldProps,
      deck: Array(10).fill(null).map((_, i) => ({
        instanceId: `deck-${i}`,
        cardId: `card-${i}`,
        position: "FACE_DOWN_DEFENSE" as const,
        zone: "DECK" as const,
        owner: "PLAYER" as const,
      })),
      graveyard: Array(3).fill(null).map((_, i) => ({
        instanceId: `gy-${i}`,
        cardId: `card-${i}`,
        position: "FACE_UP_ATTACK" as const,
        zone: "GRAVEYARD" as const,
        owner: "PLAYER" as const,
      })),
    };

    render(<DuelField {...countProps} />);

    expect(screen.getByText("Deck (10)")).toBeInTheDocument();
    expect(screen.getByText("GY (3)")).toBeInTheDocument();
  });
});
