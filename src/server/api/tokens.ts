import { createHash, randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma/client';

/**
 * Persönliche API-Tokens: „dp_“ plus 32 zufällige Bytes. Gespeichert wird nur der SHA-256-Hash,
 * das Token selbst sieht der Nutzer genau einmal beim Anlegen.
 */
export const TOKEN_PREFIX = 'dp_';

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function issueToken(userId: string, name: string) {
  const token = TOKEN_PREFIX + randomBytes(32).toString('base64url');
  const record = await prisma.apiToken.create({
    data: {
      userId,
      name: name.trim().slice(0, 60) || 'API',
      tokenHash: hashToken(token),
      prefix: token.slice(0, 8),
    },
    select: { id: true, name: true, prefix: true, createdAt: true },
  });
  return { token, record };
}

/** Nutzer zum Token, oder null für unbekannte und widerrufene Tokens */
export async function userForToken(token: string): Promise<string | null> {
  if (!token.startsWith(TOKEN_PREFIX)) return null;
  const record = await prisma.apiToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, userId: true, revokedAt: true, lastUsedAt: true },
  });
  if (!record || record.revokedAt) return null;
  // Höchstens einmal pro Minute schreiben, damit Lesezugriffe die Datenbank nicht belasten
  if (!record.lastUsedAt || Date.now() - record.lastUsedAt.getTime() > 60_000) {
    await prisma.apiToken.update({ where: { id: record.id }, data: { lastUsedAt: new Date() } });
  }
  return record.userId;
}
