import { describe, expect, it } from 'vitest';
import { relativeTime } from '@/lib/utils/relative-time';

const now = new Date('2026-09-30T12:00:00Z');
const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000);

describe('relativeTime', () => {
  it('nennt die größte passende Einheit', () => {
    expect(relativeTime(ago(2 * 3600), now, 'de')).toBe('vor 2 Stunden');
    expect(relativeTime(ago(24 * 3600), now, 'de')).toBe('gestern');
    expect(relativeTime(ago(3 * 60), now, 'en')).toBe('3 minutes ago');
  });

  it('sagt unter einer Minute „jetzt“', () => {
    expect(relativeTime(ago(20), now, 'de')).toBe('jetzt');
  });
});
