import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authConfig } from '@/src/lib/auth/config';
import { prisma } from '@/src/lib/prisma/client';
import bcrypt from 'bcryptjs';

/**
 * Mock Prisma Client
 */
vi.mock('@/src/lib/prisma/client', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

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
    const credentialsProvider = authConfig.providers[0];
    if (credentialsProvider && 'authorize' in credentialsProvider) {
      const result = await (credentialsProvider as any).authorize({
        email: undefined,
        password: undefined,
      });

      expect(result).toBeNull();
    }
  });

  it('validiert nicht existierenden Benutzer', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    const credentialsProvider = authConfig.providers[0];
    if (credentialsProvider && 'authorize' in credentialsProvider) {
      const result = await (credentialsProvider as any).authorize({
        email: 'nonexistent@test.com',
        password: 'password123',
      });

      expect(result).toBeNull();
    }
  });

  it('validiert falsches Passwort', async () => {
    const hashedPassword = await bcrypt.hash('correctPassword', 10);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: '1',
      email: 'test@test.com',
      password: hashedPassword,
      name: 'Test User',
    } as any);

    const credentialsProvider = authConfig.providers[0];
    if (credentialsProvider && 'authorize' in credentialsProvider) {
      const result = await (credentialsProvider as any).authorize({
        email: 'test@test.com',
        password: 'wrongPassword',
      });

      expect(result).toBeNull();
    }
  });

  it('gibt Benutzer zurück bei korrekten Credentials', async () => {
    const hashedPassword = await bcrypt.hash('correctPassword', 10);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: '1',
      email: 'test@test.com',
      password: hashedPassword,
      name: 'Test User',
      image: null,
    } as any);

    const credentialsProvider = authConfig.providers[0];
    if (credentialsProvider && 'authorize' in credentialsProvider) {
      const result = await (credentialsProvider as any).authorize({
        email: 'test@test.com',
        password: 'correctPassword',
      });

      expect(result).not.toBeNull();
      expect(result?.email).toBe('test@test.com');
      expect(result?.name).toBe('Test User');
    }
  });
});

