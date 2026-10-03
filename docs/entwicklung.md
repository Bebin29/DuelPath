# Entwicklung

Das Einrichten steht in [SETUP.md](../SETUP.md). Hier geht es um die tägliche Arbeit.

## Befehle

### Anwendung

| Befehl          | Wirkung                          |
| --------------- | -------------------------------- |
| `npm run dev`   | Entwicklungsserver auf Port 3000 |
| `npm run build` | Produktions-Build                |
| `npm start`     | Produktions-Server               |

### Datenbank

| Befehl                | Wirkung                                              |
| --------------------- | ---------------------------------------------------- |
| `npm run db:up`       | Postgres per Docker starten, Port 5433               |
| `npm run db:migrate`  | Migration erzeugen und anwenden                      |
| `npm run db:push`     | Schema ohne Migration anwenden, nur zum Ausprobieren |
| `npm run db:generate` | Prisma Client neu erzeugen                           |
| `npm run db:studio`   | Prisma Studio zum Ansehen der Daten                  |
| `npm run db:seed`     | Test-Nutzer anlegen                                  |
| `npm run db:sample`   | Beispiel-Combo anlegen                               |

### Karten

| Befehl                                 | Wirkung                                                        |
| -------------------------------------- | -------------------------------------------------------------- |
| `npm run cards:import`                 | Alle TCG-Karten von YGOPRODeck holen, dauert etwa zwei Minuten |
| `npm run cards:check-effects`          | Jev bewertet die Effektzerlegung der noch offenen Karten       |
| `npm run cards:check-effects -- --all` | Alle Karten neu bewerten, nach einer Parser-Änderung           |
| `npm run jev:eval`                     | Die Effektvorschläge gegen bekannte Fälle prüfen               |

`cards:check-effects` braucht `OPENROUTER_API_KEY` und kostet für alle Karten etwa 0,40 US-Dollar.

### Prüfen

| Befehl                 | Wirkung                                               |
| ---------------------- | ----------------------------------------------------- |
| `npm run test`         | Alle Tests einmal                                     |
| `npm run test:watch`   | Tests im Beobachtungsmodus                            |
| `npm run type-check`   | TypeScript ohne Ausgabe                               |
| `npm run lint`         | ESLint                                                |
| `npm run lint:fix`     | ESLint mit Korrektur                                  |
| `npm run format`       | Prettier schreibt                                     |
| `npm run format:check` | Prettier prüft nur                                    |
| `npm run ui:sweep`     | Durchgang über die Oberfläche nach `UI-Sweep-Plan.md` |

### Sonstiges

| Befehl              | Wirkung                               |
| ------------------- | ------------------------------------- |
| `npm run api:token` | Ein API-Token auf der Konsole anlegen |

## Tests

Vitest und React Testing Library. Die Tests liegen in `tests/` und spiegeln den Aufbau von `src/`.

Der Schwerpunkt liegt auf `src/lib/`. Dort steht die Fachlogik als reine Funktionen ohne Datenbank, und genau dort entstehen die Fehler, die weh tun: Regeln, Zustand, Quoten, Zerlegung von Kartentexten.

Faustregel:

- Eine neue oder geänderte Funktion in `src/lib/` bekommt einen Test.
- Services in `src/server/` bekommen einen Test, wenn sie Logik enthalten und nicht nur Prisma durchreichen.
- Komponenten bekommen nur dann einen Test, wenn sie eigenes Verhalten haben. Reine Darstellung wird nicht getestet.

Einzelne Datei:

```bash
npx vitest run tests/lib/combo/state.test.ts
```

## Code-Stil

- TypeScript im strict mode. Kein `any` ohne Grund.
- Prettier bestimmt die Formatierung. Nicht von Hand formatieren.
- Importe über `@/` statt über relative Pfade mit `..`.
- Kommentare auf Deutsch, Kartennamen und Fachbegriffe auf Englisch.
- Ein Kommentar sagt **warum**, nicht was. Was der Code tut, steht im Code.
- Viele Dateien beginnen mit einem Kommentar, der auf einen Planabschnitt verweist, zum Beispiel „UX-Plan 6.8“. Halte das bei, wenn du eine Datei nach einem Plan baust.

### Wohin gehört neuer Code

| Art                                      | Ort                                  |
| ---------------------------------------- | ------------------------------------ |
| Reine Logik, kein React, keine Datenbank | `src/lib/`                           |
| Datenbankzugriff, externe Dienste        | `src/server/services/`               |
| Aufruf aus der Oberfläche                | `src/server/actions/`                |
| Endpunkt der REST-API                    | `app/api/v1/` plus `src/server/api/` |
| Komponente                               | `src/components/<bereich>/`          |
| Basis-Komponente von shadcn/ui           | `src/components/ui/`                 |

Wenn du einen API-Endpunkt änderst, ändere `src/server/api/openapi.ts` mit. Die OpenAPI-Datei ist das, womit Agenten arbeiten.

## Commits und Branches

[Conventional Commits](https://www.conventionalcommits.org/) auf Deutsch:

```
feat(deck): Side-Pläne je Matchup speichern
fix(combo): Ziel nach Ortswechsel als ungültig erkennen
docs(api): Ablauf für Agenten beschreiben
test(lib): Quoten für kleine Decks abdecken
refactor(workbench): Schrittleiste aufteilen
chore: Abhängigkeiten aktualisieren
```

Gearbeitet wird in Branches, nicht direkt auf `main`. Eine Änderung geht als Pull Request ein und wird nach der Prüfung zusammengeführt.

Vor dem Pull Request lokal prüfen:

```bash
npm run type-check && npm run lint && npm run format:check && npm run test
```

## CI

`.github/workflows/ci.yml` läuft bei jedem Push auf `main` und bei jedem Pull Request. Fünf Jobs laufen parallel: Lint, Format Check, Type Check, Test, Build. Alle fünf müssen grün sein.

Der Build braucht `DATABASE_URL`, baut aber keine Verbindung auf. Die Variable wird nur von `prisma generate` im postinstall gebraucht.

## Migrationen

Schema ändern, dann:

```bash
npm run db:migrate
```

Prisma fragt nach einem Namen und legt die Migration unter `prisma/migrations/` ab. Die Migration gehört mit in denselben Commit wie die Schema-Änderung. Die Datenbank wird nie von Hand geändert.

## Nützlich beim Arbeiten

- `/dev/ui` zeigt alle Komponenten an einer Stelle. Gut, um eine neue Komponente einzupassen.
- `npm run db:studio` zeigt die Daten direkt.
- `npm run db:sample` legt eine Beispiel-Combo an, damit die Werkbank nicht leer ist.
- Ohne `OPENROUTER_API_KEY` läuft alles ausser den Jev-Funktionen.
- Kartenbilder liegen in `~/.duelpath/card-images`, bewusst ausserhalb des Repositorys.
