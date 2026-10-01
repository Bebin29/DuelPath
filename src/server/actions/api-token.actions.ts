'use server';

import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma/client';
import { issueToken } from '@/server/api/tokens';

type Result<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

export interface ApiTokenInfo {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

async function userId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function listApiTokens(): Promise<Result<ApiTokenInfo[]>> {
  const uid = await userId();
  if (!uid) return { error: 'Unauthorized' };
  const tokens = await prisma.apiToken.findMany({
    where: { userId: uid, revokedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  return {
    data: tokens.map((t) => ({
      id: t.id,
      name: t.name,
      prefix: t.prefix,
      createdAt: t.createdAt.toISOString(),
      lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
    })),
  };
}

/** Neues Token; der Klartext kommt nur hier einmal zurück */
export async function createApiToken(name: string): Promise<Result<{ token: string }>> {
  const uid = await userId();
  if (!uid) return { error: 'Unauthorized' };
  const { token } = await issueToken(uid, name);
  return { data: { token } };
}

export async function revokeApiToken(id: string): Promise<Result<true>> {
  const uid = await userId();
  if (!uid) return { error: 'Unauthorized' };
  await prisma.apiToken.updateMany({
    where: { id, userId: uid, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return { data: true };
}
