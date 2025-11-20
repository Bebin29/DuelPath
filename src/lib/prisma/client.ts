import { PrismaClient } from '@prisma/client';

/**
 * Prisma Client Singleton
 *
 * Verhindert die Erstellung mehrerer Prisma Client Instanzen in der Entwicklungsumgebung.
 * In Produktion wird eine neue Instanz pro Serverless Function erstellt.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
