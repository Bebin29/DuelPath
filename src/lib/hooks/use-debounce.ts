import { useEffect, useState } from "react";

/**
 * Hook zum Debouncing von Werten
 * 
 * @param value - Der zu debouncende Wert
 * @param delay - Verzögerung in Millisekunden (default: 300ms)
 * @returns Der debounced Wert
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}



