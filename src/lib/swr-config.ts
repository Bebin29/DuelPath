import { SWRConfiguration } from 'swr';

/**
 * SWR-Konfiguration für die gesamte App
 */
export const swrConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 5000, // 5 Sekunden Request-Deduplizierung
  focusThrottleInterval: 5000,
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  shouldRetryOnError: true,
};
