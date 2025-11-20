/**
 * Query Performance Monitoring
 *
 * Erfasst langsame Datenbank-Queries und API-Aufrufe
 */

interface QueryMetric {
  query: string;
  duration: number;
  timestamp: number;
  type: 'database' | 'api';
  error?: string;
}

const SLOW_QUERY_THRESHOLD = 1000; // 1 Sekunde
const queryMetrics: QueryMetric[] = [];

/**
 * Erfasst eine Query-Metrik
 */
export function recordQuery(
  query: string,
  duration: number,
  type: 'database' | 'api' = 'api',
  error?: string
): void {
  const metric: QueryMetric = {
    query,
    duration,
    timestamp: Date.now(),
    type,
    error,
  };

  queryMetrics.push(metric);

  // Behalte nur die letzten 100 Metriken im Speicher
  if (queryMetrics.length > 100) {
    queryMetrics.shift();
  }

  // Warnung bei langsamen Queries
  if (duration > SLOW_QUERY_THRESHOLD) {
    console.warn(`[Slow Query] ${type}:`, {
      query: query.substring(0, 100),
      duration: duration.toFixed(2) + 'ms',
      error,
    });
  }

  // In Production: Sende langsame Queries an Backend
  if (process.env.NODE_ENV === 'production' && duration > SLOW_QUERY_THRESHOLD) {
    // fetch('/api/monitoring/slow-queries', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(metric),
    // }).catch(() => {});
  }
}

/**
 * Wrapper für async Funktionen um Performance zu messen
 */
export async function measureQuery<T>(
  queryName: string,
  queryFn: () => Promise<T>,
  type: 'database' | 'api' = 'api'
): Promise<T> {
  const startTime = performance.now();

  try {
    const result = await queryFn();
    const duration = performance.now() - startTime;
    recordQuery(queryName, duration, type);
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    recordQuery(
      queryName,
      duration,
      type,
      error instanceof Error ? error.message : 'Unknown error'
    );
    throw error;
  }
}

/**
 * Gibt alle gesammelten Query-Metriken zurück
 */
export function getQueryMetrics(): QueryMetric[] {
  return [...queryMetrics];
}

/**
 * Gibt Statistiken über Query-Performance zurück
 */
export function getQueryStats(): {
  total: number;
  slow: number;
  averageDuration: number;
  slowestQueries: QueryMetric[];
} {
  const slow = queryMetrics.filter((m) => m.duration > SLOW_QUERY_THRESHOLD);
  const averageDuration =
    queryMetrics.length > 0
      ? queryMetrics.reduce((sum, m) => sum + m.duration, 0) / queryMetrics.length
      : 0;
  const slowestQueries = [...queryMetrics].sort((a, b) => b.duration - a.duration).slice(0, 10);

  return {
    total: queryMetrics.length,
    slow: slow.length,
    averageDuration,
    slowestQueries,
  };
}

/**
 * Leert gesammelte Metriken
 */
export function clearQueryMetrics(): void {
  queryMetrics.length = 0;
}
