/**
 * React Profiler Integration
 * 
 * Erfasst Performance-Daten von React-Komponenten
 */

import { ProfilerOnRenderCallback } from "react";

export interface ProfilerData {
  id: string;
  phase: "mount" | "update";
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
}

/**
 * Callback für React Profiler
 */
export const onRenderCallback: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime
) => {
  const profilerData: ProfilerData = {
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime,
  };

  // Logge langsame Komponenten (mehr als 16ms = 1 Frame bei 60fps)
  if (actualDuration > 16) {
    console.warn(`[React Profiler] Slow component: ${id}`, {
      phase,
      actualDuration: actualDuration.toFixed(2),
      baseDuration: baseDuration.toFixed(2),
      overhead: ((actualDuration / baseDuration - 1) * 100).toFixed(1) + "%",
    });
  }

  // In Production: Sende an Analytics
  if (process.env.NODE_ENV === "production" && actualDuration > 50) {
    // Nur sehr langsame Komponenten tracken
    // fetch('/api/analytics/react-profiler', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(profilerData),
    // }).catch(() => {});
  }
};

/**
 * Wrapper-Komponente für Profiler
 * 
 * Verwendung:
 * <ProfilerWrapper id="DeckEditor">
 *   <DeckEditor />
 * </ProfilerWrapper>
 */
import { Profiler, type ReactNode } from "react";

interface ProfilerWrapperProps {
  id: string;
  children: ReactNode;
  enabled?: boolean;
}

export function ProfilerWrapper({ id, children, enabled = true }: ProfilerWrapperProps) {
  if (!enabled || process.env.NODE_ENV === "production") {
    return <>{children}</>;
  }

  return (
    <Profiler id={id} onRender={onRenderCallback}>
      {children}
    </Profiler>
  );
}

