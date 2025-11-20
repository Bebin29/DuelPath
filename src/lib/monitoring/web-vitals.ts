/**
 * Web Vitals Monitoring
 *
 * Erfasst Core Web Vitals und andere Performance-Metriken
 */

export interface WebVitalsMetric {
  id: string;
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  navigationType: string;
}

/**
 * Schwellenwerte für Core Web Vitals (in Millisekunden)
 */
const VITALS_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint
  FID: { good: 100, poor: 300 }, // First Input Delay
  CLS: { good: 0.1, poor: 0.25 }, // Cumulative Layout Shift
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte
  INP: { good: 200, poor: 500 }, // Interaction to Next Paint
};

/**
 * Bewertet eine Metrik basierend auf Schwellenwerten
 */
function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = VITALS_THRESHOLDS[name as keyof typeof VITALS_THRESHOLDS];
  if (!thresholds) return 'good';

  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}

/**
 * Sendet Web Vitals an Analytics/Backend
 */
function sendToAnalytics(metric: WebVitalsMetric): void {
  // In Production: Sende an Analytics-Service (z.B. Google Analytics, Vercel Analytics)
  if (process.env.NODE_ENV === 'production') {
    // Beispiel: Google Analytics 4
    // gtag('event', metric.name, {
    //   value: Math.round(metric.value),
    //   metric_id: metric.id,
    //   metric_value: metric.value,
    //   metric_delta: metric.delta,
    // });
    // Beispiel: Vercel Analytics
    // if (typeof window !== 'undefined' && (window as any).va) {
    //   (window as any).va('track', metric.name, {
    //     value: metric.value,
    //     rating: metric.rating,
    //   });
    // }
    // Beispiel: Custom Backend
    // fetch('/api/analytics/web-vitals', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(metric),
    // }).catch(() => {
    //   // Ignore errors
    // });
  }

  // In Development: Logge zur Console
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${metric.name}:`, {
      value: metric.value.toFixed(2),
      rating: metric.rating,
      delta: metric.delta.toFixed(2),
    });
  }
}

/**
 * Initialisiert Web Vitals Monitoring
 */
export function reportWebVitals(onPerfEntry?: (metric: WebVitalsMetric) => void): void {
  if (typeof window === 'undefined') return;

  // Dynamisch importieren um Bundle-Größe zu reduzieren
  import('web-vitals')
    .then(({ onCLS, onFID, onFCP, onLCP, onTTFB, onINP }) => {
      const reportMetric = (metric: { id: string; name: string; value: number }) => {
        const webVitalsMetric: WebVitalsMetric = {
          id: metric.id,
          name: metric.name,
          value: metric.value,
          rating: getRating(metric.name, metric.value),
          delta: metric.delta,
          navigationType: metric.navigationType,
        };

        sendToAnalytics(webVitalsMetric);
        onPerfEntry?.(webVitalsMetric);
      };

      onCLS(reportMetric);
      onFID(reportMetric);
      onFCP(reportMetric);
      onLCP(reportMetric);
      onTTFB(reportMetric);
      onINP(reportMetric);
    })
    .catch((error) => {
      console.warn('Failed to load web-vitals:', error);
    });
}

/**
 * Erfasst Custom Performance-Metriken
 */
export function reportCustomMetric(name: string, value: number, unit: string = 'ms'): void {
  if (typeof window === 'undefined' || !('performance' in window)) return;

  try {
    const metric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
    };

    // Speichere in Performance API
    performance.mark(`${name}-start`);
    performance.measure(name, `${name}-start`);

    // Sende an Analytics
    if (process.env.NODE_ENV === 'production') {
      // fetch('/api/analytics/custom-metric', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(metric),
      // }).catch(() => {});
    } else {
      console.log(`[Custom Metric] ${name}:`, value, unit);
    }
  } catch (error) {
    console.warn('Failed to report custom metric:', error);
  }
}
