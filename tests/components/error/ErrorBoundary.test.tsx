/**
 * Unit-Tests für ErrorBoundary Komponente
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";

// Komponente die einen Fehler wirft
function ThrowError({ shouldThrow = false }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error("Test error");
  }
  return <div>No error</div>;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    // Unterdrücke console.error für Tests
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("sollte Kinder rendern wenn kein Fehler", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText("No error")).toBeInTheDocument();
  });

  it("sollte Fallback-UI anzeigen wenn Fehler auftritt", () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Ein Fehler ist aufgetreten/i)).toBeInTheDocument();
  });

  it("sollte custom Fallback-UI verwenden wenn bereitgestellt", () => {
    const customFallback = <div>Custom Error Message</div>;
    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Custom Error Message")).toBeInTheDocument();
  });

  it("sollte Error-Logging aufrufen", () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalled();
    expect(onError.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it("sollte Retry-Button anzeigen bei retry-fähigen Fehlern", () => {
    function ThrowNetworkError() {
      throw new Error("NetworkError");
    }

    render(
      <ErrorBoundary>
        <ThrowNetworkError />
      </ErrorBoundary>
    );

    expect(screen.getByText(/Erneut versuchen/i)).toBeInTheDocument();
  });
});

