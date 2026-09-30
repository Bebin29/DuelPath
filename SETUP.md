# DuelPath Setup Anleitung

Voraussetzungen: Node 24 und Docker Desktop.

## Environment Variables

Kopiere `.env.example` nach `.env` und trage ein `AUTH_SECRET` ein:

```env
# Lokale Postgres-Instanz aus docker-compose.yml
DATABASE_URL="postgresql://duelpath:duelpath@localhost:5433/duelpath"
# Erzeugen mit: npx auth secret
AUTH_SECRET=""
# Für Jev-Vorschläge (OpenRouter), optional
OPENROUTER_API_KEY=""
```

Postgres läuft auf Port **5433**, damit es nicht mit anderen lokalen Postgres-Instanzen auf 5432 kollidiert.

## Installation

1. Dependencies installieren (erzeugt auch den Prisma Client nach `src/generated/prisma`):

```bash
npm install
```

2. Datenbank starten:

```bash
npm run db:up
```

3. Migrationen ausführen und Test-User anlegen:

```bash
npm run db:migrate
npm run db:seed
```

Test-User: `test@duelpath.local` / `Test1234!`

4. Development Server starten:

```bash
npm run dev
```

## Kartenimport

Nach dem ersten Setup müssen die Yu-Gi-Oh! Karten von der YGOPRODeck API importiert werden:

```bash
npx tsx --env-file=.env prisma/scripts/import-cards.ts
```

Der Import kann einige Minuten dauern, da die API Rate-Limiting hat (20 Requests/Sekunde).

**Hinweis:** Der Import kann auch über die API-Route `/api/cards/import` (POST) ausgeführt werden, erfordert jedoch eine authentifizierte Session.

## Nützliche Befehle

- `npm run db:up`: Startet Postgres per Docker
- `npm run db:studio`: Öffnet Prisma Studio zur Datenbank-Inspektion
- `npm run db:migrate`: Erstellt und führt Migrationen aus
- `npm run db:seed`: Legt den Test-User an
- `npm run db:generate`: Erzeugt den Prisma Client neu
