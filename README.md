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

### Deck-Editor - Erweiterte Features

#### Interaktion & Navigation
- **Drag & Drop**: Karten per Drag & Drop zwischen Sektionen verschieben
- **Haptic Feedback**: Vibration bei Drag-Operationen auf mobilen Geräten
- **Keyboard-Shortcuts**:
  - `Ctrl+Z` / `Ctrl+Shift+Z`: Undo/Redo
  - `Delete` / `Backspace`: Ausgewählte Karte(n) entfernen
  - `Ctrl+D`: Karte duplizieren
  - `Ctrl+A`: Alle Karten auswählen
  - `Escape`: Auswahl aufheben
  - `+` / `-`: Anzahl erhöhen/verringern

#### Multi-Select & Bulk-Operationen
- **Multi-Select**: Mehrere Karten gleichzeitig auswählen
- **Bulk-Actions**: 
  - Mehrere Karten gleichzeitig entfernen
  - Mehrere Karten zwischen Sektionen verschieben
- **Checkbox-Integration**: Einfache Auswahl per Checkbox

#### Undo/Redo & History
- **Vollständige History**: Alle Änderungen werden gespeichert
- **History-Timeline**: Visuelle Darstellung der Änderungshistorie
- **Anpassbares Limit**: Konfigurierbare History-Größe (10-200 Einträge)
- **Jump-to-History**: Springe zu einem beliebigen Punkt in der History

#### YDK Import/Export
- **YDK-Export**: Decks als YDK-Datei exportieren
- **YDK-Import**: YDK-Dateien importieren (in Entwicklung)

#### Suche & Filter im Deck
- **Deck-interne Suche**: Suche nach Karten im aktuellen Deck
- **Sortierung**: Sortiere nach Name, Typ, Level, ATK, DEF
- **Sortierreihenfolge**: Aufsteigend/Absteigend

#### Performance-Optimierungen
- **Optimistic UI Updates**: Sofortiges Feedback bei Aktionen
- **Request-Deduplizierung**: Verhindert doppelte API-Aufrufe
- **Card-Cache**: Intelligentes Caching von Kartendaten
- **Prefetching**: Karten werden beim Hover vorab geladen
- **Virtualisierung**: Effiziente Darstellung großer Listen (ab 50+ Karten)
- **Bild-Optimierung**: Lazy Loading und responsive Images

#### Offline-Unterstützung
- **Service Worker**: Caching für Offline-Nutzung
- **LocalStorage**: Offline-Speicherung von Deck-Änderungen
- **Sync-Queue**: Automatische Synchronisation bei Wiederverbindung
- **Offline-Indikator**: Visuelles Feedback zum Online/Offline-Status

#### Error-Handling
- **Error Boundaries**: Granulare Fehlerbehandlung
  - Global Error Boundary
  - Deck-spezifische Error Boundary
  - CardSearch Error Boundary
- **Retry-Mechanismus**: Automatische Wiederholung bei Fehlern
- **Benutzerfreundliche Fehlermeldungen**: Klare, verständliche Fehlermeldungen

### Kombo-Editor
- **Kombo-Erstellung**: Erstelle Schritt-für-Schritt Kombos mit Kartenauswahl und Aktionstypen
- **Step-Management**: Füge, bearbeite und lösche Schritte mit Drag & Drop zum Neuanordnen
- **Aktionstypen**: Definiere Aktionen wie Beschwören, Aktivieren, Setzen, Angreifen, etc.
- **Deck-Zuordnung**: Ordne Kombos optional einem Deck zu für bessere Organisation
- **Play-Mode**: Spiele Kombos Schritt für Schritt ab mit visueller Navigation
- **Validierung**: Echtzeit-Validierung der Kombo-Schritte
- **Undo/Redo**: Vollständige History mit Undo/Redo-Funktionalität
- **Virtualisierung**: Effiziente Darstellung bei vielen Steps (ab 50 Steps)

### Duellmodus
- Teste deine Decks und Kombos in einer simulierten Duell-Umgebung (in Entwicklung)

## Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Sprache**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI-Komponenten**: shadcn/ui (Radix UI)
- **State Management**: React Hooks (useState, useReducer, useOptimistic)
- **Data Fetching**: SWR (stale-while-revalidate)
- **Drag & Drop**: @dnd-kit/core, @dnd-kit/sortable
- **Virtualisierung**: @tanstack/react-virtual
- **Internationalisierung**: i18next / react-i18next

### Backend
- **Datenbank**: Prisma ORM mit SQLite (Development) / PostgreSQL (Production)
- **Authentifizierung**: NextAuth.js v5
- **Server Actions**: Next.js Server Actions für Datenbank-Operationen
- **API Routes**: RESTful API für Karten-Suche

### Performance & Optimierung
- **Caching**: 
  - Client-seitig: SWR, Card-Cache
  - Server-seitig: In-Memory Cache für Autocomplete
  - Service Worker: Cache First / Network First Strategien
- **Bild-Optimierung**: Next.js Image Component mit Lazy Loading
- **Code-Splitting**: Automatisch durch Next.js App Router

### Testing & Quality
- **Testing**: Vitest + React Testing Library
- **Linting**: ESLint (Next.js Config)
- **Formatting**: Prettier
- **Type Safety**: TypeScript strict mode

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
├── app/                           # Next.js App Router Seiten
│   ├── (auth)/                   # Authentifizierungs-Routen
│   ├── (dashboard)/              # Geschützte Dashboard-Routen
│   │   ├── decks/                # Deck-Verwaltung
│   │   │   └── [id]/             # Deck-Editor
│   │   └── combos/               # Kombo-Verwaltung
│   │       └── [id]/             # Kombo-Editor
│   └── api/                      # API-Routen
│       ├── cards/                # Karten-API
│       └── combos/               # Kombos-API
├── src/
│   ├── components/               # React-Komponenten
│   │   ├── common/               # Gemeinsame Komponenten
│   │   │   ├── Navigation.tsx
│   │   │   ├── LanguageSwitcher.tsx
│   │   │   └── OptimizedImage.tsx
│   │   ├── components/ui/        # shadcn/ui Komponenten
│   │   ├── deck/                 # Deck-spezifische Komponenten
│   │   │   ├── DeckEditor.tsx
│   │   │   ├── CardSearch.tsx
│   │   │   ├── DeckListSection.tsx
│   │   │   ├── CardItem.tsx
│   │   │   ├── CardDetailDialog.tsx
│   │   │   └── HistoryTimeline.tsx
│   │   ├── combo/                # Combo-spezifische Komponenten
│   │   │   ├── ComboEditor.tsx
│   │   │   ├── ComboList.tsx
│   │   │   ├── ComboTimeline.tsx
│   │   │   ├── ComboStepItem.tsx
│   │   │   ├── ComboStepEditor.tsx
│   │   │   ├── ComboPlayMode.tsx
│   │   │   └── CreateComboDialog.tsx
│   │   ├── error/                # Error Boundaries
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── GlobalErrorBoundary.tsx
│   │   │   ├── DeckErrorBoundary.tsx
│   │   │   ├── CardSearchErrorBoundary.tsx
│   │   │   └── ComboErrorBoundary.tsx
│   │   └── providers/            # Context Providers
│   │       ├── SessionProvider.tsx
│   │       ├── SWRProvider.tsx
│   │       ├── OfflineProvider.tsx
│   │       └── PerformanceProvider.tsx
│   ├── lib/                      # Utilities und Konfigurationen
│   │   ├── auth/                 # NextAuth Konfiguration
│   │   ├── i18n/                 # i18n Konfiguration
│   │   ├── hooks/                # Custom React Hooks
│   │   │   ├── use-deck-operations.ts
│   │   │   ├── use-deck-history.ts
│   │   │   ├── use-deck-card-handlers.ts
│   │   │   ├── use-combo-operations.ts
│   │   │   ├── use-combo-history.ts
│   │   │   ├── use-combo-validation.ts
│   │   │   ├── use-card-cache.ts
│   │   │   ├── use-card-prefetch.ts
│   │   │   ├── use-keyboard-shortcuts.ts
│   │   │   ├── use-offline.ts
│   │   │   └── use-retry.ts
│   │   ├── utils/                # Utility-Funktionen
│   │   │   ├── deck.utils.ts
│   │   │   ├── combo.utils.ts
│   │   │   └── error-logger.ts
│   │   ├── storage/              # Storage-Utilities
│   │   │   └── offline-storage.ts
│   │   ├── validations/          # Validierungs-Schemas
│   │   │   ├── deck.schema.ts
│   │   │   └── combo.schema.ts
│   │   ├── constants/            # Konstanten
│   │   │   └── deck.constants.ts
│   │   └── prisma/               # Prisma Client
│   ├── server/                   # Server-seitige Logik
│   │   ├── actions/              # Server Actions
│   │   │   ├── deck.actions.ts
│   │   │   ├── combo.actions.ts
│   │   │   └── card.actions.ts
│   │   └── services/             # Business Logic
│   │       └── card-search.service.ts
│   └── types/                    # TypeScript Typen
├── prisma/                       # Prisma Schema und Migrationen
│   ├── schema.prisma
│   └── scripts/
│       └── import-cards.ts
├── messages/                     # i18n Übersetzungen
│   ├── de.json
│   └── en.json
├── tests/                        # Test-Dateien
│   ├── lib/
│   │   ├── hooks/
│   │   └── utils/
│   └── components/
│       └── error/
├── public/                       # Statische Assets
│   ├── sw.js                     # Service Worker
│   └── offline.html              # Offline-Fallback-Seite
└── .env.example                  # Environment-Variablen Template
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

### Combo-API

#### REST API Routes

- **GET `/api/combos`**: Holt alle Kombos des aktuellen Users
  - Query-Parameter: `deckId` (optional) - Filter nach Deck
- **POST `/api/combos`**: Erstellt eine neue Kombo
- **GET `/api/combos/[id]`**: Holt eine einzelne Kombo mit allen Steps
- **PATCH `/api/combos/[id]`**: Aktualisiert eine Kombo
- **DELETE `/api/combos/[id]`**: Löscht eine Kombo

#### Server Actions

- `createCombo(data)`: Erstellt eine neue Kombo
- `updateCombo(comboId, data)`: Aktualisiert eine Kombo
- `deleteCombo(comboId)`: Löscht eine Kombo
- `getCombo(comboId)`: Holt eine Kombo mit allen Steps
- `getCombosByUser(deckId?)`: Holt alle Kombos des Users (optional gefiltert nach Deck)
- `getCombosByDeck(deckId)`: Holt alle Kombos eines Decks
- `addComboStep(comboId, stepData)`: Fügt einen Step zu einer Kombo hinzu
- `updateComboStep(stepId, stepData)`: Aktualisiert einen Step
- `deleteComboStep(stepId)`: Löscht einen Step
- `reorderComboSteps(comboId, stepIds)`: Ordnet Steps neu an

## Deck-Editor Features

### Kartensuche
- **Textsuche**: Suche nach Kartennamen mit Autocomplete
- **Debounced Search**: Optimierte Suche mit Verzögerung
- **Filter**: 
  - Kartentyp (Normal Monster, Effect Monster, Spell, Trap, etc.)
  - Attribut (LIGHT, DARK, EARTH, WATER, FIRE, WIND, DIVINE)
  - Level (0-12)
  - Race/Kategorie (mit Autocomplete)
  - Archetype (mit Autocomplete)
  - ATK/DEF Range (in Entwicklung)
  - Regex-Support (in Entwicklung)
- **Pagination**: 20 Karten pro Seite
- **Backend-Caching**: Autocomplete-Ergebnisse werden gecacht
- **Virtualisierung**: Effiziente Darstellung bei vielen Ergebnissen

### Deck-Verwaltung
- **Main Deck**: 40-60 Karten
- **Extra Deck**: Max. 15 Karten (Fusion, Synchro, XYZ, Link Monster)
- **Side Deck**: Max. 15 Karten
- **Automatische Zuordnung**: Extra Deck Karten werden automatisch ins Extra Deck zugeordnet
- **Kartendetails**: Klick auf eine Karte öffnet einen Dialog mit vollständigen Details
- **Validierung**: 
  - Echtzeit-Feedback bei Regelverstößen
  - Visuelle Warnungen für ungültige Konfigurationen
  - Tooltips mit detaillierten Fehlermeldungen
  - Karten-spezifische Validierung (max. 3 Kopien, Banlist-Status)

### Performance-Features
- **Optimistic Updates**: Sofortiges UI-Feedback ohne Warten auf Server
- **Request-Deduplizierung**: Verhindert doppelte API-Aufrufe
- **Batch-Operationen**: Mehrere Operationen werden gebündelt
- **Card-Cache**: Intelligentes Caching mit TTL
- **Prefetching**: Karten werden beim Hover vorab geladen
- **Virtualisierung**: Nur sichtbare Elemente werden gerendert
- **Bild-Optimierung**: 
  - Lazy Loading für Bilder außerhalb des Viewports
  - Responsive Images mit srcset
  - AVIF/WebP Support (durch Next.js)

### Custom Hooks

Das Projekt verwendet mehrere wiederverwendbare Custom Hooks:

- **`useDeckOperations`**: Zentrale Deck-Operationen mit Request-Deduplizierung
- **`useDeckHistory`**: Undo/Redo-Funktionalität mit History-Timeline
- **`useDeckCardHandlers`**: Handler-Funktionen für Karten-Operationen
- **`useComboOperations`**: Zentrale Combo-Operationen mit Request-Deduplizierung
- **`useComboHistory`**: Undo/Redo-Funktionalität für Kombos
- **`useComboValidation`**: Echtzeit-Validierung von Combo-Schritten
- **`useCardCache`**: Client-seitiger Card-Cache mit Batch-Loading
- **`useCardPrefetch`**: Prefetching von Kartendaten
- **`useKeyboardShortcuts`**: Globale Keyboard-Shortcuts
- **`useOffline`**: Offline-Status und Synchronisation
- **`useRetry`**: Retry-Mechanismus mit exponential backoff
- **`useDebounce`**: Debouncing für Suchfelder
- **`useClickOutside`**: Click-Outside-Detection

### Error-Handling

- **Error Boundaries**: 
  - `GlobalErrorBoundary`: Fängt alle nicht abgefangenen Fehler
  - `DeckErrorBoundary`: Deck-spezifische Fehlerbehandlung
  - `CardSearchErrorBoundary`: Fehler in der Kartensuche
  - `ComboErrorBoundary`: Combo-spezifische Fehlerbehandlung
- **Retry-Mechanismus**: Automatische Wiederholung bei Netzwerkfehlern
- **Error-Logging**: Zentrale Fehlerprotokollierung mit Kontext
- **Benutzerfreundliche Meldungen**: Klare, verständliche Fehlermeldungen

### Offline-Unterstützung

- **Service Worker**: 
  - Cache First für statische Assets
  - Network First für API-Requests
  - Stale-While-Revalidate für Bilder
- **LocalStorage**: 
  - Offline-Speicherung von Deck-Änderungen
  - Sync-Queue für ausstehende Operationen
- **Automatische Synchronisation**: 
  - Bei Wiederverbindung
  - Regelmäßige Sync-Versuche
- **Offline-Indikator**: Visuelles Feedback zum Online/Offline-Status

## Performance-Metriken

Das Projekt ist auf Performance optimiert:

- **Lazy Loading**: Komponenten und Bilder werden bei Bedarf geladen
- **Code-Splitting**: Automatisch durch Next.js App Router
- **Virtualisierung**: Große Listen werden effizient gerendert
- **Caching-Strategien**: Mehrschichtiges Caching (Client, Server, Service Worker)
- **Optimistic Updates**: Sofortiges UI-Feedback
- **Request-Deduplizierung**: Verhindert unnötige API-Aufrufe
- **Batch-Operationen**: Mehrere Operationen werden gebündelt

## Browser-Unterstützung

- **Moderne Browser**: Chrome, Firefox, Safari, Edge (letzte 2 Versionen)
- **Mobile**: iOS Safari, Chrome Mobile
- **Service Worker**: Unterstützt in allen modernen Browsern
- **Offline-Modus**: Funktioniert in allen Browsern mit Service Worker Support

## Bekannte Einschränkungen

- **YDK-Import**: Vollständiger Import benötigt Card-Lookup nach Passcode (in Entwicklung)
- **ATK/DEF Range Filter**: Noch nicht implementiert
- **Regex-Suche**: Noch nicht implementiert
- **Background Sync**: Service Worker Background Sync benötigt Browser-Support

## Beitragen

Beiträge sind willkommen! Bitte beachte:

1. Verwende [Conventional Commits](https://www.conventionalcommits.org/) für Commit-Messages
2. Führe Tests aus: `npm run test`
3. Prüfe TypeScript-Typen: `npm run type-check`
4. Formatiere Code: `npm run format`
5. Erstelle einen Pull Request mit einer klaren Beschreibung

## Weitere Informationen

- [Projektplanung.md](Projektplanung.md) - Detaillierte Projektplanung
- [SETUP.md](SETUP.md) - Setup-Anleitungen (falls vorhanden)
