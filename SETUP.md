# DuelPath Setup Anleitung

Voraussetzungen: Node 24 und Docker Desktop.

## Environment Variables

Kopiere `.env.example` nach `.env` und trage ein `AUTH_SECRET` ein:

```env
# Lokale Postgres-Instanz aus docker-compose.yml
DATABASE_URL="postgresql://duelpath:duelpath@localhost:5433/duelpath"
# Erzeugen mit: npx auth secret
AUTH_SECRET=""
# Für Jev (OpenRouter), optional: https://openrouter.ai/keys
OPENROUTER_API_KEY=""
# Leer = typesafe/jev-1.13-20260917 (fest gepinnt)
JEV_MODEL=""
# Leer = ~/.duelpath/card-images (bewusst außerhalb des Repos)
CARD_IMAGE_DIR=""
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

Nach dem ersten Setup die TCG-Karten von YGOPRODeck importieren (englische und deutsche Texte, OCG-only-Karten werden übersprungen):

```bash
npm run cards:import
```

Der Import dauert etwa zwei Minuten. Dabei wird jeder Kartentext in einzelne Effekte zerlegt und OPT-Klauseln zugeordnet. Unsichere Zerlegungen werden mit `effectsReview` markiert.

Optional prüft Jev die Zerlegung (braucht `OPENROUTER_API_KEY`, kostet für alle Karten etwa 0,40 US-Dollar):

```bash
npm run cards:check-effects          # nur noch nicht bewertete Karten
npm run cards:check-effects -- --all # alle Karten neu, z. B. nach Parser-Änderungen
```

Kartenbilder werden beim ersten Abruf von YGOPRODeck geladen und in `CARD_IMAGE_DIR` (Standard: `~/.duelpath/card-images`) zwischengespeichert. YGOPRODeck erlaubt kein Hotlinking.

## Nützliche Befehle

- `npm run db:up`: Startet Postgres per Docker
- `npm run db:studio`: Öffnet Prisma Studio zur Datenbank-Inspektion
- `npm run db:migrate`: Erstellt und führt Migrationen aus
- `npm run db:seed`: Legt den Test-User an
- `npm run db:generate`: Erzeugt den Prisma Client neu
- `npm run cards:import`: Importiert bzw. aktualisiert alle TCG-Karten
- `npm run cards:check-effects`: Lässt Jev die Effektzerlegung bewerten
