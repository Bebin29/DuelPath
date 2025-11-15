# DuelPath Setup Anleitung

## Environment Variables

Erstelle eine `.env` Datei im Root-Verzeichnis mit folgenden Variablen:

```env
# Database
# SQLite für lokale Entwicklung
DATABASE_URL="file:./dev.db"

# PostgreSQL für Produktion (Beispiel)
# DATABASE_URL="postgresql://user:password@localhost:5432/duelpath?schema=public"

# NextAuth v5
# WICHTIG: In NextAuth v5 wird AUTH_SECRET statt NEXTAUTH_SECRET verwendet
AUTH_SECRET="your-secret-key-here-generate-with-openssl-rand-base64-32"
AUTH_URL="http://localhost:3000"

# Optional: YGOPRODeck API (für später)
# YGOPRODECK_API_URL="https://db.ygoprodeck.com/api/v7"

# Node Environment
NODE_ENV="development"
```

### AUTH_SECRET generieren

Um einen sicheren Secret zu generieren, führe folgenden Befehl aus:

```bash
openssl rand -base64 32
```

Oder verwende einen Online-Generator für Base64-Strings.

## Installation

1. Dependencies installieren:
```bash
npm install
```

2. Prisma Client generieren:
```bash
npm run db:generate
```

3. Datenbank-Migration ausführen:
```bash
npm run db:migrate
```

4. Development Server starten:
```bash
npm run dev
```

## Datenbank

Die Anwendung nutzt SQLite für die lokale Entwicklung. Die Datenbank-Datei `dev.db` wird automatisch erstellt.

Für Produktion sollte PostgreSQL verwendet werden. Ändere dazu die `DATABASE_URL` in der `.env` Datei und passe das `provider` in `prisma/schema.prisma` von `sqlite` auf `postgresql` an.

## Kartenimport

Nach dem ersten Setup müssen die Yu-Gi-Oh! Karten von der YGOPRODeck API importiert werden:

```bash
npx tsx prisma/scripts/import-cards.ts
```

Dieser Befehl importiert alle verfügbaren Karten (ca. 13.992 Karten) in die lokale Datenbank. Der Import kann einige Minuten dauern, da die API Rate-Limiting hat (20 Requests/Sekunde).

**Hinweis:** Der Import kann auch über die API-Route `/api/cards/import` (POST) ausgeführt werden, erfordert jedoch eine authentifizierte Session.

## Nützliche Befehle

- `npm run db:studio` - Öffnet Prisma Studio zur Datenbank-Inspektion
- `npm run db:push` - Synchronisiert Schema ohne Migration (nur für Development)
- `npm run db:migrate` - Erstellt und führt Migrationen aus
- `npx tsx prisma/scripts/import-cards.ts` - Importiert alle Karten von YGOPRODeck API


