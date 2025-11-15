# DuelPath

DuelPath ist eine Webanwendung für Yu-Gi-Oh!-Spieler, die Kombos visualisieren und ausführen sowie eigene Decks verwalten möchten.

## Features

### Deck-Verwaltung
- **Deck-Erstellung**: Erstelle und verwalte beliebig viele Decks
- **Kartendatenbank**: Über 13.000 Yu-Gi-Oh! Karten verfügbar
- **Intelligente Suche**: Suche nach Name, Typ, Attribut, Level, Archetype und mehr
- **Automatische Zuordnung**: Extra Deck Karten (Fusion, Synchro, XYZ, Link) werden automatisch korrekt zugeordnet
- **Deck-Validierung**: Echtzeit-Validierung nach Yu-Gi-Oh! Regeln (40-60 Main Deck, max. 15 Extra/Side Deck)
- **Kartendetails**: Detaillierte Kartenansicht mit Bildern und vollständigen Informationen
- **Zweisprachig**: Deutsch und Englisch

### Kombo-Editor
- Dokumentiere und visualisiere Kombos Schritt für Schritt (in Entwicklung)

### Duellmodus
- Teste deine Decks und Kombos in einer simulierten Duell-Umgebung (in Entwicklung)

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
- `AUTH_SECRET`: Generiere einen Secret mit `openssl rand -base64 32` (NextAuth v5 verwendet AUTH_SECRET statt NEXTAUTH_SECRET)
- `AUTH_URL`: URL der Anwendung (Standard: `http://localhost:3000`)

4. Datenbank einrichten:
```bash
# Prisma Client generieren
npm run db:generate

# Migrationen ausführen
npm run db:migrate

# Karten importieren (wichtig!)
npx tsx prisma/scripts/import-cards.ts

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

## API-Dokumentation

### Karten-API

#### GET `/api/cards`
Sucht Karten mit Filtern, Pagination und Sortierung.

**Query-Parameter:**
- `name` (string): Kartennamen-Suche (teilweise Übereinstimmung)
- `type` (string): Kartentyp-Filter
- `race` (string): Monster-Typ oder Spell/Trap-Kategorie
- `attribute` (string): Attribut (LIGHT, DARK, etc.)
- `level` (number): Level/Rang/Linkzahl
- `atk` (number): Angriffspunkte
- `def` (number): Verteidigungspunkte
- `archetype` (string): Archetype-Name
- `banlistInfo` (string): Banlist-Status
- `page` (number): Seitennummer (default: 1)
- `limit` (number): Anzahl pro Seite (default: 50, max: 100)
- `sortBy` (string): Sortierfeld (name, type, level, atk, def, archetype)
- `order` (string): Sortierreihenfolge (asc, desc)
- `autocomplete` (boolean): Wenn "true", gibt nur Kartennamen zurück
- `query` (string): Suchbegriff für Autocomplete

**Beispiel:**
```bash
GET /api/cards?name=Blue-Eyes&type=Normal Monster&page=1&limit=20
```

**Response:**
```json
{
  "cards": [...],
  "total": 100,
  "page": 1,
  "pageSize": 20,
  "totalPages": 5
}
```

#### POST `/api/cards/import`
Importiert alle Karten von der YGOPRODeck API.

**Erfordert:** Authentifizierung

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 13992,
    "created": 13691,
    "updated": 301,
    "errors": 0,
    "skipped": 0
  },
  "message": "Import abgeschlossen: ..."
}
```

### Deck-API (Server Actions)

Alle Deck-Operationen werden über Server Actions ausgeführt:

- `createDeck(data)`: Erstellt ein neues Deck
- `updateDeck(deckId, data)`: Aktualisiert ein Deck
- `deleteDeck(deckId)`: Löscht ein Deck
- `getUserDecks()`: Holt alle Decks des aktuellen Users
- `getDeckById(deckId)`: Holt ein Deck mit allen Karten
- `addCardToDeck(deckId, data)`: Fügt eine Karte zu einem Deck hinzu
- `updateCardQuantity(deckId, data)`: Aktualisiert die Anzahl einer Karte
- `removeCardFromDeck(deckId, data)`: Entfernt eine Karte aus einem Deck

## Deck-Editor Features

### Kartensuche
- **Textsuche**: Suche nach Kartennamen mit Autocomplete
- **Filter**: 
  - Kartentyp (Normal Monster, Effect Monster, Spell, Trap, etc.)
  - Attribut (LIGHT, DARK, EARTH, WATER, FIRE, WIND, DIVINE)
  - Level (0-12)
  - Race/Kategorie (mit Autocomplete)
  - Archetype (mit Autocomplete)
- **Pagination**: 20 Karten pro Seite

### Deck-Verwaltung
- **Main Deck**: 40-60 Karten
- **Extra Deck**: Max. 15 Karten (Fusion, Synchro, XYZ, Link Monster)
- **Side Deck**: Max. 15 Karten
- **Automatische Zuordnung**: Extra Deck Karten werden automatisch ins Extra Deck zugeordnet
- **Kartendetails**: Klick auf eine Karte öffnet einen Dialog mit vollständigen Details
- **Validierung**: Echtzeit-Feedback bei Regelverstößen

## Weitere Informationen

Siehe [Projektplanung.md](Projektplanung.md) für detaillierte Informationen über das Projekt.
Siehe [SETUP.md](SETUP.md) für Setup-Anleitungen.
