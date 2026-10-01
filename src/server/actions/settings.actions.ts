'use server';

import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma/client';
import type { Prisma } from '@/generated/prisma/client';
import {
  DEFAULT_SETTINGS,
  parseSettings,
  settingsPatchSchema,
  type SettingsPatch,
  type UserSettings,
} from '@/lib/settings';

type Result<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

/** Einstellungen des angemeldeten Nutzers, ohne Anmeldung die Standardwerte */
export async function getSettings(): Promise<UserSettings> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return DEFAULT_SETTINGS;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { settings: true } });
  return parseSettings(user?.settings);
}

export async function updateSettings(patch: SettingsPatch): Promise<Result<UserSettings>> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Unauthorized' };
  const parsed = settingsPatchSchema.safeParse(patch);
  if (!parsed.success) return { error: 'Ungültige Einstellung' };

  const current = await getSettings();
  const next = { ...current, ...parsed.data };
  await prisma.user.update({
    where: { id: userId },
    data: { settings: next as unknown as Prisma.InputJsonValue },
  });
  return { data: next };
}
