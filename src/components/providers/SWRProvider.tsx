"use client";

import { SWRConfig } from "swr";
import { swrConfig } from "@/lib/swr-config";

/**
 * SWR Provider für Request-Caching und Deduplizierung
 */
export function SWRProvider({ children }: { children: React.ReactNode }) {
  return <SWRConfig value={swrConfig}>{children}</SWRConfig>;
}



