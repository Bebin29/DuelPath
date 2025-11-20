/**
 * Cache-Utilities für Client-seitiges Caching
 */

/**
 * ETag-basiertes Caching
 */
export function generateETag(content: string): string {
  // Einfache ETag-Generierung (in Production: verwende kryptographischen Hash)
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `"${hash.toString(16)}"`;
}

/**
 * Prüft ob ETag noch gültig ist
 */
export function isETagValid(etag: string, ifNoneMatch: string | null): boolean {
  if (!ifNoneMatch) return false;
  return ifNoneMatch.includes(etag);
}

/**
 * Cache-Control Header Parser
 */
export function parseCacheControl(header: string | null): {
  maxAge?: number;
  staleWhileRevalidate?: number;
  noCache?: boolean;
  noStore?: boolean;
  mustRevalidate?: boolean;
} {
  if (!header) return {};

  const directives: Record<string, string | boolean> = {};
  const parts = header.split(',').map((p) => p.trim());

  for (const part of parts) {
    if (part === 'no-cache' || part === 'no-store' || part === 'must-revalidate') {
      directives[part.replace('-', '')] = true;
    } else if (part.includes('=')) {
      const [key, value] = part.split('=').map((p) => p.trim());
      directives[key.replace('-', '')] = value;
    }
  }

  return {
    maxAge: directives.maxage ? parseInt(directives.maxage as string, 10) : undefined,
    staleWhileRevalidate: directives.stalewhilerevalidate
      ? parseInt(directives.stalewhilerevalidate as string, 10)
      : undefined,
    noCache: directives.nocache === true,
    noStore: directives.nostore === true,
    mustRevalidate: directives.mustrevalidate === true,
  };
}

/**
 * Berechnet Cache-Expiry-Zeit
 */
export function getCacheExpiry(maxAge: number): Date {
  return new Date(Date.now() + maxAge * 1000);
}

/**
 * Prüft ob Cache abgelaufen ist
 */
export function isCacheExpired(expiryDate: Date): boolean {
  return new Date() > expiryDate;
}
