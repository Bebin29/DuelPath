import { defineConfig, env } from 'prisma/config';

// Prisma 7 lädt .env nicht mehr selbst; in der CI kommen die Variablen aus der Umgebung
try {
  process.loadEnvFile();
} catch {}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
