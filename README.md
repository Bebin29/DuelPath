# DuelPath

DuelPath ist eine Webanwendung für Yu-Gi-Oh!-Spieler, die Kombos visualisieren und ausführen sowie eigene Decks verwalten möchten.

## Features

- **Deck-Verwaltung**: Erstelle und verwalte deine Yu-Gi-Oh!-Decks mit über 11.000 Karten
- **Kombo-Editor**: Dokumentiere und visualisiere Kombos Schritt für Schritt
- **Duellmodus**: Teste deine Decks und Kombos in einer simulierten Duell-Umgebung
- **Zweisprachig**: Deutsch und Englisch

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Sprache**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI-Komponenten**: shadcn/ui (Radix UI)
- **Datenbank**: Prisma ORM mit SQLite (Development) / PostgreSQL (Production)
- **Authentifizierung**: NextAuth.js v5
- **Internationalisierung**: i18next / react-i18next
- **Testing**: Vitest + React Testing Library

## Voraussetzungen

- Node.js 20 oder höher
- npm oder ein anderer Package Manager

## Installation

1. Repository klonen:
```bash
git clone <repository-url>
cd DuelPath
```

2. Dependencies installieren:
```bash
npm install
```

3. Environment Variables einrichten:
```bash
cp .env.example .env
```

Bearbeite `.env` und setze die benötigten Werte:
- `DATABASE_URL`: SQLite-Datenbank-Pfad (Standard: `file:./prisma/dev.db`)
- `NEXTAUTH_SECRET`: Generiere einen Secret mit `openssl rand -base64 32`
- `NEXTAUTH_URL`: URL der Anwendung (Standard: `http://localhost:3000`)

4. Datenbank einrichten:
```bash
# Prisma Client generieren
npm run db:generate

# Migrationen ausführen
npm run db:migrate

# Test-User erstellen (optional)
npm run db:seed
```

5. Entwicklungsserver starten:
```bash
npm run dev
```

Die Anwendung ist nun unter [http://localhost:3000](http://localhost:3000) erreichbar.

## Verfügbare Scripts

### Entwicklung
- `npm run dev` - Startet den Entwicklungsserver
- `npm run build` - Erstellt einen Production-Build
- `npm run start` - Startet den Production-Server

### Datenbank
- `npm run db:generate` - Generiert den Prisma Client
- `npm run db:migrate` - Führt Migrationen aus
- `npm run db:push` - Pusht Schema-Änderungen zur Datenbank (ohne Migration)
- `npm run db:studio` - Öffnet Prisma Studio (Datenbank-GUI)
- `npm run db:seed` - Führt das Seed-Script aus (erstellt Test-User)

### Code Quality
- `npm run lint` - Führt ESLint aus
- `npm run format` - Formatiert Code mit Prettier
- `npm run format:check` - Prüft Code-Formatierung
- `npm run type-check` - Prüft TypeScript-Typen

### Testing
- `npm run test` - Führt Tests aus
- `npm run test:watch` - Führt Tests im Watch-Modus aus

## Test-User

Nach dem Ausführen von `npm run db:seed` ist ein Test-User verfügbar:

- **E-Mail**: `test@duelpath.local`
- **Passwort**: `Test1234!`

## Projektstruktur

```
DuelPath/
├── app/                    # Next.js App Router Seiten
│   ├── (auth)/            # Authentifizierungs-Routen
│   ├── (dashboard)/       # Geschützte Dashboard-Routen
│   └── api/               # API-Routen
├── src/
│   ├── components/        # React-Komponenten
│   │   ├── common/        # Gemeinsame Komponenten
│   │   └── components/ui/ # shadcn/ui Komponenten
│   ├── lib/               # Utilities und Konfigurationen
│   │   ├── auth/          # NextAuth Konfiguration
│   │   ├── i18n/          # i18n Konfiguration
│   │   └── prisma/        # Prisma Client
│   ├── server/            # Server-seitige Logik
│   │   └── actions/       # Server Actions
│   └── types/             # TypeScript Typen
├── prisma/                # Prisma Schema und Migrationen
├── messages/              # i18n Übersetzungen
├── tests/                 # Test-Dateien
└── public/                # Statische Assets
```

## Entwicklung

### Code-Style

Das Projekt verwendet:
- **ESLint** für Linting (Next.js Config)
- **Prettier** für Code-Formatierung
- **TypeScript** mit strict mode

### Commits

Verwende [Conventional Commits](https://www.conventionalcommits.org/) für Commit-Messages:

```
feat: neue Funktion hinzufügen
fix: Bug beheben
docs: Dokumentation aktualisieren
style: Code-Formatierung
refactor: Code umstrukturieren
test: Tests hinzufügen
chore: Build-Tasks, Dependencies
```

## Deployment

Das Projekt ist für Deployment auf Vercel optimiert:

1. Repository mit Vercel verbinden
2. Environment Variables in Vercel setzen
3. Automatisches Deployment bei Push auf `main` Branch

Für Production sollte PostgreSQL als Datenbank verwendet werden (nicht SQLite).

## Lizenz

[Lizenz hier einfügen]

## Weitere Informationen

Siehe [Projektplanung.md](Projektplanung.md) für detaillierte Informationen über das Projekt.
