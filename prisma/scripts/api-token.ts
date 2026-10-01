import { prisma } from '@/lib/prisma/client';
import { issueToken } from '@/server/api/tokens';

/**
 * Legt ein API-Token für einen Nutzer an und gibt es einmal aus, etwa für lokale Agenten.
 *
 * Usage: npm run api:token -- [email] [name]   (Standard: Test-Nutzer)
 */
const email = process.argv[2] ?? 'test@duelpath.local';
const name = process.argv[3] ?? 'CLI';

async function main() {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) {
    console.error(`Kein Nutzer mit ${email}`);
    process.exit(1);
  }
  const { token } = await issueToken(user.id, name);
  console.log(token);
  await prisma.$disconnect();
}

main();
