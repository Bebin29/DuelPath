'use client';

import { useEffect, type ReactNode } from 'react';
import { reportWebVitals } from '@/lib/monitoring/web-vitals';

interface PerformanceProviderProps {
  children: ReactNode;
}

/**
 * Provider für Performance-Monitoring
 *
 * Initialisiert Web Vitals und andere Performance-Tracking
 */
export function PerformanceProvider({ children }: PerformanceProviderProps) {
  useEffect(() => {
    // Initialisiere Web Vitals Monitoring
    reportWebVitals((metric) => {
      // Optional: Custom Handler für Web Vitals
      // z.B. für benutzerdefinierte Analytics
    });
  }, []);

  return <>{children}</>;
}
