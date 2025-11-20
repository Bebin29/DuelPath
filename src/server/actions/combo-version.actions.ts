'use server';

import { auth } from '@/lib/auth/auth';
import { prisma } from '@/lib/prisma/client';
import type { ComboWithSteps } from '@/types/combo.types';
import type { Prisma } from '@prisma/client';

/**
 * Erstellt eine neue Version einer Combo
 */
export async function createComboVersion(
  comboId: string,
  note?: string
): Promise<{ success: boolean; version?: Prisma.ComboVersionGetPayload<{ select: { id: true; title: true; description: true; createdAt: true; updatedAt: true; steps: true } }>; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    // Lade aktuelle Combo
    const combo = await prisma.combo.findUnique({
      where: { id: comboId },
      include: {
        steps: {
          include: {
            card: {
              select: {
                id: true,
                name: true,
                type: true,
                race: true,
                attribute: true,
                level: true,
                atk: true,
                def: true,
                archetype: true,
                imageSmall: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!combo) {
      return { error: 'Combo not found' };
    }

    if (combo.userId !== session.user.id) {
      return { error: 'Forbidden' };
    }

    // Finde höchste Versionsnummer
    const latestVersion = await prisma.comboVersion.findFirst({
      where: { comboId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    const nextVersion = (latestVersion?.version || 0) + 1;

    // Erstelle Snapshot
    const snapshot: ComboWithSteps = {
      id: combo.id,
      title: combo.title,
      description: combo.description,
      userId: combo.userId,
      deckId: combo.deckId,
      createdAt: combo.createdAt,
      updatedAt: combo.updatedAt,
      steps: combo.steps.map((step) => ({
        id: step.id,
        comboId: step.comboId,
        order: step.order,
        cardId: step.cardId,
        actionType: step.actionType,
        description: step.description,
        targetCardId: step.targetCardId,
        card: step.card,
      })),
    };

    // Speichere Version
    const version = await prisma.comboVersion.create({
      data: {
        comboId,
        title: combo.title,
        description: combo.description,
        deckId: combo.deckId,
        snapshot: JSON.stringify(snapshot),
        version: nextVersion,
        createdBy: session.user.id,
        note: note || null,
      },
    });

    return { success: true, version };
  } catch (error) {
    console.error('Failed to create combo version:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to create version',
    };
  }
}

/**
 * Lädt alle Versionen einer Combo
 */
export async function getComboVersions(comboId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    // Prüfe ob Combo existiert und User berechtigt ist
    const combo = await prisma.combo.findUnique({
      where: { id: comboId },
      select: { userId: true },
    });

    if (!combo) {
      return { error: 'Combo not found' };
    }

    if (combo.userId !== session.user.id) {
      return { error: 'Forbidden' };
    }

    const versions = await prisma.comboVersion.findMany({
      where: { comboId },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        title: true,
        description: true,
        createdAt: true,
        note: true,
        createdBy: true,
      },
    });

    return { success: true, versions };
  } catch (error) {
    console.error('Failed to get combo versions:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to get versions',
    };
  }
}

/**
 * Lädt eine spezifische Version einer Combo
 */
export async function getComboVersion(comboId: string, version: number) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    // Prüfe ob Combo existiert und User berechtigt ist
    const combo = await prisma.combo.findUnique({
      where: { id: comboId },
      select: { userId: true },
    });

    if (!combo) {
      return { error: 'Combo not found' };
    }

    if (combo.userId !== session.user.id) {
      return { error: 'Forbidden' };
    }

    const versionData = await prisma.comboVersion.findUnique({
      where: {
        comboId_version: {
          comboId,
          version,
        },
      },
    });

    if (!versionData) {
      return { error: 'Version not found' };
    }

    const snapshot = JSON.parse(versionData.snapshot) as ComboWithSteps;

    return { success: true, version: versionData, snapshot };
  } catch (error) {
    console.error('Failed to get combo version:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to get version',
    };
  }
}

/**
 * Stellt eine Version wieder her (erstellt neue Version mit den Daten der alten Version)
 */
export async function restoreComboVersion(
  comboId: string,
  version: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    // Prüfe ob Combo existiert und User berechtigt ist
    const combo = await prisma.combo.findUnique({
      where: { id: comboId },
      select: { userId: true },
    });

    if (!combo) {
      return { error: 'Combo not found' };
    }

    if (combo.userId !== session.user.id) {
      return { error: 'Forbidden' };
    }

    // Lade Version
    const versionData = await prisma.comboVersion.findUnique({
      where: {
        comboId_version: {
          comboId,
          version,
        },
      },
    });

    if (!versionData) {
      return { error: 'Version not found' };
    }

    const snapshot = JSON.parse(versionData.snapshot) as ComboWithSteps;

    // Erstelle Backup der aktuellen Version
    await createComboVersion(comboId, 'Backup vor Wiederherstellung');

    // Stelle Combo wieder her
    await prisma.$transaction(async (tx) => {
      // Aktualisiere Combo
      await tx.combo.update({
        where: { id: comboId },
        data: {
          title: snapshot.title,
          description: snapshot.description,
          deckId: snapshot.deckId,
        },
      });

      // Lösche alle aktuellen Steps
      await tx.comboStep.deleteMany({
        where: { comboId },
      });

      // Erstelle Steps neu
      for (const step of snapshot.steps) {
        await tx.comboStep.create({
          data: {
            comboId,
            cardId: step.cardId,
            actionType: step.actionType,
            description: step.description,
            targetCardId: step.targetCardId,
            order: step.order,
          },
        });
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to restore combo version:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to restore version',
    };
  }
}

/**
 * Löscht eine Version
 */
export async function deleteComboVersion(
  comboId: string,
  version: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: 'Unauthorized' };
    }

    // Prüfe ob Combo existiert und User berechtigt ist
    const combo = await prisma.combo.findUnique({
      where: { id: comboId },
      select: { userId: true },
    });

    if (!combo) {
      return { error: 'Unauthorized' };
    }

    if (combo.userId !== session.user.id) {
      return { error: 'Forbidden' };
    }

    await prisma.comboVersion.delete({
      where: {
        comboId_version: {
          comboId,
          version,
        },
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to delete combo version:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to delete version',
    };
  }
}
