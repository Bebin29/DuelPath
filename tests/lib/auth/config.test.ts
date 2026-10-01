import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authConfig } from '@/lib/auth/config';
import { prisma } from '@/lib/prisma/client';
import bcrypt from 'bcryptjs';

/**
 * Mock Prisma Client
 */
vi.mock('@/lib/prisma/client', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

type Authorize = (
  credentials: Record<string, unknown>
) => Promise<{ email?: string | null; name?: string | null } | null>;

/**
 * Credentials() legt die eigene authorize-Funktion unter `options` ab;
 * `provider.authorize` ist nur ein Platzhalter, der immer null liefert.
 */
function getAuthorize(): Authorize {
  const provider = authConfig.providers[0] as unknown as { options: { authorize: Authorize } };
  return provider.options.authorize;
}

/**
 * Tests für die Auth-Konfiguration
 */
describe('Auth Config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hat Credentials Provider konfiguriert', () => {
    expect(authConfig.providers).toBeDefined();
    expect(authConfig.providers.length).toBeGreaterThan(0);
  });

  it('validiert fehlende Credentials', async () => {
    const result = await getAuthorize()({ email: undefined, password: undefined });

    expect(result).toBeNull();
  });

  it('validiert nicht existierenden Benutzer', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const result = await getAuthorize()({
      email: 'nonexistent@test.com',
      password: 'password123',
    });

    expect(result).toBeNull();
  });

  it('validiert falsches Passwort', async () => {
    const hashedPassword = await bcrypt.hash('correctPassword', 10);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: '1',
      email: 'test@test.com',
      password: hashedPassword,
      name: 'Test User',
    } as never);

    const result = await getAuthorize()({
      email: 'test@test.com',
      password: 'wrongPassword',
    });

    expect(result).toBeNull();
  });

  it('gibt Benutzer zurück bei korrekten Credentials', async () => {
    const hashedPassword = await bcrypt.hash('correctPassword', 10);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: '1',
      email: 'test@test.com',
      password: hashedPassword,
      name: 'Test User',
      image: null,
    } as never);

    const result = await getAuthorize()({
      email: 'test@test.com',
      password: 'correctPassword',
    });

    expect(result).not.toBeNull();
    expect(result?.email).toBe('test@test.com');
    expect(result?.name).toBe('Test User');
  });
});
